import api from '../../services/api';

/* ══════════════════════════════════════════════════════════════════════════════
   Impressos da Logística — Espelho (picking) e Capa de Rota.
   Layout fiel ao modelo NewOxxy. Usado pela tela de Controle de Carga e pela
   Torre de Controle (que monta a Capa a partir da rota carregada em memória).
   ════════════════════════════════════════════════════════════════════════════ */

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dt = (d: unknown) => (d ? new Date(d as string).toLocaleDateString('pt-BR') : '');
const carimboAgora = () => {
  const a = new Date();
  return `${a.toLocaleDateString('pt-BR')} - ${a.toLocaleTimeString('pt-BR')}`;
};
const qtd3 = (v: unknown) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const peso3 = (v: unknown) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

function abrirImpressao(html: string) {
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

/* ─────────────────────────── ESPELHO (picking do pedido) ─────────────────────── */
export function htmlEspelho(p: any): string {
  const cli: any = p.cliente || {};
  const end: any = cli.enderecoJson || {};
  const nomeCli = (cli.nomeFantasia || cli.razaoSocial || '').toUpperCase();
  const codCli = cli.codigo ? `${String(cli.codigo).padStart(6, '0')} - ` : '';
  const linhaEnd = [end.rua, end.numero, end.complemento].filter(Boolean).join(', ').toUpperCase();
  const linhaCep = [end.cep, end.bairro, [end.cidade, end.uf].filter(Boolean).join('-')].filter(Boolean).join(', ').toUpperCase();

  const itensHtml = (p.itens || [])
    .map(
      (it: any, i: number) => `
        <tr class="${i % 2 ? 'odd' : 'even'}">
          <td class="cod">${esc(it.produto?.codigo || '')}</td>
          <td class="desc">${esc((it.descricao || '').toUpperCase())}</td>
          <td class="qtd">${qtd3(it.quantidade)}</td>
          <td class="un">${esc(it.unidade || '')}</td>
          <td class="obs">${esc((it.observacoes || '').toUpperCase())}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Espelho Pedido ${esc(p.numero)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { background: #fff; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; margin: 14px; color: #000; }
  .toolbar { margin-bottom: 8px; }
  .toolbar button { padding: 6px 14px; font-size: 12px; cursor: pointer; }
  .page { border: 1px solid #999; padding: 14px 18px; background: #fff; }
  .top { position: relative; }
  .top .emis { position: absolute; top: 0; right: 0; text-align: right; font-size: 9px; line-height: 1.5; }
  .head { display: flex; align-items: flex-start; justify-content: center; gap: 12px; text-align: center; }
  .head img { height: 46px; width: 46px; object-fit: contain; margin-top: 2px; }
  .head .co .nm { font-size: 15px; font-weight: bold; }
  .head .co .ad { font-size: 11px; line-height: 1.45; }
  hr.thick { border: none; border-top: 2px solid #000; margin: 8px 0; }
  .cli { text-align: center; }
  .cli .nm { font-size: 13px; font-weight: bold; }
  .cli .ad { font-size: 11px; line-height: 1.45; }
  .ped { display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; padding: 3px 0; }
  .ped .l { display: flex; gap: 26px; }
  table { width: 100%; border-collapse: collapse; }
  thead th { text-align: left; font-size: 11px; font-weight: bold; border-bottom: 2px solid #000; padding: 3px 6px; }
  thead th.qtd { text-align: right; }
  tbody td { padding: 3px 6px; font-size: 11px; }
  tbody tr.odd { background: #f2f2f2; }
  td.cod { font-weight: bold; white-space: nowrap; width: 70px; }
  td.qtd { text-align: right; white-space: nowrap; width: 80px; }
  td.un { width: 40px; }
  td.obs { width: 130px; }
  .pfoot { text-align: center; font-size: 9px; color: #333; margin-top: 14px; }
  @media print { .toolbar { display: none; } body { margin: 0; } .page { border: none; } }
  @page { size: A4; margin: 10mm; }
</style></head><body>
<div class="toolbar"><button onclick="window.print()">🖨️ Imprimir</button></div>
<div class="page">
  <div class="top">
    <div class="emis">Data Emissão: ${new Date().toLocaleDateString('pt-BR')}<br/>Página: 1</div>
    <div class="head">
      <img src="/logo-hetros-icone.png" onerror="this.style.display='none'" />
      <div class="co">
        <div class="nm">HETROS IMP. E EXP. LTDA</div>
        <div class="ad">AV DOUTOR GASTAO VIDIGAL, SN - PAV HFC BOX 19</div>
        <div class="ad">05316-900 - VILA LEOPOLDINA</div>
        <div class="ad">SAO PAULO-SP</div>
      </div>
    </div>
  </div>
  <hr class="thick" />
  <div class="cli">
    <div class="nm">${esc(codCli)}${esc(nomeCli)}</div>
    ${linhaEnd ? `<div class="ad">${esc(linhaEnd)}</div>` : ''}
    ${linhaCep ? `<div class="ad">${esc(linhaCep)}</div>` : ''}
  </div>
  <hr class="thick" />
  <div class="ped">
    <div class="l">
      <span>Pedido: ${String(p.numero ?? '').padStart(8, '0')} - 000001</span>
      <span>Venda: ${p.dataEntrega ? new Date(p.dataEntrega).toLocaleDateString('pt-BR') : ''}</span>
      <span>NFe: 0</span>
      <span>Referência: ${p.tipo === 'REPOSICAO' ? 'REPOSICAO' : esc(p.referencia || '')}</span>
    </div>
    <span>Itens: ${String((p.itens || []).length).padStart(3, '0')}</span>
  </div>
  <table>
    <thead><tr><th>Produto</th><th>Descrição</th><th class="qtd">Qtde</th><th>UN</th><th>Obs</th></tr></thead>
    <tbody>${itensHtml}</tbody>
  </table>
  <div class="pfoot">Impresso em: ${carimboAgora()}</div>
</div>
</body></html>`;
}

/** Busca o pedido e abre o Espelho para impressão. */
export async function imprimirEspelho(pedidoId: string) {
  const { data: p } = await api.get(`/pedidos/${pedidoId}`);
  abrirImpressao(htmlEspelho(p));
}

/* ─────────────────────── COMPROVANTE DE REPOSIÇÃO ─────────────────────── */
const MOTIVO_LABEL: Record<string, string> = {
  PRODUTO_AVARIADO: 'Produto avariado',
  FALTA: 'Faltou na entrega',
  TROCA: 'Troca',
  QUALIDADE: 'Qualidade abaixo',
  OUTRO: 'Outro',
};

export function htmlComprovanteReposicao(p: any): string {
  const cli: any = p.cliente || {};
  const end: any = cli.enderecoJson || {};
  const nomeCli = (cli.nomeFantasia || cli.razaoSocial || '').toUpperCase();
  const linhaEnd = [end.rua, end.numero, end.complemento].filter(Boolean).join(', ').toUpperCase();
  const linhaCep = [end.cep, end.bairro, [end.cidade, end.uf].filter(Boolean).join('-')].filter(Boolean).join(', ').toUpperCase();
  const motivo = MOTIVO_LABEL[p.motivoReposicao] || p.motivoReposicao || '—';
  const refOrigem = (p.observacoesNf || p.observacoes || '').match(/#\d+/)?.[0] || '';

  const itensHtml = (p.itens || [])
    .map(
      (it: any, i: number) => `
        <tr class="${i % 2 ? 'odd' : 'even'}">
          <td class="cod">${esc(it.produto?.codigo || '')}</td>
          <td>${esc((it.descricao || '').toUpperCase())}</td>
          <td class="qtd">${qtd3(it.quantidade)}</td>
          <td class="un">${esc(it.unidade || '')}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comprovante de Reposição — Pedido ${esc(p.numero)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { background: #fff; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; margin: 14px; color: #000; }
  .toolbar { margin-bottom: 8px; }
  .toolbar button { padding: 6px 14px; font-size: 12px; cursor: pointer; }
  .page { border: 1px solid #999; padding: 16px 20px; background: #fff; }
  .head { display: flex; align-items: flex-start; justify-content: center; gap: 12px; text-align: center; }
  .head img { height: 46px; width: 46px; object-fit: contain; margin-top: 2px; }
  .head .co .nm { font-size: 15px; font-weight: bold; }
  .head .co .ad { font-size: 11px; line-height: 1.45; }
  hr.thick { border: none; border-top: 2px solid #000; margin: 8px 0; }
  .titulo { text-align: center; font-size: 16px; font-weight: bold; letter-spacing: 1px; margin: 6px 0; }
  .cli { text-align: center; }
  .cli .nm { font-size: 13px; font-weight: bold; }
  .cli .ad { font-size: 11px; line-height: 1.45; }
  .meta { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; padding: 4px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  thead th { text-align: left; font-size: 11px; font-weight: bold; border-bottom: 2px solid #000; padding: 3px 6px; }
  thead th.qtd { text-align: right; }
  tbody td { padding: 3px 6px; font-size: 11px; }
  tbody tr.odd { background: #f2f2f2; }
  td.cod { font-weight: bold; white-space: nowrap; width: 70px; }
  td.qtd { text-align: right; white-space: nowrap; width: 90px; }
  td.un { width: 50px; }
  .declara { font-size: 11px; margin-top: 18px; line-height: 1.6; }
  .assin { display: flex; justify-content: space-between; margin-top: 40px; gap: 30px; }
  .assin .linha { flex: 1; border-top: 1px solid #000; text-align: center; font-size: 11px; padding-top: 4px; }
  .pfoot { text-align: center; font-size: 9px; color: #333; margin-top: 16px; }
  @media print { .toolbar { display: none; } body { margin: 0; } .page { border: none; } }
  @page { size: A4; margin: 12mm; }
</style></head><body>
<div class="toolbar"><button onclick="window.print()">🖨️ Imprimir</button></div>
<div class="page">
  <div class="head">
    <img src="/logo-hetros-icone.png" onerror="this.style.display='none'" />
    <div class="co">
      <div class="nm">HETROS IMP. E EXP. LTDA</div>
      <div class="ad">AV DOUTOR GASTAO VIDIGAL, SN - PAV HFC BOX 19</div>
      <div class="ad">05316-900 - VILA LEOPOLDINA · SAO PAULO-SP</div>
    </div>
  </div>
  <hr class="thick" />
  <div class="titulo">COMPROVANTE DE REPOSIÇÃO</div>
  <div class="cli">
    <div class="nm">${esc(nomeCli)}</div>
    ${linhaEnd ? `<div class="ad">${esc(linhaEnd)}</div>` : ''}
    ${linhaCep ? `<div class="ad">${esc(linhaCep)}</div>` : ''}
  </div>
  <div class="meta">
    <span>Reposição: ${String(p.numero ?? '').padStart(8, '0')}${refOrigem ? ` · Ref. ${esc(refOrigem)}` : ''}</span>
    <span>Motivo: ${esc(motivo)}</span>
    <span>Data: ${p.dataEntrega ? new Date(p.dataEntrega).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</span>
  </div>
  <table>
    <thead><tr><th>Produto</th><th>Descrição</th><th class="qtd">Qtde</th><th>UN</th></tr></thead>
    <tbody>${itensHtml}</tbody>
  </table>
  <p class="declara">Declaro ter recebido os produtos acima descritos, entregues em <b>reposição sem custo</b>, em perfeitas condições.</p>
  <div class="assin">
    <div class="linha">Recebedor (nome / assinatura)</div>
    <div class="linha">Documento / RG</div>
  </div>
  <div class="pfoot">Documento interno de reposição · sem valor fiscal · Impresso em: ${carimboAgora()}</div>
</div>
</body></html>`;
}

/** Busca o pedido e abre o Comprovante de Reposição para impressão. */
export async function imprimirComprovanteReposicao(pedidoId: string) {
  const { data: p } = await api.get(`/pedidos/${pedidoId}`);
  abrirImpressao(htmlComprovanteReposicao(p));
}

/* ─────────────────────────── CAPA DE ROTA ─────────────────────────── */
export interface CapaUnidade {
  bilhete?: number | string;
  horaDe?: string;
  horaAte?: string;
  familia?: string;
  nomeCliente?: string;
  endereco?: string;
  bairroCidadeUf?: string;
  tpFatura?: string;
  idVenda?: number | string;
}
export interface CapaDados {
  idEntrega?: number | string;
  cd?: string;
  empresa?: string;
  rotaLabel?: string;
  autorizacaoCarga?: string;
  dataCarga?: string;
  qtdEntregas?: number | string;
  pesoTotalKg?: number;
  unidades: CapaUnidade[];
}

export function htmlCapa(c: CapaDados): string {
  const linhas = (c.unidades || [])
    .map((u) => {
      const janela = [u.horaDe, u.horaAte].filter(Boolean).join(' - ');
      return `
        <tr>
          <td class="c1"><span class="bilhete">${esc(u.bilhete)}</span><br/><span class="hora">${esc(janela)}</span></td>
          <td class="c2"><span class="fam">${esc(u.familia)}</span><br/><span class="cli">${esc(u.nomeCliente)}</span></td>
          <td class="c3"><span class="end">${esc(u.endereco)}</span><br/><span class="bai">${esc(u.bairroCidadeUf)}</span></td>
          <td class="c4">${esc(u.tpFatura || 'NFE PADRAO')}</td>
          <td class="c5">${esc(u.idVenda)}</td>
          <td class="cx"></td><td class="cx"></td><td class="cx assin"></td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Capa de Rota ${esc(c.idEntrega)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { background: #fff; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; margin: 10px; color: #000; }
  .toolbar { margin-bottom: 8px; }
  .toolbar button { padding: 6px 14px; font-size: 12px; cursor: pointer; }
  .box { border: 2px solid #000; background: #fff; }
  .hd { display: flex; align-items: center; border-bottom: 2px solid #000; padding: 6px 10px; }
  .hd .logo { width: 120px; display: flex; align-items: center; gap: 6px; font-weight: bold; color: #2e7d32; font-size: 14px; }
  .hd .logo img { height: 34px; width: 34px; object-fit: contain; }
  .hd .mid { flex: 1; text-align: center; }
  .hd .mid h1 { margin: 0; font-size: 26px; font-weight: bold; letter-spacing: 1px; }
  .hd .mid .sub { font-size: 11px; margin-top: 2px; }
  .hd .rgt { width: 120px; }
  .rota { display: flex; align-items: center; justify-content: space-between; background: #d9d9d9; border-bottom: 2px solid #000; padding: 4px 10px; }
  .rota .id { font-size: 15px; font-weight: bold; }
  .rota .aut { font-size: 16px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead th { border: 1px solid #000; background: #efefef; font-size: 10px; padding: 2px 4px; vertical-align: middle; }
  tbody td { border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #888; padding: 3px 5px; font-size: 10px; vertical-align: top; }
  .c1 { width: 8%; } .c2 { width: 26%; } .c3 { width: 30%; } .c4 { width: 9%; } .c5 { width: 8%; }
  .cx { width: 6%; } .assin { width: 11%; }
  .bilhete { font-weight: bold; font-size: 12px; }
  .fam { color: #444; font-size: 9px; }
  .cli { font-weight: bold; }
  .bai { color: #333; }
  .foot { display: flex; justify-content: space-between; font-weight: bold; padding: 5px 10px; border-top: 2px solid #000; font-size: 11px; }
  .pfoot { text-align: center; font-size: 9px; color: #333; margin-top: 6px; }
  @media print { .toolbar { display: none; } body { margin: 0; } }
  @page { size: A4 landscape; margin: 8mm; }
</style></head><body>
<div class="toolbar"><button onclick="window.print()">🖨️ Imprimir</button></div>
<div class="box">
  <div class="hd">
    <div class="logo"><img src="/logo-hetros-icone.png" onerror="this.style.display='none'" />HETROS</div>
    <div class="mid">
      <h1>CAPA DE ROTA</h1>
      <div class="sub">Data Carga: ${dt(c.dataCarga)}</div>
      <div class="sub">Empresa: ${esc(c.empresa || 'Hetros')}</div>
    </div>
    <div class="rgt"></div>
  </div>
  <div class="rota">
    <span class="id">Id: ${esc(c.rotaLabel || c.idEntrega || '')}</span>
    <span class="aut">${esc(c.autorizacaoCarga || '')}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th rowspan="2">N°.Bilhete/<br/>Hr.Entrega</th>
        <th rowspan="2">Família/<br/>Nome do Cliente</th>
        <th rowspan="2">Endereço de Entrega</th>
        <th rowspan="2">Tp Fatura</th>
        <th rowspan="2">Id Venda</th>
        <th colspan="3">Caixas</th>
      </tr>
      <tr><th>Saídas</th><th>Entradas</th><th>Assinatura</th></tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="foot">
    <span>ENTREGAS: ${esc(c.qtdEntregas ?? (c.unidades || []).length)}</span>
    <span>PESO TOTAL: ${peso3(c.pesoTotalKg)}</span>
    <span>Autorização de Carga: ${esc(c.autorizacaoCarga || '')}</span>
  </div>
</div>
<div class="pfoot">${esc(c.cd || 'Hetros')} · Impresso em: ${carimboAgora()} · CapaRota</div>
</body></html>`;
}

/** Abre a Capa a partir de um objeto de dados já montado (Torre de Controle). */
export function imprimirCapaDados(c: CapaDados) {
  abrirImpressao(htmlCapa(c));
}

/** Busca a Capa de um Romaneio no backend e imprime (Controle de Carga). */
export async function imprimirCapaRomaneio(romaneioId: string) {
  const { data: c } = await api.get(`/carga/romaneio/${romaneioId}/capa`);
  abrirImpressao(htmlCapa(c));
}
