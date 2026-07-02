import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageCheck, RefreshCw, PackageSearch, Printer, Search, ChevronLeft, ChevronRight, X, Delete } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import SeparacaoPainel from './SeparacaoPesagem';
import { imprimirNotaSeparacao } from '../notaTermica';

const kg3 = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const dtBR = (v: any) => v ? new Date(v).toLocaleDateString('pt-BR') : '';

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
  const [busca, setBusca] = useState('');
  const [keypad, setKeypad] = useState(false);
  const [params] = useSearchParams();

  // Veio da tela do Líder com um pedido específico → já abre ele
  useEffect(() => { const p = params.get('pedido'); if (p) setSelId(p); }, [params]);

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

  const filtradas = useMemo(() => {
    let r = filtro === 'TODOS' ? linhas : linhas.filter(l => l.statusPedido === filtro);
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      r = r.filter(l => String(l.idVenda ?? l.numero ?? '').includes(q) || (l.nomeFantasia || '').toLowerCase().includes(q));
    }
    return r;
  }, [linhas, filtro, busca]);

  // Navegação anterior / próximo na fila
  const irPara = (delta: number) => {
    if (filtradas.length === 0) return;
    const idx = filtradas.findIndex(l => l.id === selId);
    const nextIdx = idx < 0 ? (delta > 0 ? 0 : filtradas.length - 1) : Math.min(filtradas.length - 1, Math.max(0, idx + delta));
    abrirPedido(filtradas[nextIdx]);
  };

  const abrirPedido = async (l: any) => {
    setSelId(l.id);
    if (l.statusPedido === 'CONFIRMADO') {
      try { await api.patch(`/pedidos/${l.id}/status`, { status: 'EM_SEPARACAO' }); carregar(); } catch { /* segue */ }
    }
  };

  // Imprime a notinha térmica (80mm) do pedido — busca os itens antes
  const imprimirNota = async (e: React.MouseEvent, l: any) => {
    e.stopPropagation();
    try { const { data } = await api.get(`/pedidos/${l.id}`); imprimirNotaSeparacao(data); } catch { /* noop */ }
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
          {/* Barra: pesquisar (lupa) + navegação */}
          <div className="px-3 py-2 shrink-0 flex items-center gap-2 border-b border-slate-200">
            <button onClick={() => setKeypad(true)}
              className="flex items-center gap-2 flex-1 min-w-0 bg-white border-2 border-slate-300 hover:border-emerald-400 rounded-xl px-3 py-2.5 text-left active:scale-[0.98] transition-transform">
              <Search className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className={`text-lg font-bold truncate ${busca ? 'text-slate-800' : 'text-slate-400'}`}>{busca || 'Pesquisar nº'}</span>
            </button>
            {busca && <button onClick={() => setBusca('')} className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-white border-2 border-slate-300 text-slate-500 active:scale-95"><X className="h-5 w-5" /></button>}
            <button onClick={() => irPara(-1)} className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-white border-2 border-slate-300 text-slate-700 hover:border-emerald-400 active:scale-95" title="Anterior"><ChevronLeft className="h-6 w-6" /></button>
            <button onClick={() => irPara(1)} className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-white border-2 border-slate-300 text-slate-700 hover:border-emerald-400 active:scale-95" title="Próximo"><ChevronRight className="h-6 w-6" /></button>
          </div>
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
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-slate-500">
                    <span>Pedido nº <b className="text-slate-700">{l.idVenda || l.numero}</b></span>
                    <span>{l.qtdItens} itens</span>
                    {l.peso > 0 && <span>{kg3(l.peso)} kg</span>}
                    {l.data && <span>entrega {dtBR(l.data)}</span>}
                    {l.periodo && <span>{l.periodo}</span>}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <span onClick={(e) => imprimirNota(e, l)} role="button"
                      className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 border border-sky-300 rounded-lg px-2.5 py-1">
                      <Printer className="h-3.5 w-3.5" /> Nota
                    </span>
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

      {keypad && (
        <TecladoNumerico
          valorInicial={busca}
          onClose={() => setKeypad(false)}
          onBuscar={(v) => {
            setBusca(v);
            setKeypad(false);
            // se achou exatamente 1 pedido, já abre
            const achados = linhas.filter(l => String(l.idVenda ?? l.numero ?? '').includes(v.trim()));
            if (v.trim() && achados.length >= 1) abrirPedido(achados[0]);
          }}
        />
      )}
    </div>
  );
}

// ─────────── Teclado numérico (touch) ───────────
function TecladoNumerico({ valorInicial, onClose, onBuscar }: {
  valorInicial: string; onClose: () => void; onBuscar: (v: string) => void;
}) {
  const [v, setV] = useState(valorInicial || '');
  const tecla = (d: string) => setV(p => (p + d).slice(0, 12));
  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Search className="h-5 w-5 text-emerald-600" /> Pesquisar pedido</h2>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500"><X className="h-5 w-5" /></button>
        </div>
        {/* Visor */}
        <div className="border-2 border-slate-300 rounded-2xl px-4 py-3 mb-4 text-center">
          <p className="text-4xl font-black tabular-nums text-slate-800 min-h-[44px]">{v || <span className="text-slate-300">nº</span>}</p>
        </div>
        {/* Teclas */}
        <div className="grid grid-cols-3 gap-2.5">
          {teclas.map(t => (
            <button key={t} onClick={() => tecla(t)} className="h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-3xl font-black text-slate-800 transition-transform">{t}</button>
          ))}
          <button onClick={() => setV('')} className="h-16 rounded-2xl bg-amber-100 hover:bg-amber-200 active:scale-95 text-lg font-black text-amber-700">C</button>
          <button onClick={() => tecla('0')} className="h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-3xl font-black text-slate-800">0</button>
          <button onClick={() => setV(p => p.slice(0, -1))} className="h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-700"><Delete className="h-7 w-7" /></button>
        </div>
        <button onClick={() => onBuscar(v)}
          className="mt-4 w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xl font-black flex items-center justify-center gap-2 transition-transform">
          <Search className="h-6 w-6" /> Buscar
        </button>
      </div>
    </div>
  );
}
