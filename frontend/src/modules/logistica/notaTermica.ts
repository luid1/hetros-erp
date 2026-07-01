// Bilhete Separador em bobina térmica 80mm (ex.: Benetech MP-4200 TH).
// Layout no padrão do NewOxxy: cabeçalho + itens agrupados por família,
// com colunas Qtde Separação / Qtde Vendida e caixinha de conferência.

const q = (qtd: any, un: any) => `${(Number(qtd) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${un || ''}`.trim();
const dt = (v: any) => v ? new Date(v).toLocaleDateString('pt-BR') : '';
const dtHora = (v: any) => v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const up = (s: any) => String(s || '').toUpperCase();

const FAMILIA: Record<string, string> = { FRUTA: 'FRUTA', LEGUME: 'LEGUME', VERDURA: 'VERDURA' };

export function imprimirNotaSeparacao(pedido: any) {
  const cli = pedido.cliente || {};
  const end: any = cli.enderecoJson || {};
  const itens: any[] = (pedido.itens || []).filter((i: any) => !i.cortado);
  const origin = window.location.origin;

  // Agrupa por família (categoria do produto)
  const grupos = new Map<string, any[]>();
  for (const i of itens) {
    const fam = FAMILIA[up(i.produto?.categoria)] || up(i.produto?.grupo) || 'GERAL';
    if (!grupos.has(fam)) grupos.set(fam, []);
    grupos.get(fam)!.push(i);
  }

  const numero = pedido.numero ?? '';
  const nomeCli = up(cli.nomeFantasia || cli.razaoSocial || 'CLIENTE');
  const enderecoTxt = up([end.rua, end.numero].filter(Boolean).join(', ') + (end.bairro ? ' - ' + end.bairro : ''));

  const kv = (k: string, v: string) => `<div class="kv"><span class="k">${k}</span><span class="v">${v || '-'}</span></div>`;

  const gruposHtml = Array.from(grupos.entries()).map(([fam, its]) => `
    <div class="fam">${fam}</div>
    <div class="subc">${nomeCli}</div>
    <div class="sub">PEDIDO(s): ${numero} &nbsp; BNO: ${numero}</div>
    <div class="dash"></div>
    ${its.map((i) => `
      <div class="itrow">
        <span class="prod">${up(i.descricao || i.produto?.descricao)}</span>
        <span class="chk"></span>
        <span class="qc">${q(i.quantidade, i.unidade)}</span>
        <span class="qc">${q(i.quantidade, i.unidade)}</span>
      </div>`).join('')}
  `).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bilhete ${numero}</title>
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: 80mm auto; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .b80 { width: 74mm; margin: 0 auto; padding: 3mm 2mm; color: #000;
    font-family: "Arial Narrow", Arial, sans-serif; font-size: 12px; line-height: 1.28; }
  .logo { text-align: center; margin-bottom: 3px; }
  .logo img { height: 12mm; max-width: 62mm; object-fit: contain; }
  .titulo { text-align: center; font-weight: 800; font-size: 15px; letter-spacing: 1px; }
  .cli { text-align: center; font-weight: 700; font-size: 12px; }
  .bilhete { text-align: center; font-weight: 800; font-size: 13px; margin: 3px 0; padding: 2px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; }
  .rule { border-top: 1px solid #000; margin: 5px 0; }
  .kv { display: flex; font-size: 11px; }
  .kv .k { width: 68px; font-weight: 700; }
  .kv .k::after { content: ":"; }
  .kv .v { flex: 1; word-break: break-word; }
  .colh { display: flex; align-items: flex-end; font-weight: 800; }
  .colh .p { flex: 1; font-size: 11px; }
  .colh .qc { width: 56px; text-align: center; }
  .colh .qc .l1 { font-size: 11px; } .colh .qc .l2 { font-size: 8.5px; display: block; }
  .fam { text-align: center; font-weight: 800; font-size: 13px; margin-top: 7px; letter-spacing: 2px; }
  .subc { text-align: center; font-size: 10px; }
  .sub { text-align: center; font-size: 10px; }
  .dash { border-top: 1px dashed #000; margin: 3px 0; }
  .itrow { display: flex; align-items: center; gap: 4px; font-size: 12.5px; margin: 3px 0; }
  .itrow .prod { flex: 1; font-weight: 700; }
  .itrow .chk { width: 14px; height: 14px; border: 1.5px solid #000; display: inline-block; }
  .itrow .qc { width: 56px; text-align: right; }
  .foot { margin-top: 8px; font-size: 11px; }
  .assin { margin-top: 6px; }
  .toolbar { text-align: center; margin: 10px 0; }
  .btn { padding: 9px 18px; font-size: 13px; border: 1px solid #999; border-radius: 6px; background: #fff; cursor: pointer; }
  @media print { .toolbar { display: none; } body { -webkit-print-color-adjust: exact; } }
</style></head><body>
  <div class="toolbar"><button class="btn" onclick="window.print()">🖨️ Imprimir</button></div>
  <div class="b80">
    <div class="logo"><img src="${origin}/logo-hetros.png" alt="HETROS" /></div>
    <div class="titulo">BILHETE SEPARADOR</div>
    <div class="cli">${nomeCli}</div>
    <div class="bilhete">BILHETE Nº ${numero}${pedido.periodo ? ' &nbsp;·&nbsp; ' + up(pedido.periodo) : ''}</div>
    ${kv('Impressão', dtHora(new Date()))}
    ${kv('Depto', '1-OPERACIONAL')}
    ${kv('Pedido(s)', String(numero))}
    ${kv('Vendedor', up(pedido.usuario?.nome))}
    ${kv('Endereço', enderecoTxt)}
    ${kv('Cidade', up(end.cidade))}
    ${kv('Referência', up(pedido.observacoes))}
    ${kv('Separador', '______________________')}
    ${kv('Dt Entrega', dt(pedido.dataEntrega))}
    <div class="rule"></div>
    <div class="colh">
      <span class="p">PRODUTO</span>
      <span class="qc"><span class="l1">QTDE.</span><span class="l2">SEPARAÇÃO</span></span>
      <span class="qc"><span class="l1">QTDE.</span><span class="l2">VENDIDA</span></span>
    </div>
    <div class="rule"></div>
    ${gruposHtml || '<div style="text-align:center">— sem itens —</div>'}
    <div class="rule"></div>
    <div class="foot">
      <div><b>Total de itens:</b> ${itens.length}</div>
      <div class="assin">Conferente: ______________________</div>
    </div>
    <div style="text-align:center;margin-top:8px;font-size:10px">*** SEM VALOR FISCAL ***</div>
    <div style="height:10mm"></div>
  </div>
</body></html>`;

  abrirImpressao(html);
}

// ─────────────────────────────────────────────────────────────
// CUPOM FISCAL (estilo NFC-e) — bobina 80mm
// Aceita um pedido (usa preços do pedido) e, opcionalmente, uma NF-e
// (usa chave de acesso real). Modo teste → "SEM VALOR FISCAL".
// ─────────────────────────────────────────────────────────────
const R$ = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FORMA: Record<string, string> = { DINHEIRO: 'Dinheiro', PIX: 'PIX', CARTAO_CREDITO: 'Cartão Crédito', CARTAO_DEBITO: 'Cartão Débito', BOLETO: 'Boleto', A_PRAZO: 'A Prazo', CHEQUE: 'Cheque' };

// "QR code" ilustrativo (grade pseudo-aleatória a partir de uma semente)
function fakeQr(seed: string) {
  const n = 21; let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return (h >>> 8) & 1; };
  let cells = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const finder = (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    const on = finder ? ((r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4) || r === n - 1 || r === n - 7 || c === n - 1 || c === n - 7) ? 1 : 0) : rnd();
    if (on) cells += `<span style="grid-row:${r + 1};grid-column:${c + 1}"></span>`;
  }
  return `<div class="qr">${cells}</div>`;
}

export function imprimirCupomFiscal(pedido: any, nfe?: any) {
  const cli = pedido.cliente || {};
  const itens: any[] = (pedido.itens || []).filter((i: any) => !i.cortado);
  const origin = window.location.origin;
  const chave = (nfe?.chaveAcesso || '').replace(/\D/g, '');
  const chaveFmt = chave ? chave.replace(/(.{4})/g, '$1 ').trim() : '';
  const totalItens = itens.length;
  const valorTotal = Number(pedido.valorTotal) || itens.reduce((s, i) => s + Number(i.valorTotal || 0), 0);

  const linhas = itens.map((i, idx) => {
    const unit = Number(i.precoUnitario ?? i.valorUnitario ?? 0);
    const tot = Number(i.valorTotal ?? (Number(i.quantidade) * unit));
    return `
      <div class="ci">
        <div class="ci1"><span class="ci-i">${String(idx + 1).padStart(3, '0')}</span> ${up(i.produto?.codigo || '')} ${up(i.descricao || i.produto?.descricao)}</div>
        <div class="ci2"><span>${q(i.quantidade, i.unidade)} x ${R$(unit)}</span><span class="ci-t">${R$(tot)}</span></div>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cupom ${pedido.numero || ''}</title>
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: 80mm auto; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .c80 { width: 74mm; margin: 0 auto; padding: 3mm 2mm; color: #000;
    font-family: "Arial Narrow", Arial, sans-serif; font-size: 12px; line-height: 1.25; }
  .center { text-align: center; }
  .logo img { height: 11mm; max-width: 60mm; object-fit: contain; }
  .emit { text-align: center; font-size: 10.5px; }
  .emit .nome { font-weight: 800; font-size: 12px; }
  .rule { border-top: 1px solid #000; margin: 4px 0; }
  .dash { border-top: 1px dashed #000; margin: 4px 0; }
  .tit { text-align: center; font-weight: 800; font-size: 11px; }
  .colh { display: flex; justify-content: space-between; font-weight: 800; font-size: 10px; }
  .ci { margin: 2px 0; }
  .ci1 { font-size: 11.5px; }
  .ci-i { font-weight: 700; }
  .ci2 { display: flex; justify-content: space-between; font-size: 11px; padding-left: 22px; }
  .ci-t { font-weight: 700; }
  .tot { display: flex; justify-content: space-between; font-weight: 800; }
  .totbig { font-size: 16px; }
  .pg { display: flex; justify-content: space-between; font-size: 11.5px; }
  .chave { font-family: "Courier New", monospace; font-size: 10px; word-break: break-all; text-align: center; }
  .qr { display: grid; grid-template-columns: repeat(21, 3px); grid-template-rows: repeat(21, 3px); width: 63px; margin: 6px auto; }
  .qr span { background: #000; width: 3px; height: 3px; }
  .toolbar { text-align: center; margin: 10px 0; }
  .btn { padding: 9px 18px; font-size: 13px; border: 1px solid #999; border-radius: 6px; background: #fff; cursor: pointer; }
  @media print { .toolbar { display: none; } }
</style></head><body>
  <div class="toolbar"><button class="btn" onclick="window.print()">🖨️ Imprimir</button></div>
  <div class="c80">
    <div class="center logo"><img src="${origin}/logo-hetros.png" alt="HETROS" /></div>
    <div class="emit">
      <div class="nome">HETROS IMP. E EXP. LTDA</div>
      <div>CNPJ 12.345.678/0001-95 · IE 111111111111</div>
      <div>AV DR GASTÃO VIDIGAL, S/N - BOX 19 - CEASA</div>
      <div>VILA LEOPOLDINA · SÃO PAULO/SP</div>
    </div>
    <div class="rule"></div>
    <div class="tit">DANFE NFC-e — Documento Auxiliar da<br/>Nota Fiscal de Consumidor Eletrônica</div>
    <div class="dash"></div>
    <div class="colh"><span>ITEM CÓD DESCRIÇÃO</span><span>VL TOTAL</span></div>
    <div class="colh"><span style="font-weight:400;font-size:9px">QTD x UNIT</span><span></span></div>
    <div class="dash"></div>
    ${linhas || '<div class="center">— sem itens —</div>'}
    <div class="dash"></div>
    <div class="tot"><span>Qtd. total de itens</span><span>${totalItens}</span></div>
    <div class="tot totbig"><span>VALOR TOTAL R$</span><span>${R$(valorTotal)}</span></div>
    <div class="pg"><span>Forma de pagamento</span><span>${FORMA[up(pedido.formaPagamento)] || pedido.formaPagamento || '-'}</span></div>
    <div class="pg"><span>Valor pago</span><span>R$ ${R$(valorTotal)}</span></div>
    <div class="dash"></div>
    <div class="center" style="font-size:10.5px">
      <b>CONSUMIDOR</b><br/>
      ${up(cli.razaoSocial || cli.nomeFantasia || 'CONSUMIDOR NÃO IDENTIFICADO')}<br/>
      ${cli.cnpjCpf ? 'CNPJ/CPF ' + cli.cnpjCpf : ''}
    </div>
    <div class="dash"></div>
    <div class="center" style="font-size:10px">${nfe?.numero ? `NFC-e nº ${nfe.numero} · Série ${nfe.serie || '1'}` : `Pedido nº ${pedido.numero}`} · ${dtHora(nfe?.dataEmissao || new Date())}</div>
    ${chave ? `
      <div class="center" style="font-size:9px;margin-top:4px">Consulte pela Chave de Acesso em:<br/>www.nfce.fazenda.sp.gov.br</div>
      <div class="chave">${chaveFmt}</div>
      ${fakeQr(chave)}
    ` : ''}
    <div class="center" style="margin-top:6px;font-weight:800;font-size:11px">*** SEM VALOR FISCAL — MODO TESTE ***</div>
    <div style="height:10mm"></div>
  </div>
</body></html>`;

  abrirImpressao(html);
}

function abrirImpressao(html: string) {
  const w = window.open('', '_blank', 'width=390,height=720');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch { /* noop */ } }, 500);
  }
}
