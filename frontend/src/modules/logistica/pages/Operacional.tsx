import { useState, useEffect, useMemo, useCallback } from 'react';
import { PackageCheck, RefreshCw, Check, Printer, Truck, Scale } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import SeparacaoPesagem from './SeparacaoPesagem';

const R$ = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Status de separação (mapeado do status do pedido)
const STATUS = {
  CONFIRMADO:   { label: 'Pendente',                cor: 'bg-red-600',    chip: 'bg-red-100 text-red-700 border-red-300',       row: 'bg-red-50' },
  EM_SEPARACAO: { label: 'Separando a Mercadoria',  cor: 'bg-blue-600',   chip: 'bg-blue-100 text-blue-700 border-blue-300',    row: 'bg-blue-50' },
  SEPARADO:     { label: 'Liberado p/ Faturamento', cor: 'bg-green-600',  chip: 'bg-green-100 text-green-700 border-green-300', row: 'bg-green-50' },
  FATURADO:     { label: 'Faturado',                cor: 'bg-gray-700',   chip: 'bg-gray-200 text-gray-700 border-gray-300',    row: 'bg-gray-100' },
} as const;
type StatusKey = keyof typeof STATUS;
const ORDEM: StatusKey[] = ['CONFIRMADO', 'EM_SEPARACAO', 'SEPARADO', 'FATURADO'];

