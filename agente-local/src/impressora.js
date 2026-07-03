// Envia os bytes ESC/POS para a impressora térmica.
// 3 modos (config.impressora.modo): 'share' (Windows), 'serial' (COM/LPT), 'tcp' (rede 9100).
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');

function imprimir(buffer, cfg) {
  const imp = cfg.impressora || {};
  const modo = imp.modo || 'share';
  if (modo === 'serial') return viaSerial(buffer, imp);
  if (modo === 'tcp') return viaTcp(buffer, imp);
  return viaShare(buffer, imp);
}

// ── Impressora compartilhada do Windows (RAW via copy /b) — recomendado ──
function viaShare(buffer, imp) {
  return new Promise((resolve, reject) => {
    if (!imp.share) return reject(new Error('config.impressora.share não definido (nome do compartilhamento)'));
    const tmp = path.join(os.tmpdir(), `hetros_print_${Date.now()}.bin`);
    fs.writeFile(tmp, buffer, (err) => {
      if (err) return reject(err);
      const alvo = `\\\\localhost\\${imp.share}`;
      // /b = binário (cru). Aspas p/ nomes com espaço.
      exec(`copy /b "${tmp}" "${alvo}"`, { windowsHide: true }, (e, stdout, stderr) => {
        fs.unlink(tmp, () => {});
        if (e) return reject(new Error(`Falha ao imprimir em ${alvo}: ${stderr || e.message}`));
        resolve(`Enviado p/ ${alvo}`);
      });
    });
  });
}

// ── Porta serial/paralela (COM3, LPT1) ──
function viaSerial(buffer, imp) {
  return new Promise((resolve, reject) => {
    let SerialPort;
    try { ({ SerialPort } = require('serialport')); }
    catch { return reject(new Error('serialport não disponível')); }
    const port = new SerialPort({ path: imp.serialPorta || 'COM3', baudRate: imp.serialBaud || 9600, autoOpen: false });
    port.open((err) => {
      if (err) return reject(new Error(`Não abriu ${imp.serialPorta}: ${err.message}`));
      port.write(buffer, (e) => {
        if (e) { port.close(); return reject(e); }
        port.drain(() => { port.close(); resolve(`Enviado p/ ${imp.serialPorta}`); });
      });
    });
  });
}

// ── Impressora de rede (Ethernet, porta 9100) ──
function viaTcp(buffer, imp) {
  return new Promise((resolve, reject) => {
    const host = imp.tcpHost || '127.0.0.1';
    const porta = imp.tcpPort || 9100;
    const sock = new net.Socket();
    sock.setTimeout(5000);
    sock.connect(porta, host, () => sock.write(buffer, () => sock.end()));
    sock.on('close', () => resolve(`Enviado p/ ${host}:${porta}`));
    sock.on('timeout', () => { sock.destroy(); reject(new Error(`Timeout ${host}:${porta}`)); });
    sock.on('error', (e) => reject(new Error(`Erro ${host}:${porta}: ${e.message}`)));
  });
}

module.exports = { imprimir };
