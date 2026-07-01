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

  const gruposHtml = Array.from(grupos.entries()).map(([fam, its]) => `
    <div class="fam">${fam}</div>
    <div class="c sub">${nomeCli}</div>
    <div class="sub">PEDIDO(s): ${numero}</div>
    <div class="sub">BNO: ${numero}</div>
    <div class="plus">++++++++++++++++++++++++++++++++++++</div>
    ${its.map((i) => `
      <div class="itrow">
        <span class="prod">${up(i.descricao || i.produto?.descricao)}</span>
        <span class="chk">▢</span>
        <span class="qc">${q(i.quantidade, i.unidade)}</span>
        <span class="qc">${q(i.quantidade, i.unidade)}</span>
      </div>`).join('')}
  `).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bilhete ${numero}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: 80mm auto; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .b80 { width: 74mm; margin: 0 auto; padding: 3mm 1.5mm; color: #000;
    font-family: "Courier New", monospace; font-size: 12px; line-height: 1.3; }
  .c { text-align: center; }
  .b { font-weight: bold; }
  .logo { text-align: center; font-weight: bold; font-size: 16px; letter-spacing: 1px; }
  .titulo { text-align: center; font-weight: bold; font-size: 13px; margin-top: 2px; }
  .cli { text-align: center; font-weight: bold; font-size: 12px; }
  .bilhete { text-align: center; font-weight: bold; margin: 4px 0; }
  .hr { border-top: 1px solid #000; margin: 4px 0; }
  .kv { font-size: 11px; white-space: pre; }
  .colh { display: flex; font-weight: bold; font-size: 11px; margin-top: 2px; }
  .colh .p { flex: 1; }
  .colh .qc { width: 62px; text-align: center; }
  .fam { text-align: center; font-weight: bold; font-size: 13px; margin-top: 6px; }
  .sub { text-align: left; font-size: 10.5px; }
  .sub.c { text-align: center; }
  .plus { font-size: 9px; overflow: hidden; white-space: nowrap; letter-spacing: -1px; }
  .itrow { display: flex; align-items: center; gap: 3px; font-size: 12px; margin: 2px 0; }
  .itrow .prod { flex: 1; font-weight: bold; }
  .itrow .chk { width: 16px; text-align: center; font-size: 14px; }
  .itrow .qc { width: 54px; text-align: right; }
  .foot { margin-top: 8px; font-size: 11px; }
  .toolbar { text-align: center; margin: 8px 0; }
  .btn { padding: 8px 14px; font-size: 13px; border: 1px solid #999; border-radius: 6px; background: #fff; cursor: pointer; }
  @media print { .toolbar { display: none; } }
</style></head><body>
  <div class="toolbar"><button class="btn" onclick="window.print()">🖨️ Imprimir</button></div>
  <div class="b80">
    <div class="logo">🍃 HETROS</div>
    <div class="titulo">BILHETE SEPARADOR</div>
    <div class="cli">${nomeCli}</div>
    <div class="bilhete">BILHETE Nº ${numero}${pedido.periodo ? '   ' + up(pedido.periodo) : ''}</div>
    <div class="hr"></div>
    <div class="kv">Impressão.: ${dtHora(new Date())}</div>
    <div class="kv">Depto.....: 1-OPERACIONAL</div>
    <div class="kv">Pedido(s).: ${numero}</div>
    <div class="kv">Vendedor..: ${up(pedido.usuario?.nome) || '-'}</div>
    <div class="kv">Endereço..: ${enderecoTxt || '-'}</div>
    <div class="kv">Cidade....: ${up(end.cidade) || '-'}</div>
    <div class="kv">Referência: ${up(pedido.observacoes) || '-'}</div>
    <div class="kv">Separador.: ______________________</div>
    <div class="kv">Dt Entrega: ${dt(pedido.dataEntrega)}</div>
    <div class="hr"></div>
    <div class="colh"><span class="p">PRODUTO</span><span class="qc">QTDE.</span><span class="qc">QTDE.</span></div>
    <div class="colh"><span class="p"></span><span class="qc">SEPARAÇÃO</span><span class="qc">VENDIDA</span></div>
    <div class="hr"></div>
    ${gruposHtml || '<div class="c">— sem itens —</div>'}
    <div class="hr"></div>
    <div class="foot">
      <div>Total de itens: ${itens.length}</div>
      <div style="margin-top:4px">Conferente: ____________________</div>
    </div>
    <div class="c" style="margin-top:6px;font-size:10px">*** SEM VALOR FISCAL ***</div>
    <div style="height:10mm"></div>
  </div>
</body></html>`;

  const w = window.open('', '_blank', 'width=380,height=680');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch { /* noop */ } }, 350);
  }
}