export default function Operacional() {
  const { filialAtiva } = useAuth();
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [linhas, setLinhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState<StatusKey | 'TODOS'>('TODOS');
  const [selId, setSelId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<any>(null);
  const [acaoLoading, setAcaoLoading] = useState(false);
  const [separandoId, setSeparandoId] = useState<string | null>(null);

  const carregar = useCallback(() => {
    if (!filialAtiva) return;
    setLoading(true);
    api.get(`/carga/${filialAtiva.id}/grade`, { params: { data } })
      .then(r => setLinhas((r.data as any[]).filter(l => ['CONFIRMADO', 'EM_SEPARACAO', 'SEPARADO', 'FATURADO'].includes(l.statusPedido))))
      .catch(() => setLinhas([]))
      .finally(() => setLoading(false));
  }, [filialAtiva?.id, data]);

  useEffect(() => { carregar(); }, [filialAtiva?.id, data]);

  // Carrega itens do pedido selecionado
  useEffect(() => {
    if (!selId) { setDetalhe(null); return; }
    api.get(`/pedidos/${selId}`).then(r => setDetalhe(r.data)).catch(() => setDetalhe(null));
  }, [selId]);

  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    ORDEM.forEach(s => c[s] = linhas.filter(l => l.statusPedido === s).length);
    return c;
  }, [linhas]);

  const filtradas = useMemo(
    () => filtro === 'TODOS' ? linhas : linhas.filter(l => l.statusPedido === filtro),
    [linhas, filtro]);

  const mudarStatus = async (novoStatus: string) => {
    if (!selId) return;
    setAcaoLoading(true);
    try {
      await api.patch(`/pedidos/${selId}/status`, { status: novoStatus });
      carregar();
      const r = await api.get(`/pedidos/${selId}`);
      setDetalhe(r.data);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Erro ao mudar status.');
    } finally { setAcaoLoading(false); }
  };

  const abrirSeparacao = async (ped: any) => {
    if (ped.status === 'CONFIRMADO') {
      try { await api.patch(`/pedidos/${ped.id}/status`, { status: 'EM_SEPARACAO' }); } catch { /* segue */ }
    }
    setSeparandoId(ped.id);
  };

  const imprimirEspelho = async (pedidoId: string) => {
    const { data: p } = await api.get(`/pedidos/${pedidoId}`);
    const end: any = p.cliente?.enderecoJson || {};
    const itensHtml = (p.itens || []).map((it: any) => `
      <tr><td>${it.produto?.codigo || ''}</td><td>${it.descricao}</td>
      <td style="text-align:right">${Number(it.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</td>
      <td>${it.unidade}</td><td></td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Espelho ${p.numero}</title>
<style>body{font-family:Arial;font-size:12px;margin:18px}.center{text-align:center}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{padding:3px 6px;font-size:11px;border-bottom:1px solid #ccc;text-align:left}th{border-bottom:2px solid #000}.linha{display:flex;justify-content:space-between;border-top:2px solid #000;border-bottom:1px solid #000;padding:3px 0;font-weight:bold;margin-top:6px}@media print{button{display:none}}</style></head><body>
<button onclick="window.print()" style="margin-bottom:8px;padding:6px 12px">🖨️ Imprimir</button>
<div class="center"><b style="font-size:16px">🍃 HETROS IMP. E EXP. LTDA</b><br>AV DOUTOR GASTAO VIDIGAL, SN - BOX 19 · SAO PAULO-SP</div>
<h2 class="center">${(p.cliente?.nomeFantasia || p.cliente?.razaoSocial || '').toUpperCase()}</h2>
<p class="center">${[end.rua, end.numero].filter(Boolean).join(', ')} · ${end.bairro || ''} · ${end.cidade || ''}-${end.uf || ''}</p>
<div class="linha"><span>Pedido: ${String(p.numero).padStart(8, '0')}</span><span>Itens: ${String((p.itens || []).length).padStart(3, '0')}</span></div>
<table><thead><tr><th>Produto</th><th>Descrição</th><th>Qtde</th><th>UN</th><th>Obs</th></tr></thead><tbody>${itensHtml}</tbody></table>
</body></html>`;
    const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); }
  };

  const st = (k: string) => STATUS[k as StatusKey] || STATUS.CONFIRMADO;

  return (
    <div className="flex flex-col h-full bg-gray-100 text-[11px] overflow-hidden">
      {/* Cabeçalho */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between shrink-0">
        <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <PackageCheck className="h-5 w-5 text-sky-500" /> Operacional · Separação
        </h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-gray-600 font-semibold text-xs">
            Dt. Carregamento:
            <input type="date" value={data} onChange={e => setData(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs" />
          </label>
          <button onClick={carregar} className="flex items-center gap-1 bg-white border border-gray-300 hover:bg-blue-50 px-3 py-1.5 rounded text-gray-700 font-medium text-xs">
            <RefreshCw className="h-3.5 w-3.5 text-blue-600" /> Atualizar
          </button>
        </div>
      </div>

      {/* Chips de status */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2 shrink-0">
        <button onClick={() => setFiltro('TODOS')}
          className={`px-2.5 py-1 rounded text-xs font-bold border ${filtro === 'TODOS' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300 text-gray-600'}`}>
          Todos ({linhas.length})
        </button>
        {ORDEM.map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border ${filtro === s ? st(s).chip : 'bg-white border-gray-300 text-gray-600'}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${st(s).cor}`} />
            {STATUS[s].label} ({contagem[s] || 0})
          </button>
        ))}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Tabela de pedidos */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-16"><div className="animate-spin h-6 w-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="bg-gray-200 sticky top-0 z-10 text-[10px]">
                <tr>
                  {['Entrega', 'Nome Fantasia', 'Peso (Kg)', 'Itens', 'Período', 'Rota', 'Motorista', 'Id Venda', 'Valor', 'Status'].map(h => (
                    <th key={h} className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map(l => (
                  <tr key={l.id} onClick={() => setSelId(l.id)}
                    className={`border-b border-gray-200 cursor-pointer ${selId === l.id ? 'ring-2 ring-sky-400' : ''} ${st(l.statusPedido).row} hover:brightness-95`}>
                    <td className="px-2 py-1.5 border-r border-gray-200 whitespace-nowrap">{l.data ? new Date(l.data).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-2 py-1.5 border-r border-gray-200 font-semibold text-gray-900 truncate max-w-[200px]">{l.nomeFantasia}</td>
                    <td className="px-2 py-1.5 border-r border-gray-200 text-right">{Number(l.pesoKg).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</td>
                    <td className="px-2 py-1.5 border-r border-gray-200 text-center">{l.qtdItens}</td>
                    <td className="px-2 py-1.5 border-r border-gray-200">{l.periodo === 'TARDE' ? 'TARDE' : 'MANHÃ'}</td>
                    <td className="px-2 py-1.5 border-r border-gray-200">{l.rota || '—'}</td>
                    <td className="px-2 py-1.5 border-r border-gray-200 truncate max-w-[120px]">{l.motorista || '—'}</td>
                    <td className="px-2 py-1.5 border-r border-gray-200">{l.idVenda || l.numero}</td>
                    <td className="px-2 py-1.5 border-r border-gray-200 text-right font-mono">{R$(l.valorTotal)}</td>
                    <td className="px-2 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${st(l.statusPedido).chip}`}>{st(l.statusPedido).label}</span>
                    </td>
                  </tr>
                ))}
                {filtradas.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    <PackageCheck className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                    Nenhum pedido para separar nesta data. Aprove e roteirize pedidos primeiro.
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Painel direito: status da separação + itens */}
        <div className="w-80 shrink-0 border-l-2 border-gray-300 bg-white flex flex-col">
          <div className="bg-gray-200 px-3 py-2 border-b border-gray-300 font-bold text-gray-800 text-xs">Status da Separação</div>
          {!detalhe ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-xs px-4 text-center">
              Selecione um pedido na lista para ver os itens e separar.
            </div>
          ) : (
            <>
              <div className="px-3 py-2 border-b border-gray-200 space-y-1 text-[11px]">
                <p className="font-bold text-gray-900">{detalhe.cliente?.nomeFantasia || detalhe.cliente?.razaoSocial}</p>
                <div className="flex justify-between text-gray-500"><span>Pedido</span><strong>nº {detalhe.numero}</strong></div>
                <div className="flex justify-between text-gray-500"><span>Andamento</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${st(detalhe.status).chip}`}>{st(detalhe.status).label}</span>
                </div>
                <div className="flex justify-between text-gray-500"><span>Valor total</span><strong className="text-green-700">{R$(Number(detalhe.valorTotal))}</strong></div>
              </div>

              {/* Itens a separar */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-[10px]">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr><th className="px-2 py-1 text-left">Cód</th><th className="px-2 py-1 text-left">Produto</th><th className="px-2 py-1 text-right">Qtde</th><th className="px-2 py-1">UN</th></tr>
                  </thead>
                  <tbody>
                    {(detalhe.itens || []).map((it: any) => (
                      <tr key={it.id} className="border-b border-gray-100">
                        <td className="px-2 py-1 font-mono text-gray-500">{it.produto?.codigo}</td>
                        <td className="px-2 py-1">{it.descricao}</td>
                        <td className="px-2 py-1 text-right">{Number(it.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</td>
                        <td className="px-2 py-1 text-center text-gray-500">{it.unidade}</td>
                      </tr>
                    ))}
                    {(detalhe.itens || []).length === 0 && (
                      <tr><td colSpan={4} className="px-2 py-4 text-center text-gray-400">Pedido sem itens.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Ações */}
              <div className="border-t border-gray-200 p-3 space-y-2 shrink-0">
                <button onClick={() => imprimirEspelho(detalhe.id)} className="w-full flex items-center justify-center gap-1 bg-white border border-gray-300 hover:bg-gray-50 rounded px-2 py-1.5 text-xs font-semibold text-gray-700">
                  <Printer className="h-3.5 w-3.5" /> Imprimir Espelho
                </button>
                {(detalhe.status === 'CONFIRMADO' || detalhe.status === 'EM_SEPARACAO') && (
                  <button onClick={() => abrirSeparacao(detalhe)} disabled={acaoLoading}
                    className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2 py-2.5 text-sm font-bold disabled:opacity-40">
                    <Scale className="h-4 w-4" /> {detalhe.status === 'CONFIRMADO' ? 'Iniciar Separação / Pesar' : 'Continuar Separação / Pesar'}
                  </button>
                )}
                {detalhe.status === 'EM_SEPARACAO' && (
                  <button onClick={() => mudarStatus('SEPARADO')} disabled={acaoLoading}
                    className="w-full flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white rounded px-2 py-2 text-xs font-bold disabled:opacity-40">
                    <Check className="h-3.5 w-3.5" /> Liberar para Faturamento (sem pesar)
                  </button>
                )}
                {detalhe.status === 'SEPARADO' && (
                  <div className="text-center text-green-700 text-xs font-bold flex items-center justify-center gap-1 py-1">
                    <Truck className="h-4 w-4" /> Liberado — pronto para faturar
                  </div>
                )}
                {detalhe.status === 'EM_SEPARACAO' && (
                  <button onClick={() => mudarStatus('CONFIRMADO')} disabled={acaoLoading}
                    className="w-full text-[10px] text-gray-400 hover:text-gray-600">↩ voltar para Pendente</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {separandoId && (
        <SeparacaoPesagem
          pedidoId={separandoId}
          onClose={() => setSeparandoId(null)}
          onFinalizado={() => { carregar(); if (selId) api.get(`/pedidos/${selId}`).then(r => setDetalhe(r.data)).catch(() => {}); }}
        />
      )}
    </div>
  );
}
