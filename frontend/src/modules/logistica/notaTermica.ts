// Nota / bilhete de separação em bobina térmica 80mm (ex.: Benetech MP-4200 TH).
// Abre uma janela já com @page 80mm e dispara a impressão.

const kg = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const dt = (v: any) => v ? new Date(v).toLocaleDateString('pt-BR') : '';
const hm = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function imprimirNotaSeparacao(pedido: any) {
  const cli = pedido.cliente || {};
  const itens: any[] = pedido.itens || [];
  const obs = [pedido.observacoes, pedido.observacoesNf].filter(Boolean).join(' · ');
  const totalItens = itens.length;
  const pesoTotal = itens.reduce((s, i) => {
    const u = (i.unidade || '').toUpperCase();
    const pesoUnit = Number(i.produto?.pesoLiquido || i.produto?.pesoBruto || 0);
    const p = u.startsWith('KG') ? Number(i.pesoAferido || i.quantidade) : Number(i.pesoAferido || (Number(i.quantidade) * pesoUnit));
    return s + (Number(p) || 0);
  }, 0);

  const linhasItens = itens.map((i, idx) => {
    const u = (i.unidade || '').toUpperCase();
    const pesoUnit = Number(i.produto?.pesoLiquido || i.produto?.pesoBruto || 0);
    const peso = u.startsWith('KG') ? Number(i.pesoAferido || i.quantidade) : Number(i.pesoAferido || (Number(i.quantidade) * pesoUnit));
    const cod = i.produto?.codigo || '';
    return `
      <div class="it">
        <div class="it-l1"><span class="q">${idx + 1}.</span> <b>${i.descricao || i.produto?.descricao || ''}</b></div>
        <div class="it-l2">${cod ? 'Cód ' + cod + ' · ' : ''}${kg(i.quantidade)} ${i.unidade || ''}${peso > 0 ? ' · ' + kg(peso) + ' kg' : ''}${i.cortado ? ' · <b>CORTADO</b>' : ''}</div>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Nota ${pedido.numero || ''}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: 80mm auto; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .nota { width: 72mm; margin: 0 auto; padding: 4mm 2mm; color: #000;
    font-family: "Courier New", monospace; font-size: 12px; line-height: 1.35; }
  .center { text-align: center; }
  .b { font-weight: bold; }
  .big { font-size: 15px; font-weight: bold; }
  .hr { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; }
  .obs { border: 2px solid #000; padding: 4px 6px; margin: 6px 0; font-weight: bold; font-size: 13px; }
  .it { margin: 3px 0; }
  .it-l1 { font-size: 13px; }
  .it-l2 { font-size: 11px; padding-left: 12px; }
  .q { font-weight: bold; }
  .tot { font-size: 14px; font-weight: bold; }
  .foot { margin-top: 8px; font-size: 11px; }
  .toolbar { text-align: center; margin: 8px 0; }
  .btn { padding: 8px 14px; font-size: 13px; border: 1px solid #999; border-radius: 6px; background: #fff; cursor: pointer; }
  @media print { .toolbar { display: none; } }
</style></head><body>
  <div class="toolbar"><button class="btn" onclick="window.print()">🖨️ Imprimir</button></div>
  <div class="nota">
    <div class="center b big">HETROS</div>
    <div class="center" style="font-size:10px">IMP. E EXP. LTDA · CEASA</div>
    <div class="hr"></div>
    <div class="center b">NOTA DE SEPARAÇÃO</div>
    <div class="row"><span>Pedido</span><span class="b">nº ${pedido.numero ?? ''}</span></div>
    <div class="row"><span>Entrega</span><span>${dt(pedido.dataEntrega)}</span></div>
    ${pedido.periodo ? `<div class="row"><span>Período</span><span>${pedido.periodo}</span></div>` : ''}
    ${pedido.regiao ? `<div class="row"><span>Região</span><span>${pedido.regiao}</span></div>` : ''}
    <div class="hr"></div>
    <div class="b">${cli.nomeFantasia || cli.razaoSocial || 'Cliente'}</div>
    ${cli.cnpjCpf ? `<div style="font-size:11px">${cli.cnpjCpf}</div>` : ''}
    ${obs ? `<div class="obs">📌 ${obs}</div>` : ''}
    <div class="hr"></div>
    ${linhasItens || '<div class="center">— sem itens —</div>'}
    <div class="hr"></div>
    <div class="row tot"><span>ITENS: ${totalItens}</span><span>${kg(pesoTotal)} kg</span></div>
    <div class="hr"></div>
    <div class="foot">
      <div>Separador: ____________________</div>
      <div>Conferente: ___________________</div>
      <div style="margin-top:4px">Impresso ${dt(new Date())} ${hm()}</div>
    </div>
    <div class="center" style="margin-top:6px;font-size:10px">*** SEM VALOR FISCAL ***</div>
    <div style="height:10mm"></div>
  </div>
</body></html>`;

  const w = window.open('', '_blank', 'width=380,height=640');
  if (w) {
    w.document.write(html);
    w.document.close();
    // dispara a impressão automaticamente (o operador só confirma na impressora térmica)
    setTimeout(() => { try { w.focus(); w.print(); } catch { /* noop */ } }, 350);
  }
}
