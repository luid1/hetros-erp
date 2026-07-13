// Documento oficial do Pedido de Compra (Ordem de Compra) — imprimível / Salvar PDF.
// Reaproveita o padrão dos impressos da logística: monta HTML e abre em janela nova
// (window.print via botão). Serve para enviar ao fornecedor (inclusive por WhatsApp,
// depois de "Salvar como PDF").
import api from '../../services/api';

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const R$ = (v: unknown) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const data = (d: unknown) => (d ? new Date(d as string).toLocaleDateString('pt-BR') : '—');

// Rótulos amigáveis da condição de pagamento (espelha o CONatoLabel da tela de Compras).
const CONDICAO: Record<string, string> = {
  A_VISTA: 'À vista', '30_DIAS': '30 dias', '30_60': '30/60 dias', '30_60_90': '30/60/90 dias',
};
const condicaoLabel = (c: unknown) => (c ? CONDICAO[String(c)] || String(c) : '—');

function abrirImpressao(html: string) {
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

/** Monta o HTML do Pedido de Compra a partir de uma OC (detalhe com fornecedor + itens). */
export function htmlPedidoCompra(oc: any): string {
  const forn: any = oc.fornecedor || {};
  const nomeForn = (forn.nomeFantasia || forn.razaoSocial || '—').toUpperCase();
  const docForn = [forn.cnpj && `CNPJ ${forn.cnpj}`, forn.telefone].filter(Boolean).join(' · ');

  const itens = oc.itens || [];
  const linhas = itens.map((it: any, i: number) => {
    const cod = it.produto?.codigo || it.codigo || '—';
    const desc = it.descricao || it.produto?.descricao || '—';
    const qtd = Number(it.quantidade) || 0;
    const preco = Number(it.precoUnitario) || 0;
    return `
      <tr class="${i % 2 ? 'odd' : ''}">
        <td class="cod">${esc(cod)}</td>
        <td>${esc(desc)}</td>
        <td class="c">${esc(it.unidade || '')}</td>
        <td class="r">${qtd.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</td>
        <td class="r">${R$(preco)}</td>
        <td class="r">${R$(qtd * preco)}</td>
      </tr>`;
  }).join('');

  const total = itens.reduce((s: number, i: any) => s + (Number(i.quantidade) || 0) * (Number(i.precoUnitario) || 0), 0);

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Pedido de Compra #${esc(oc.numero)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; margin: 0; padding: 24px; }
  .doc { max-width: 780px; margin: 0 auto; }
  .cab { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0B0F17; padding-bottom: 12px; }
  .marca { font-size: 26px; font-weight: 900; letter-spacing: 1px; color: #0B0F17; }
  .marca small { display: block; font-size: 11px; font-weight: 600; color: #666; letter-spacing: 2px; }
  .titdoc { text-align: right; }
  .titdoc h1 { margin: 0; font-size: 18px; color: #0B0F17; }
  .titdoc .num { font-size: 22px; font-weight: 900; }
  .titdoc .st { display: inline-block; margin-top: 4px; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 10px; background: #eef; color: #334; }
  .grid { display: flex; gap: 24px; margin: 16px 0; }
  .bloco { flex: 1; }
  .bloco h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin: 0 0 4px; }
  .bloco p { margin: 0; font-size: 13px; line-height: 1.5; }
  .forn { font-weight: 800; font-size: 15px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  th { background: #0B0F17; color: #fff; text-align: left; padding: 7px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; }
  td { padding: 6px 8px; border-bottom: 1px solid #e5e5e5; }
  tr.odd td { background: #fafafa; }
  td.cod { font-family: monospace; color: #555; }
  td.c { text-align: center; } td.r { text-align: right; }
  .tot { display: flex; justify-content: flex-end; margin-top: 10px; }
  .tot .cx { min-width: 240px; }
  .tot .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .tot .total { border-top: 2px solid #0B0F17; margin-top: 4px; padding-top: 8px; font-size: 18px; font-weight: 900; }
  .obs { margin-top: 18px; font-size: 12px; }
  .obs h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin: 0 0 4px; }
  .assin { display: flex; gap: 40px; margin-top: 48px; }
  .assin div { flex: 1; border-top: 1px solid #999; padding-top: 6px; text-align: center; font-size: 11px; color: #666; }
  .rod { margin-top: 24px; font-size: 10px; color: #999; text-align: center; }
  @media print { body { padding: 0; } .noprint { display: none; } }
  .barra { text-align: center; margin-bottom: 16px; }
  .barra button { font: inherit; font-weight: 700; padding: 10px 22px; border: 0; border-radius: 8px; background: #0B0F17; color: #fff; cursor: pointer; }
</style></head>
<body>
  <div class="barra noprint"><button onclick="window.print()">🖨️ Imprimir / Salvar PDF</button></div>
  <div class="doc">
    <div class="cab">
      <div class="marca">HETROS<small>IMPORTAÇÃO E EXPORTAÇÃO</small></div>
      <div class="titdoc">
        <h1>PEDIDO DE COMPRA</h1>
        <div class="num">Nº ${esc(oc.numero)}</div>
        <span class="st">${esc(oc.status || 'PENDENTE')}</span>
      </div>
    </div>
    <div class="grid">
      <div class="bloco">
        <h2>Fornecedor</h2>
        <p class="forn">${nomeForn}</p>
        <p>${esc(docForn)}</p>
      </div>
      <div class="bloco">
        <h2>Dados do pedido</h2>
        <p><b>Emissão:</b> ${data(oc.dataEmissao || oc.createdAt)}</p>
        <p><b>Entrega prevista:</b> ${data(oc.dataEntregaPrevista)}</p>
        <p><b>Pagamento:</b> ${esc(condicaoLabel(oc.condicaoPagamento))}</p>
      </div>
    </div>
    <table>
      <thead><tr><th>Cód.</th><th>Produto</th><th style="text-align:center">Un</th><th style="text-align:right">Qtd</th><th style="text-align:right">Preço/un</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>${linhas || '<tr><td colspan="6" style="text-align:center;color:#999;padding:16px">Sem itens.</td></tr>'}</tbody>
    </table>
    <div class="tot"><div class="cx">
      <div class="row total"><span>TOTAL</span><span>${R$(total)}</span></div>
    </div></div>
    ${oc.observacoes ? `<div class="obs"><h2>Observações</h2><p>${esc(oc.observacoes)}</p></div>` : ''}
    <div class="assin">
      <div>Comprador — Hetros</div>
      <div>Fornecedor — ciência</div>
    </div>
    <div class="rod">Documento gerado pelo Hetros ERP em ${new Date().toLocaleString('pt-BR')} — não é documento fiscal.</div>
  </div>
</body></html>`;
}

/** Abre o Pedido de Compra a partir do id da OC (busca o detalhe e imprime). */
export async function imprimirPedidoCompra(idOuOc: string | any) {
  const oc = typeof idOuOc === 'string' ? (await api.get(`/compras/${idOuOc}`)).data : idOuOc;
  abrirImpressao(htmlPedidoCompra(oc));
}
