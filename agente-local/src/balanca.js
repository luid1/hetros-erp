// Ponte da balança PRIX TI200 → WebSocket. Porta fiel do balanca_ws.py.
// Publica "peso,estavel" (ex.: "48.750,1") em ws://<host>:<wsPort> — igual ao bridge Python,
// então o hook useBalanca.ts do ERP funciona sem mudar nada.
const { WebSocketServer } = require('ws');

const ENQ = Buffer.from([0x05]);

function iniciarBalanca(cfg, log) {
  const bcfg = cfg.balanca || {};
  const wsPort = bcfg.wsPort || 8765;
  const clients = new Set();
  const wss = new WebSocketServer({ host: '0.0.0.0', port: wsPort });

  const estado = { val: 0, stable: false, ts: 0 };
  let lastTens = 0;

  wss.on('connection', (ws) => {
    clients.add(ws);
    log(`ERP conectado à balança (${clients.size} cliente(s))`);
    if (estado.ts > 0) { try { ws.send(msg(estado.val, estado.stable)); } catch {} }
    ws.on('close', () => { clients.delete(ws); log(`ERP desconectou (${clients.size} restantes)`); });
    ws.on('error', () => {});
  });
  wss.on('listening', () => log(`WebSocket da balança ativo em ws://localhost:${wsPort}`));
  wss.on('error', (e) => log(`ERRO no WebSocket da balança: ${e.message}`));

  const msg = (peso, stable) => `${peso.toFixed(3)},${stable ? 1 : 0}`;
  const broadcast = (peso, stable) => {
    const m = msg(peso, stable);
    for (const c of clients) { try { c.send(m); } catch { clients.delete(c); } }
  };

  // Decodifica peso da PRIX TI200 (mesma lógica do parse_frame do Python)
  function parseFrame(frame) {
    if (frame.length < 6) return null;
    const b2 = frame[2];
    if (b2 >= 0x30 && b2 <= 0x39) { lastTens = b2 - 0x30; return null; } // dezena (ASCII)
    const b3 = frame[3], b4 = frame[4], b5 = frame[5];
    const d = (b3 & 0xfe) - 0x82;
    if (d < 0 || d % 8 !== 0) return null;
    const unidade = d / 8;
    const dec1 = b4 >> 4, dec2 = b5 >> 4;
    if (unidade > 9 || dec1 > 9 || dec2 > 9) return null;
    return lastTens * 10 + unidade + dec1 / 10 + dec2 / 100;
  }

  let SerialPort;
  try { ({ SerialPort } = require('serialport')); }
  catch { log('AVISO: serialport indisponível — balança desligada.'); return; }

  const baud = (bcfg.bauds && bcfg.bauds[0]) || 4800;
  const port = new SerialPort({ path: bcfg.porta || 'COM4', baudRate: baud, autoOpen: false });

  let rawbuf = Buffer.alloc(0);
  let prevPeso = null, sameCount = 0, lastBroadcast = 0, lastFrame = 0;

  port.on('data', (data) => {
    rawbuf = Buffer.concat([rawbuf, data]);
    while (true) {
      const stx = rawbuf.indexOf(0x02);
      if (stx < 0) break;
      if (stx > 0) rawbuf = rawbuf.subarray(stx);
      const nxt = rawbuf.indexOf(0x02, 1);
      if (nxt < 0) break; // frame incompleto
      const frame = rawbuf.subarray(0, nxt);
      rawbuf = rawbuf.subarray(nxt);
      const peso = parseFrame(frame);
      if (peso === null) continue;
      const now = Date.now();
      lastFrame = now;
      if (peso === prevPeso) sameCount++; else { sameCount = 0; prevPeso = peso; }
      const stable = sameCount >= 2;
      estado.val = peso; estado.stable = stable; estado.ts = now;
      if (now - lastBroadcast > 50) { broadcast(peso, stable); lastBroadcast = now; }
    }
  });
  port.on('error', (e) => log(`Erro serial da balança: ${e.message}`));

  port.open((err) => {
    if (err) { log(`ERRO ao abrir ${bcfg.porta} p/ balança: ${err.message}`); return; }
    log(`Balança conectada em ${bcfg.porta} @ ${baud} baud`);
    // Cutuca a balança (ENQ) a cada 150ms p/ ela não "dormir"
    setInterval(() => { port.write(ENQ, () => {}); }, 150);
    // Reenvia o último peso periodicamente (marca instável se a balança sumiu)
    setInterval(() => {
      const now = Date.now();
      if (clients.size && estado.ts > 0 && now - lastBroadcast > 500) {
        const fresh = now - lastFrame < 1000;
        broadcast(estado.val, estado.stable && fresh);
        lastBroadcast = now;
      }
    }, 300);
  });

  return { estado };
}

module.exports = { iniciarBalanca };
