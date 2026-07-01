import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, RefreshCw, Printer, Scale, FileText, PackageCheck, Receipt } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { imprimirNotaSeparacao, imprimirCupomFiscal } from '../notaTermica';

const kg = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const dt = (v: any) => v ? new Date(v).toLocaleDateString('pt-BR') : '—';
const hoje = () => new Date().toISOString().split('T')[0];

const STATUS: Record<string, { label: string; dot: string; chip: string }> = {
  CONFIRMADO:   { label: 'Pendente',                 dot: 'bg-red-500',     chip: 'bg-red-500/15 text-red-300 border-red-500/40' },
  EM_SEPARACAO: { label: 'Separando',                dot: 'bg-sky-500',     chip: 'bg-sky-500/15 text-sky-300 border-sky-500/40' },
  SEPARADO:     { label: 'Liberado p/ Faturamento',  dot: 'bg-emerald-500', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  FATURADO:     { label: 'Faturado',                 dot: 'bg-slate-500',   chip: 'bg-slate-600/40 text-slate-300 border-slate-600' },
};
const ORDEM = ['CONFIRMADO', 'EM_SEPARACAO', 'SEPARADO', 'FATURADO'];
const st = (k: string) => STATUS[k] || STATUS.CONFIRMADO;

export default function Lider() {
  const { filialAtiva } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(hoje());
  const [linhas, setLinhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState<string>('TODOS');
  const [selId, setSelId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<any | null>(null);

  const carregar = useCallback(() => {
    if (!filialAtiva) return;
    setLoading(true);
    api.get(`/carga/${filialAtiva.id}/grade`, { params: { data } })
      .then(r => setLinhas((r.data as any[]).filter(l => ORDEM.includes(l.statusPedido))))
      .catch(() => setLinhas([])).finally(() => setLoading(false));
  }, [filialAtiva?.id, data]);
  useEffect(() => { carregar(); }, [carregar]);

  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    ORDEM.forEach(s => c[s] = linhas.filter(l => l.statusPedido === s).length);
    return c;
  }, [linhas]);
  const filtradas = useMemo(() => filtro === 'TODOS' ? linhas : linhas.filter(l => l.statusPedido === filtro), [linhas, filtro]);
  const totais = useMemo(() => ({
    qtd: filtradas.length,
    peso: filtradas.reduce((s, l) => s + (Number(l.peso) || 0), 0),
  }), [filtradas]);

  const selecionar = async (l: any) => {
    setSelId(l.id); setDetalhe(null);
    try { const { data } = await api.get(`/pedidos/${l.id}`); setDetalhe(data); } catch { /* noop */ }
  };
  const imprimirBilhete = async (l: any) => {
    try { const { data } = await api.get(`/pedidos/${l.id}`); imprimirNotaSeparacao(data); } catch { /* noop */ }
  };
  const imprimirCupom = async (l: any) => {
    try { const { data } = await api.get(`/pedidos/${l.id}`); imprimirCupomFiscal(data); } catch { /* noop */ }
  };
  const abrirSeparacao = (l: any) => navigate(`/logistica/operacional?pedido=${l.id}`);

  return (
    <div className="flex flex-col h-full bg-[#0b1220] text-slate-200 overflow-hidden">
      {/* Cabeçalho + filtros do líder */}
      <div className="bg-[#0e1729] border-b border-slate-800 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center"><ClipboardList className="h-5 w-5" /></div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Líder — Separação</h1>
            <p className="text-xs text-slate-500">Imprime as notas e acompanha o status da separação</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-400 font-semibold">Dt. Carregamento
            <input type="date" value={data} onChange={e => setData(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100" />
          </label>
          <button onClick={carregar} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-200 text-sm"><RefreshCw className="h-4 w-4 text-sky-400" /> Atualizar</button>
        </div>
      </div>

      {/* Chips de status */}
      <div className="bg-[#0e1729] border-b border-slate-800 px-5 py-2 flex items-center gap-2 shrink-0 overflow-x-auto">
        <button onClick={() => setFiltro('TODOS')} className={`px-3 py-1.5 rounded-full text-sm font-bold border whitespace-nowrap ${filtro === 'TODOS' ? 'bg-white text-slate-900 border-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>Todos ({linhas.length})</button>
        {ORDEM.map(s => (
          <button key={s} onClick={() => setFiltro(s)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border whitespace-nowrap ${filtro === s ? st(s).chip : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${st(s).dot}`} /> {st(s).label} ({contagem[s] || 0})
          </button>
        ))}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Grade de pedidos */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex justify-center py-16"><div className="animate-spin h-6 w-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>
            ) : filtradas.length === 0 ? (
              <div className="text-center text-slate-500 py-16"><ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-40" /> Nenhum pedido nesta data/status.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-800/40 text-slate-400 text-xs uppercase sticky top-0">
                  <tr>{['Entrega', 'Nome Fantasia', 'Peso Total', 'Período', 'Id Venda', 'Itens', 'Status', 'Ações'].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtradas.map(l => (
                    <tr key={l.id} onClick={() => selecionar(l)}
                      className={`border-t border-slate-800 cursor-pointer ${selId === l.id ? 'bg-sky-500/10' : 'hover:bg-sky-500/5'}`}>
                      <td className="px-3 py-2 text-slate-400">{dt(l.data)}</td>
                      <td className="px-3 py-2 font-semibold text-slate-100">{l.nomeFantasia}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">{l.peso > 0 ? kg(l.peso) : '—'}</td>
                      <td className="px-3 py-2 text-slate-400">{l.periodo || '—'}</td>
                      <td className="px-3 py-2 font-mono text-slate-300">{l.idVenda || l.numero}</td>
                      <td className="px-3 py-2 text-center text-slate-300">{l.qtdItens}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st(l.statusPedido).chip}`}>{st(l.statusPedido).label}</span></td>
                      <td className="px-3 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => imprimirCupom(l)} className="flex items-center gap-1 text-[11px] bg-sky-500/10 text-sky-300 border border-sky-500/30 px-2 py-1 rounded font-bold hover:bg-sky-500/20" title="Cupom fiscal (80mm)"><Receipt className="h-3 w-3" /> Nota</button>
                          <button onClick={() => imprimirBilhete(l)} className="flex items-center gap-1 text-[11px] bg-slate-700/40 text-slate-200 border border-slate-600 px-2 py-1 rounded font-bold hover:bg-slate-700" title="Bilhete de separação (80mm)"><Printer className="h-3 w-3" /> Bilhete</button>
                          {l.statusPedido !== 'FATURADO' && <button onClick={() => abrirSeparacao(l)} className="flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded font-bold hover:bg-emerald-500/20" title="Abrir separação/pesagem"><Scale className="h-3 w-3" /> Separar</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-800/40 font-bold sticky bottom-0">
                  <tr className="border-t border-slate-700">
                    <td className="px-3 py-2 text-slate-400" colSpan={2}>Total de pedidos: {totais.qtd}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-200">{kg(totais.peso)}</td>
                    <td colSpan={5}></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        {/* Painel Status da Separação */}
        <div className="w-[360px] shrink-0 border-l border-slate-800 bg-[#0e1729] flex flex-col">
          <div className="px-4 py-2.5 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wide">Status da Separação</div>
          {!selId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
              <PackageCheck className="h-12 w-12 opacity-30 mb-2" />
              <p className="text-sm">Selecione um pedido na grade para ver o status e imprimir a nota.</p>
            </div>
          ) : !detalhe ? (
            <div className="flex-1 flex justify-center items-center"><div className="animate-spin h-6 w-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>
          ) : (
            <div className="flex-1 overflow-auto p-4 space-y-3">
              <div>
                <p className="text-lg font-bold text-white leading-tight">{detalhe.cliente?.nomeFantasia || detalhe.cliente?.razaoSocial}</p>
                <p className="text-xs text-slate-500">Pedido nº {detalhe.numero} · {detalhe.itens?.length || 0} itens</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Campo label="Status" v={st(detalhe.status).label} />
                <Campo label="Entrega" v={dt(detalhe.dataEntrega)} />
                <Campo label="Período" v={detalhe.periodo || '—'} />
                <Campo label="Região" v={detalhe.regiao || '—'} />
              </div>
              {(detalhe.observacoes || detalhe.observacoesNf) && (
                <div className="bg-amber-500/15 border border-amber-500/40 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-bold uppercase text-amber-400">Observação</p>
                  <p className="text-sm font-bold text-amber-200">📌 {[detalhe.observacoes, detalhe.observacoesNf].filter(Boolean).join(' · ')}</p>
                </div>
              )}
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-800/40 text-slate-400"><tr>{['Produto', 'Qtde', 'Un'].map(h => <th key={h} className="px-2 py-1.5 text-left font-semibold">{h}</th>)}</tr></thead>
                  <tbody>
                    {(detalhe.itens || []).map((i: any) => (
                      <tr key={i.id} className={`border-t border-slate-800 ${i.cortado ? 'opacity-50 line-through' : ''}`}>
                        <td className="px-2 py-1 text-slate-200">{i.descricao}</td>
                        <td className="px-2 py-1 text-right font-mono text-slate-300">{kg(i.quantidade)}</td>
                        <td className="px-2 py-1 text-slate-400">{i.unidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button onClick={() => imprimirCupomFiscal(detalhe)} className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg px-4 py-2.5 text-sm font-bold"><Receipt className="h-4 w-4" /> Imprimir Nota / Cupom (80mm)</button>
                <button onClick={() => imprimirNotaSeparacao(detalhe)} className="flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold"><Printer className="h-4 w-4" /> Bilhete de Separação (80mm)</button>
                {detalhe.status !== 'FATURADO' && <button onClick={() => abrirSeparacao(detalhe)} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2.5 text-sm font-bold"><Scale className="h-4 w-4" /> Abrir Separação / Pesagem</button>}
                <button onClick={() => navigate('/fiscal/emitir')} className="flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold"><FileText className="h-4 w-4" /> Ir para Faturamento</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({ label, v }: { label: string; v: any }) {
  return <div className="bg-slate-800/40 rounded px-2 py-1.5"><p className="text-[9px] uppercase text-slate-500 font-bold">{label}</p><p className="text-slate-200 font-semibold truncate">{v}</p></div>;
}
