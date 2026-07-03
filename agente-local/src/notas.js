// Layouts das notas térmicas em ESC/POS — espelham o notaTermica.ts do ERP.
const { EscPos } = require('./escpos');

const R$ = (v) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const q = (qtd, un) => `${(Number(qtd) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${un || ''}`.trim();
const up = (s) => String(s || '').toUpperCase();
const dtHora = (v) => (v ? new Date(v) : new Date()).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dt = (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '';
const FORMA = { DINHEIRO: 'Dinheiro', PIX: 'PIX', CARTAO_CREDITO: 'Cartao Credito', CARTAO_DEBITO: 'Cartao Debito', BOLETO: 'Boleto', A_PRAZO: 'A Prazo', CHEQUE: 'Cheque' };

// ─── Cupom fiscal (estilo NFC-e) ────────────────────────────────
function cupomFiscal(dados, cfg) {
  const emp = cfg.empresa || {};
  const opts = { colunas: cfg.impressora?.colunas, codepage: cfg.impressora?.codepage };
  const pedido = dados.pedido || dados;
  const nfe = dados.nfe;
  const cli = pedido.cliente || {};
  const itens = (pedido.itens || []).filter((i) => !i.cortado);
  const valorTotal = Number(pedido.valorTotal) || itens.reduce((s, i) => s + Number(i.valorTotal || 0), 0);
  const emissao = nfe?.dataEmissao ? new Date(nfe.dataEmissao) : new Date();
  const numeroDoc = nfe?.numero ?? pedido.numero ?? 0;
  const serie = nfe?.serie || '1';
  const chave = String(nfe?.chaveAcesso || '').replace(/\D/g, '') || '00000000000000000000000000000000000000000000';
  const chaveFmt = chave.replace(/(.{4})/g, '$1 ').trim();
  const protocolo = nfe?.protocolo || `135${emissao.getFullYear()}${Date.now().toString().slice(-10)}`;
  const tributos = valorTotal * 0.0765;

  const p = new EscPos(opts);
  p.align('center').bold(true).linha(emp.nome || 'HETROS').bold(false);
  if (emp.cnpj) p.linha(`CNPJ ${emp.cnpj}  IE ${emp.ie || ''}`);
  if (emp.endereco) p.linha(emp.endereco);
  if (emp.cidade) p.linha(emp.cidade);
  p.separador();
  p.bold(true).linha('DANFE NFC-e - Documento Auxiliar da').linha('Nota Fiscal de Consumidor Eletronica').bold(false);
  p.separador('=');
  p.align('left');
  p.linha('#  COD DESCRICAO');
  p.linha('   QTD x V.UNIT              V.TOTAL');
  p.separador();
  itens.forEach((i, idx) => {
    const unit = Number(i.precoUnitario ?? i.valorUnitario ?? 0);
    const tot = Number(i.valorTotal ?? (Number(i.quantidade) * unit));
    p.linha(`${String(idx + 1).padStart(3, '0')} ${up(i.produto?.codigo || '')} ${up(i.descricao || i.produto?.descricao)}`);
    p.colunaLR(`   ${q(i.quantidade, i.unidade)} x ${R$(unit)}`, R$(tot));
  });
  p.separador();
  p.colunaLR('Qtde. total de itens', String(itens.length));
  p.colunaLR('Valor total R$', R$(valorTotal));
  p.colunaLR('Descontos R$', R$(pedido.descontoTotal || 0));
  p.bold(true).duplo().colunaLR('A PAGAR', R$(valorTotal)).normal().bold(false);
  p.separador();
  p.bold(true).colunaLR('FORMA PAGAMENTO', 'VALOR PAGO').bold(false);
  p.colunaLR(FORMA[up(pedido.formaPagamento)] || up(pedido.formaPagamento) || 'Dinheiro', R$(valorTotal));
  p.separador();
  p.align('center').linha('Tributos Totais Incidentes').linha(`(Lei Federal 12.741/2012): R$ ${R$(tributos)}`);
  p.separador();
  p.linha(`Numero ${numeroDoc}  Serie ${serie}`).linha(`Emissao ${dtHora(emissao)}`);
  p.linha('Protocolo de Autorizacao:').linha(protocolo);
  p.separador();
  p.linha('Consumidor:').bold(true).linha(up(cli.razaoSocial || cli.nomeFantasia || 'CONSUMIDOR NAO IDENTIFICADO')).bold(false);
  if (cli.cnpjCpf) p.linha(`CNPJ/CPF ${cli.cnpjCpf}`);
  p.separador();
  p.linha('Consulte pela Chave de Acesso em').linha('www.nfce.fazenda.sp.gov.br/consulta');
  p.linha(chaveFmt);
  p.qrcode(chave, 6);
  p.bold(true).linha('*** SEM VALOR FISCAL - MODO TESTE ***').bold(false);
  if (cfg.impressora?.cortarPapel !== false) p.cortar();
  return p.build();
}

// ─── Bilhete separador (picking) ────────────────────────────────
function bilheteSeparador(dados, cfg) {
  const emp = cfg.empresa || {};
  const opts = { colunas: cfg.impressora?.colunas, codepage: cfg.impressora?.codepage };
  const pedido = dados.pedido || dados;
  const cli = pedido.cliente || {};
  const end = cli.enderecoJson || {};
  const itens = (pedido.itens || []).filter((i) => !i.cortado);
  const numero = pedido.numero ?? '';
  const nomeCli = up(cli.nomeFantasia || cli.razaoSocial || 'CLIENTE');

  const p = new EscPos(opts);
  p.align('center').bold(true).duplo().linha('HETROS').normal();
  p.linha('BILHETE SEPARADOR').bold(false);
  p.linha(nomeCli);
  p.separador();
  p.bold(true).linha(`BILHETE No ${numero}${pedido.periodo ? ' - ' + up(pedido.periodo) : ''}`).bold(false);
  p.align('left');
  p.linha(`Impressao : ${dtHora(new Date())}`);
  p.linha(`Pedido(s) : ${numero}`);
  p.linha(`Vendedor  : ${up(pedido.usuario?.nome)}`);
  const enderecoTxt = up([end.rua, end.numero].filter(Boolean).join(', ') + (end.bairro ? ' - ' + end.bairro : ''));
  if (enderecoTxt) p.linha(`Endereco  : ${enderecoTxt}`);
  if (end.cidade) p.linha(`Cidade    : ${up(end.cidade)}`);
  if (pedido.observacoes) p.bold(true).linha(`OBS: ${up(pedido.observacoes)}`).bold(false);
  p.linha(`Dt Entrega: ${dt(pedido.dataEntrega)}`);
  p.separador();
  p.bold(true).colunaLR('PRODUTO', 'QTDE').bold(false);
  p.separador();
  itens.forEach((i) => {
    p.colunaLR(up(i.descricao || i.produto?.descricao).slice(0, cfg.impressora?.colunas - 12 || 36), `[ ] ${q(i.quantidade, i.unidade)}`);
  });
  p.separador();
  p.linha(`Total de itens: ${itens.length}`);
  p.feed(1).linha('Separador : ______________________');
  p.linha('Conferente: ______________________');
  p.align('center').linha('*** SEM VALOR FISCAL ***');
  if (cfg.impressora?.cortarPapel !== false) p.cortar();
  return p.build();
}

module.exports = { cupomFiscal, bilheteSeparador };
