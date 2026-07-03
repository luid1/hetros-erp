// Servidor HTTP local — recebe a nota em JSON do ERP (navegador) e manda p/ a térmica.
// Endpoints:
//   GET  /status            → estado do agente (balança + impressora)
//   POST /imprimir/cupom    → { pedido, nfe? }  imprime cupom NFC-e
//   POST /imprimir/bilhete  → { pedido }        imprime bilhete separador
//   POST /imprimir/raw      → { base64 }        imprime bytes crus (passthrough)
const http = require('http');
const { cupomFiscal, bilheteSeparador } = require('./notas');
const { imprimir } = require('./impressora');

function iniciarServidor(cfg, log, getBalanca) {
  const porta = cfg.impressora?.httpPort || 3131;

  const cors = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  };
  const json = (res, code, obj) => { cors(res); res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };

  const lerBody = (req) => new Promise((resolve, reject) => {
    let b = ''; req.on('data', (c) => { b += c; if (b.length > 5e6) req.destroy(); });
    req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });

  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end(); }
    const url = (req.url || '').split('?')[0];

    try {
      if (req.method === 'GET' && (url === '/status' || url === '/')) {
        const b = getBalanca?.();
        return json(res, 200, {
          agente: 'HETROS Agente Local', versao: '1.0.0', ok: true,
          balanca: { ativa: !!cfg.balanca?.ativa, peso: b?.val ?? 0, estavel: !!b?.stable, conectada: (b?.ts || 0) > 0 },
          impressora: { ativa: !!cfg.impressora?.ativa, modo: cfg.impressora?.modo, destino: cfg.impressora?.share || cfg.impressora?.serialPorta || cfg.impressora?.tcpHost },
        });
      }

      if (req.method === 'POST' && url.startsWith('/imprimir')) {
        const body = await lerBody(req);
        let buffer;
        if (url === '/imprimir/cupom') buffer = cupomFiscal(body, cfg);
        else if (url === '/imprimir/bilhete') buffer = bilheteSeparador(body, cfg);
        else if (url === '/imprimir/raw') buffer = Buffer.from(String(body.base64 || ''), 'base64');
        else return json(res, 404, { ok: false, erro: 'Rota de impressão desconhecida' });

        const msg = await imprimir(buffer, cfg);
        log(`Impresso: ${url} (${buffer.length} bytes) → ${msg}`);
        return json(res, 200, { ok: true, mensagem: msg, bytes: buffer.length });
      }

      return json(res, 404, { ok: false, erro: 'Não encontrado' });
    } catch (e) {
      log(`ERRO ${req.method} ${url}: ${e.message}`);
      return json(res, 500, { ok: false, erro: e.message });
    }
  });

  server.on('error', (e) => log(`ERRO no servidor HTTP: ${e.message}`));
  server.listen(porta, () => log(`Servidor de impressão ativo em http://localhost:${porta}`));
  return server;
}

module.exports = { iniciarServidor };
