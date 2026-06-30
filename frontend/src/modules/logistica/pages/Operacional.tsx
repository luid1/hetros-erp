import { useState, useEffect, useMemo, useCallback } from 'react';
import { PackageCheck, RefreshCw, PackageSearch } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import SeparacaoPainel from './SeparacaoPesagem';

const R$ = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS = {
  CONFIRMADO:   { label: 'Pendente',                cor: 'bg-red-500',    chip: 'bg-red-100 text-red-700 border-red-300' },
  EM_SEPARACAO: { label: 'Separando',               cor: 'bg-blue-500',   chip: 'bg-blue-100 text-blue-700 border-blue-300' },
  SEPARADO:     { label: 'Liberado p/ Faturamento', cor: 'bg-emerald-500',chip: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  FATURADO:     { label: 'Faturado',                cor: 'bg-gray-500',   chip: 'bg-gray-200 text-gray-700 border-gray-300' },
} as const;
type StatusKey = keyof typeof STATUS;
const ORDEM: StatusKey[] = ['CONFIRMADO', 'EM_SEPARACAO', 'SEPARADO', 'FATURADO'];
const st = (k: string) => STATUS[k as StatusKey] || STATUS.CONFIRMADO;

export default function Operacional() {
  const { filialAtiva } = useAuth();
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [linhas, setLinhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState<StatusKey | 'TODOS'>('TODOS');
  const [selId, setSelId] = useState<string | null>(null);

  const carregar = useCallback(() => {
    if (!filialAtiva) return;
    setLoading(true);
    api.get(`/carga/${filialAtiva.id}/grade`, { params: { data } })
      .then(r => setLinhas((r.data as any[]).filter(l => ['CONFIRMADO', 'EM_SEPARACAO', 'SEPARADO', 'FATURADO'].includes(l.statusPedido))))
      .catch(() => setLinhas([]))
      .finally(() => setLoading(false));
  }, [filialAtiva?.id, data]);
  useEffect(() => { carregar(); }, [filialAtiva?.id, data]);

  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    ORDEM.forEach(s => c[s] = linhas.filter(l => l.statusPedido === s).length);
    return c;
  }, [linhas]);

  const filtradas = useMemo(
    () => filtro === 'TODOS' ? linhas : linhas.filter(l => l.statusPedido === filtro),
    [linhas, filtro]);

  const abrirPedido = async (l: any) => {
    setSelId(l.id);
    if (l.statusPedido === 'CONFIRMADO') {
      try { await api.patch(`/pedidos/${l.id}/status`, { status: 'EM_SEPARACAO' }); carregar(); } catch { /* segue */ }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden">
      {/* Cabeçalho */}
      <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0 relative">
        <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <PackageCheck className="h-6 w-6 text-emerald-500" /> Separação
        </h1>
        {/* Dia — grande e centralizado */}
        <label className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
          <span className="text-xl font-bold text-slate-400">Dia</span>
          <input type="date" value={data} onChange={e => setData(e.target.value)}
            className="border-2 border-slate-300 rounded-2xl px-5 py-2.5 text-3xl font-black text-slate-800 focus:ring-2 focus:ring-emerald-400" />
        </label>
        <button onClick={carregar} className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 px-3 py-2 rounded-lg text-slate-700 font-medium text-sm">
          <RefreshCw className="h-4 w-4 text-emerald-600" /> Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white border-b border-slate-200 px-5 py-2 flex items-center gap-2 shrink-0 overflow-x-auto">
        <button onClick={() => setFiltro('TODOS')}
          className={`px-3 py-1.5 rounded-full text-sm font-bold border whitespace-nowrap ${filtro === 'TODOS' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-300 text-slate-600'}`}>
          Todos ({linhas.length})
        </button>
        {ORDEM.map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border whitespace-nowrap ${filtro === s ? st(s).chip : 'bg-white border-slate-300 text-slate-600'}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${st(s).cor}`} /> {STATUS[s].label} ({contagem[s] || 0})
          </button>
        ))}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Fila de pedidos (esquerda) ── */}
        <div className="w-[400px] shrink-0 border-r-2 border-slate-200 bg-slate-50 flex flex-col">
          <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wide shrink-0">Fila de pedidos · {filtradas.length}</div>
          <div className="flex-1 overflow-auto px-3 pb-3 space-y-2">
            {loading ? (
              <div className="flex justify-center py-16"><div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>
            ) : filtradas.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-16 px-4">
                <PackageCheck className="h-10 w-10 mx-auto mb-2 text-slate-200" />
                Nenhum pedido para separar nesta data. Aprove e roteirize pedidos primeiro.
              </div>
            ) : filtradas.map(l => {
              const sel = selId === l.id;
              return (
                <button key={l.id} onClick={() => abrirPedido(l)}
                  className={`w-full text-left bg-white rounded-2xl p-5 border-2 shadow-sm active:scale-[0.99] transition-transform
                    ${sel ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-transparent hover:border-slate-300'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xl font-black text-slate-800 leading-tight truncate">{l.nomeFantasia}</p>
                    <span className={`shrink-0 px-2 py-1 rounded-full text-[11px] font-bold border ${st(l.statusPedido).chip}`}>{st(l.statusPedido).label}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-base text-slate-500">
                    <span>Pedido nº {l.idVenda || l.numero} · {l.qtdItens} itens</span>
                    <span className="font-bold text-slate-700">{R$(l.valorTotal)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Painel de separação (direita) ── */}
        <div className="flex-1 min-w-0">
          {selId ? (
            <SeparacaoPainel pedidoId={selId} onMudou={carregar} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <PackageSearch className="h-16 w-16 text-slate-200 mb-3" />
              <p className="text-xl font-bold text-slate-500">Selecione um pedido na fila</p>
              <p className="text-sm mt-1">Toque num pedido à esquerda para separar e pesar os itens.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
