// Gera uma DANFE simplificada (HTML) para impressão — modo teste (sem SEFAZ real).
const R$ = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v: any, d = 3) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

export function imprimirDanfe(nfe: any) {
  const end: any = nfe.cliente?.enderecoJson || {};
  const itensHtml = (nfe.itens || []).map((it: any) => `
    <tr>
      <td>${it.codigo || it.produto?.codigo || ''}</td>
      <td>${it.descricao}</td>
      <td>${it.ncm || ''}</td>
      <td>${it.cfop || ''}</td>
      <td style="text-align:right">${num(it.quantidade)}</td>
      <td>${it.unidade || ''}</td>
      <td style="text-align:right">${R$(it.valorUnitario)}</td>
      <td style="text-align:right">${R$(it.valorTotal)}</td>
    </tr>`).join('');

  const chave = nfe.chaveAcesso || '—';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>DANFE ${nfe.serie}/${nfe.numero}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;font-size:12px;margin:20px;color:#111}
  .box{border:1px solid #000;padding:8px;margin-bottom:6px}
  .row{display:flex;justify-content:space-between;gap:10px}
  .tag{background:#fef9c3;border:1px solid #ca8a04;color:#854d0e;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:bold}
  h1{font-size:16px;margin:0}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th,td{border:1px solid #999;padding:3px 5px;font-size:10px;text-align:left}
  th{background:#f1f5f9}
  .chave{font-family:monospace;font-size:11px;word-break:break-all}
  .tot{display:flex;gap:20px;justify-content:flex-end;margin-top:6px;font-size:13px}
  @media print{button{display:none}}
</style></head><body>
<button onclick="window.print()" style="margin-bottom:10px;padding:8px 16px;font-size:13px;cursor:pointer">🖨️ Imprimir</button>
<div class="box">
  <div class="row">
    <div><h1>🍃 HETROS IMP. E EXP. LTDA</h1><div>AV DOUTOR GASTAO VIDIGAL, SN - BOX 19 · SÃO PAULO-SP</div></div>
    <div style="text-align:right">
      <div><b>DANFE</b> · NF-e</div>
      <div>Nº ${String(nfe.numero).padStart(9, '0')} · Série ${nfe.serie}</div>
      <span class="tag">AMBIENTE DE TESTE — SEM VALIDADE FISCAL</span>
    </div>
  </div>
</div>
<div class="box">
  <div><b>Chave de acesso:</b> <span class="chave">${chave}</span></div>
  <div><b>Protocolo:</b> ${nfe.protocolo || '—'} · <b>Emissão:</b> ${nfe.dataEmissao ? new Date(nfe.dataEmissao).toLocaleString('pt-BR') : '—'}</div>
  <div><b>Natureza:</b> ${nfe.naturezaOperacao || 'VENDA DE MERCADORIAS'} · <b>CFOP:</b> ${nfe.cfop || ''}</div>
</div>
<div class="box">
  <div><b>Destinatário:</b> ${nfe.destRazaoSocial || nfe.cliente?.razaoSocial || ''}</div>
  <div><b>CNPJ/CPF:</b> ${nfe.destCnpjCpf || nfe.cliente?.cnpjCpf || '—'}</div>
  <div>${[end.rua, end.numero].filter(Boolean).join(', ')} ${end.bairro ? '· ' + end.bairro : ''} ${end.cidade ? '· ' + end.cidade + '-' + (end.uf || '') : ''} ${end.cep ? '· CEP ' + end.cep : ''}</div>
</div>
<table>
  <thead><tr><th>Cód</th><th>Descrição</th><th>NCM</th><th>CFOP</th><th>Qtd</th><th>Un</th><th>Vl Unit</th><th>Vl Total</th></tr></thead>
  <tbody>${itensHtml}</tbody>
</table>
<div class="tot">
  <div>Produtos: <b>${R$(nfe.valorProdutos)}</b></div>
  <div>Frete: <b>${R$(nfe.valorFrete)}</b></div>
  <div>Desconto: <b>${R$(nfe.valorDesconto)}</b></div>
  <div>TOTAL NF-e: <b>${R$(nfe.valorNfe)}</b></div>
</div>
</body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}
