// HETROS — Agente Local
// Um único processo (empacotável em .exe) que roda em cada máquina do galpão:
//   • Balança PRIX TI200  → WebSocket 8765  (o ERP conecta e lê o peso ao vivo)
//   • Impressão térmica    → HTTP 3131       (o ERP manda a nota em JSON, sai em ESC/POS)
'use strict';

const fs = require('fs');
const path = require('path');
const { iniciarBalanca } = require('./src/balanca');
const { iniciarServidor } = require('./src/servidor');

// Log com timestamp
function log(msg) {
  const t = new Date().toLocaleTimeString('pt-BR');
  console.log(`[${t}] ${msg}`);
}

// Carrega config.json de AO LADO do exe/script (não de dentro do pacote pkg),
// pra o usuário conseguir editar a porta da balança/impressora sem recompilar.
function carregarConfig() {
  const baseDir = process.pkg ? path.dirname(process.execPath) : __dirname;
  const externo = path.join(baseDir, 'config.json');
  const interno = path.join(__dirname, 'config.json');
  const alvo = fs.existsSync(externo) ? externo : interno;
  try {
    const cfg = JSON.parse(fs.readFileSync(alvo, 'utf8'));
    log(`Config carregada de: ${alvo}`);
    return cfg;
  } catch (e) {
    log(`AVISO: não li config.json (${e.message}). Usando padrões.`);
    return {
      balanca: { ativa: true, porta: 'COM4', bauds: [4800], wsPort: 8765 },
      impressora: { ativa: true, httpPort: 3131, modo: 'share', share: 'POS80', colunas: 48, codepage: 'CP860' },
      empresa: { nome: 'HETROS IMP. E EXP. LTDA' },
    };
  }
}

function main() {
  console.log('='.repeat(48));
  console.log('   HETROS — Agente Local (balança + impressão)');
  console.log('='.repeat(48));

  const cfg = carregarConfig();
  let balanca = null;

  if (cfg.balanca?.ativa !== false) {
    balanca = iniciarBalanca(cfg, log);
  } else {
    log('Balança desativada no config.');
  }

  if (cfg.impressora?.ativa !== false) {
    iniciarServidor(cfg, log, () => balanca?.estado);
  } else {
    log('Impressão desativada no config.');
  }

  log('Agente no ar. Deixe esta janela aberta. (Ctrl+C para encerrar)');
}

process.on('uncaughtException', (e) => log(`ERRO não tratado: ${e.stack || e.message}`));
process.on('unhandledRejection', (e) => log(`Rejeição não tratada: ${e?.message || e}`));

main();
