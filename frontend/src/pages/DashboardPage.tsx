import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  Package, AlertTriangle, TrendingUp, TrendingDown, Receipt, Activity, RefreshCw,
  PackageCheck, Wallet, Scale, Users, Boxes, ArrowUpRight, ArrowDownRight, ChevronRight,
  CircleDollarSign, Landmark, Percent, ShoppingCart,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell,
} from 'recharts';

/* ─────────────── Formatação ─────────────── */
const R$ = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const R$c = (v: number) => {
  const a = Math.abs(v || 0);
  if (a >= 1_000_000) return `${v < 0 ? '-' : ''}R$ ${(a / 1e6).toFixed(2)} mi`;
  if (a >= 1_000) return `${v < 0 ? '-' : ''}R$ ${(a / 1e3).toFixed(1)} mil`;
  return R$(v);
};
const pct = (v: number) => `${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const num = (v: number) => (v || 0).toLocaleString('pt-BR');
const kg = (v: number) => `${(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`;

/* ─────────────── Tipos ─────────────── */
interface Aging { vencido: number; ate7: number; ate30: number; mais30: number; total: number; qtd: number }
interface Dash {
  periodo: string; periodoLabel: string;
  kpis: Record<string, number>;
  financeiro: {
    faturamento: number; faturamentoAnterior: number; faturamentoDelta: number;
    nfes: number; ticketMedio: number; margemBruta: number; cmv: number; resultadoOperacional: number;
    receber: Aging; pagar: Aging; inadimplenciaPct: number; saldoProjetado: number;
  };
  estoque: { itensComSaldo: number; valorEstoque: number; validade: { vencido: number; ate3: number; ate7: number }; perdaValor: number; perdaQtd: number; rupturas: number; produtosAtivos: number };
  topClientes: { clienteId: string; nome: string; valor: number; pedidos: number }[];
  topProdutos: { produtoId: string; codigo: string; descricao: string; qtd: number; custo: number }[];
  pedidosPorStatus: Record<string, number>;
  serieFaturamento: { dia: string; label: string; valor: number }[];
  fluxoDia: { entradas: number; faturados: number; romaneios: number; entregues: number };
}

const PERIODOS: { key: 'hoje' | 'semana' | 'mes'; label: string }[] = [
  { key: 'hoje', label: 'Hoje' }, { key: 'semana', label: '7 dias' }, { key: 'mes', label: 'Mês' },
];

const STATUS_INFO: Record<string, { label: string; cor: string; rota: string }> = {
  RASCUNHO: { label: 'Rascunho', cor: '#64748b', rota: '/logistica/pedidos' },
  CONFIRMADO: { label: 'Pendente', cor: '#f43f5e', rota: '/logistica/pedidos' },
  EM_SEPARACAO: { label: 'Separando', cor: '#0ea5e9', rota: '/logistica/operacional' },
  SEPARADO: { label: 'Liberado', cor: '#10b981', rota: '/logistica/carga' },
  FATURADO: { label: 'Faturado', cor: '#8b5cf6', rota: '/fiscal/gestao' },
  ENTREGUE: { label: 'Entregue', cor: '#14b8a6', rota: '/logistica/torre' },
  CANCELADO: { label: 'Cancelado', cor: '#475569', rota: '/logistica/pedidos' },
};

/* ─────────────── Componentes base ─────────────── */
function Delta({ v }: { v: number }) {
  if (!v) return <span className="text-[11px] text-slate-500">estável</span>;
  const up = v > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{pct(Math.abs(v))}
    </span>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone = 'slate', delta, onClick }: {
  icon: any; label: string; value: string; sub?: React.ReactNode; tone?: string; delta?: number; onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    sky: 'text-sky-300 bg-sky-500/10 border-sky-400/20', emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20',
    rose: 'text-rose-300 bg-rose-500/10 border-rose-400/20', amber: 'text-amber-300 bg-amber-500/10 border-amber-400/20',
    violet: 'text-violet-300 bg-violet-500/10 border-violet-400/20', teal: 'text-teal-300 bg-teal-500/10 border-teal-400/20',
    blue: 'text-blue-300 bg-blue-500/10 border-blue-400/20', indigo: 'text-indigo-300 bg-indigo-500/10 border-indigo-400/20',
    slate: 'text-slate-400 bg-white/[0.04] border-white/[0.08]',
  };
  return (
    <button
      onClick={onClick} disabled={!onClick}
      className={`card p-4 text-left relative overflow-hidden group ${onClick ? 'glass-hover cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className={`h-8 w-8 rounded-lg border flex items-center justify-center ${tones[tone]}`}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        {delta !== undefined && <Delta v={delta} />}
      </div>
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] truncate">{label}</p>
      <p className="text-2xl font-extrabold text-white tracking-tight tabular-nums truncate mt-0.5">{value}</p>
      {sub && <div className="text-[11px] text-slate-500 mt-1 truncate">{sub}</div>}
      {onClick && <ChevronRight className="h-4 w-4 text-slate-600 absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
    </button>
  );
}

function Secao({ icon: Icon, titulo, cor, children, acao }: { icon: any; titulo: string; cor: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.14em] flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" style={{ color: cor }} /> {titulo}
        </h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

/* Tooltip dark reutilizável p/ Recharts */
const tipStyle = { background: '#0d1420', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12, color: '#e2e8f0' };

/* ─────────────── Página ─────────────── */
export default function DashboardPage() {
  const { filialAtiva } = useAuth();
  const navigate = useNavigate();
  const [d, setD] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<'hoje' | 'semana' | 'mes'>('hoje');
  const [ordProduto, setOrdProduto] = useState<'custo' | 'qtd'>('custo');

  const carregar = useCallback(() => {
    setLoading(true);
    api.get('/dashboard', { params: { filialId: filialAtiva?.id, periodo } })
      .then(r => setD(r.data)).catch(() => setD(null)).finally(() => setLoading(false));
  }, [filialAtiva?.id, periodo]);
  useEffect(() => { carregar(); }, [carregar]);

  const f = d?.financeiro;
  const e = d?.estoque;

  const produtosOrdenados = useMemo(() => {
    if (!d?.topProdutos) return [];
    return [...d.topProdutos].sort((a, b) => ordProduto === 'custo' ? b.custo - a.custo : b.qtd - a.qtd);
  }, [d?.topProdutos, ordProduto]);

  const statusData = useMemo(() =>
    Object.entries(d?.pedidosPorStatus || {}).filter(([, v]) => v > 0)
      .map(([k, v]) => ({ status: k, label: STATUS_INFO[k]?.label || k, valor: v, cor: STATUS_INFO[k]?.cor || '#64748b' })),
    [d?.pedidosPorStatus]);

  const maxCliente = Math.max(1, ...(d?.topClientes || []).map(c => c.valor));

  return (
    <div className="p-6 space-y-7">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {filialAtiva ? `${filialAtiva.codigo} — ${filialAtiva.nome}` : 'Todas as filiais'} ·{' '}
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
            {PERIODOS.map(p => (
              <button key={p.key} onClick={() => setPeriodo(p.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${periodo === p.key ? 'bg-sky-500/20 text-sky-200' : 'text-slate-400 hover:text-slate-200'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={carregar} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-200 text-sm">
            <RefreshCw className={`h-4 w-4 text-sky-400 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
      </div>

      {/* ═══ FINANCEIRO ═══ */}
      <Secao icon={CircleDollarSign} titulo={`Financeiro · ${d?.periodoLabel || ''}`} cor="#34d399">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <Kpi icon={TrendingUp} label="Faturamento" value={R$c(f?.faturamento ?? 0)} tone="emerald" delta={f?.faturamentoDelta}
            sub={`${num(f?.nfes ?? 0)} NF-e emitidas`} onClick={() => navigate('/fiscal/gestao')} />
          <Kpi icon={Receipt} label="Ticket Médio" value={R$c(f?.ticketMedio ?? 0)} tone="teal" sub="por nota" />
          <Kpi icon={Percent} label="Margem Bruta" value={pct(f?.margemBruta ?? 0)} tone={(f?.margemBruta ?? 0) >= 0 ? 'emerald' : 'rose'}
            sub="do DRE realizado" onClick={() => navigate('/financeiro/dre')} />
          <Kpi icon={Wallet} label="A Receber" value={R$c(f?.receber.total ?? 0)} tone="blue"
            sub={<span className={f?.receber.vencido ? 'text-rose-400' : ''}>{f?.receber.vencido ? `${R$c(f.receber.vencido)} vencido` : `${num(f?.receber.qtd ?? 0)} títulos`}</span>}
            onClick={() => navigate('/financeiro/receber')} />
          <Kpi icon={Landmark} label="A Pagar" value={R$c(f?.pagar.total ?? 0)} tone="amber"
            sub={<span className={f?.pagar.vencido ? 'text-rose-400' : ''}>{f?.pagar.vencido ? `${R$c(f.pagar.vencido)} vencido` : `${num(f?.pagar.qtd ?? 0)} títulos`}</span>}
            onClick={() => navigate('/financeiro/pagar')} />
          <Kpi icon={Scale} label="Saldo Projetado" value={R$c(f?.saldoProjetado ?? 0)} tone={(f?.saldoProjetado ?? 0) >= 0 ? 'emerald' : 'rose'}
            sub="receber − pagar" />
        </div>

        {/* Faturamento + aging */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="card p-5 xl:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-100 text-sm">Faturamento — série diária</h3>
              <span className="text-[11px] text-slate-500">{d?.serieFaturamento.length} dias</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={d?.serieFaturamento || []} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="gFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => R$c(v).replace('R$ ', '')} width={54} />
                <Tooltip contentStyle={tipStyle} formatter={(v: any) => [R$(v), 'Faturado']} labelStyle={{ color: '#94a3b8' }} cursor={{ stroke: 'rgba(52,211,153,0.3)' }} />
                <Area type="monotone" dataKey="valor" stroke="#34d399" strokeWidth={2} fill="url(#gFat)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Aging a receber/pagar */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-100 text-sm mb-3">Vencimentos (aging)</h3>
            {(['receber', 'pagar'] as const).map((tipo) => {
              const ag = f?.[tipo]; if (!ag) return null;
              const faixas = [
                { k: 'vencido', label: 'Vencido', v: ag.vencido, cor: '#f43f5e' },
                { k: 'ate7', label: '0–7 dias', v: ag.ate7, cor: '#f59e0b' },
                { k: 'ate30', label: '8–30 dias', v: ag.ate30, cor: '#0ea5e9' },
                { k: 'mais30', label: '+30 dias', v: ag.mais30, cor: '#64748b' },
              ];
              return (
                <div key={tipo} className="mb-4 last:mb-0 cursor-pointer" onClick={() => navigate(tipo === 'receber' ? '/financeiro/receber' : '/financeiro/pagar')}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{tipo === 'receber' ? 'A Receber' : 'A Pagar'}</span>
                    <span className="text-xs font-bold text-slate-200 tabular-nums">{R$c(ag.total)}</span>
                  </div>
                  <div className="flex h-2.5 rounded-full overflow-hidden bg-white/[0.04]">
                    {faixas.map(fx => (ag.total > 0 && fx.v > 0) ? (
                      <div key={fx.k} title={`${fx.label}: ${R$(fx.v)}`} style={{ width: `${(fx.v / ag.total) * 100}%`, background: fx.cor }} />
                    ) : null)}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                    {faixas.filter(fx => fx.v > 0).map(fx => (
                      <span key={fx.k} className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ background: fx.cor }} />{fx.label} {R$c(fx.v)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Inadimplência</span>
              <span className={`font-bold ${(f?.inadimplenciaPct ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{pct(f?.inadimplenciaPct ?? 0)}</span>
            </div>
          </div>
        </div>
      </Secao>

      {/* ═══ ESTOQUE / WMS ═══ */}
      <Secao icon={Boxes} titulo="Estoque & WMS" cor="#38bdf8">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <Kpi icon={Package} label="Itens c/ Saldo" value={num(e?.itensComSaldo ?? 0)} tone="sky" sub={`de ${num(e?.produtosAtivos ?? 0)} ativos`} onClick={() => navigate('/wms/posicao')} />
          <Kpi icon={CircleDollarSign} label="Valor do Estoque" value={R$c(e?.valorEstoque ?? 0)} tone="emerald" sub="a custo médio" onClick={() => navigate('/wms/posicao')} />
          <Kpi icon={AlertTriangle} label="Validade" value={num((e?.validade.vencido ?? 0) + (e?.validade.ate3 ?? 0) + (e?.validade.ate7 ?? 0))} tone={(e?.validade.vencido ?? 0) ? 'rose' : 'amber'}
            sub={`${e?.validade.vencido ?? 0} venc · ${e?.validade.ate3 ?? 0} em 3d`} onClick={() => navigate('/wms/pereciveis')} />
          <Kpi icon={TrendingDown} label="Perdas/Quebras" value={R$c(e?.perdaValor ?? 0)} tone={(e?.perdaValor ?? 0) ? 'rose' : 'slate'} sub={kg(e?.perdaQtd ?? 0)} onClick={() => navigate('/wms/movimentacoes')} />
          <Kpi icon={ShoppingCart} label="Ruptura" value={num(e?.rupturas ?? 0)} tone={(e?.rupturas ?? 0) ? 'amber' : 'slate'} sub="produtos zerados" onClick={() => navigate('/wms/analise-estoque')} />
          <Kpi icon={Activity} label="Movimentações" value={num(d?.kpis.movimentacoesHoje ?? 0)} tone="indigo" sub="no período" onClick={() => navigate('/wms/movimentacoes')} />
        </div>
      </Secao>

      {/* ═══ VENDAS: pedidos + top ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Pedidos por status */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-100 text-sm mb-4 flex items-center gap-2"><PackageCheck className="h-4 w-4 text-sky-400" /> Pedidos por status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
              <Tooltip contentStyle={tipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(v: any) => [v, 'pedidos']} />
              <Bar dataKey="valor" radius={[0, 5, 5, 0]} cursor="pointer" onClick={(p: any) => navigate(STATUS_INFO[p.status]?.rota || '/logistica/pedidos')}>
                {statusData.map((s) => <Cell key={s.status} fill={s.cor} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top clientes */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2"><Users className="h-4 w-4 text-violet-400" /> Top clientes</h3>
            <span className="text-[10px] text-slate-500">por faturamento</span>
          </div>
          <div className="space-y-2.5">
            {(d?.topClientes || []).filter(c => c.valor > 0).slice(0, 6).map((c, i) => (
              <button key={c.clienteId} onClick={() => navigate('/fiscal/gestao')} className="w-full text-left group">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300 truncate flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 w-3">{i + 1}</span>{c.nome}
                  </span>
                  <span className="font-bold text-slate-200 tabular-nums shrink-0 ml-2">{R$c(c.valor)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 rounded-full group-hover:brightness-110" style={{ width: `${(c.valor / maxCliente) * 100}%` }} />
                </div>
              </button>
            ))}
            {!(d?.topClientes || []).some(c => c.valor > 0) && <p className="text-xs text-slate-500 py-6 text-center">Sem faturamento no período.</p>}
          </div>
        </div>

        {/* Top produtos */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2"><Boxes className="h-4 w-4 text-teal-400" /> Top produtos (saída)</h3>
            <div className="flex rounded-md border border-white/[0.08] p-0.5 text-[10px]">
              <button onClick={() => setOrdProduto('custo')} className={`px-2 py-0.5 rounded ${ordProduto === 'custo' ? 'bg-teal-500/20 text-teal-200' : 'text-slate-500'}`}>R$</button>
              <button onClick={() => setOrdProduto('qtd')} className={`px-2 py-0.5 rounded ${ordProduto === 'qtd' ? 'bg-teal-500/20 text-teal-200' : 'text-slate-500'}`}>kg</button>
            </div>
          </div>
          <div className="space-y-1.5">
            {produtosOrdenados.slice(0, 6).map((p) => (
              <button key={p.produtoId} onClick={() => navigate('/wms/posicao')} className="w-full flex items-center justify-between text-xs py-1 hover:bg-white/[0.03] rounded px-1.5 -mx-1.5">
                <span className="text-slate-300 truncate flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-slate-600">{p.codigo}</span>{p.descricao}
                </span>
                <span className="font-bold text-slate-200 tabular-nums shrink-0 ml-2">{ordProduto === 'custo' ? R$c(p.custo) : kg(p.qtd)}</span>
              </button>
            ))}
            {produtosOrdenados.length === 0 && <p className="text-xs text-slate-500 py-6 text-center">Sem saídas no período.</p>}
          </div>
        </div>
      </div>

      {/* ═══ FLUXO OPERACIONAL ═══ */}
      <Secao icon={Activity} titulo="Fluxo operacional do dia" cor="#38bdf8">
        <div className="card p-5">
          <div className="grid grid-cols-4 gap-0">
            {[
              { label: 'Entradas\nrecebidas', value: `${d?.fluxoDia.entradas ?? 0}`, cor: '#0ea5e9', rota: '/wms/entradas', step: 1 },
              { label: 'Pedidos\nfaturados', value: `${d?.fluxoDia.faturados ?? 0} NF-e`, cor: '#10b981', rota: '/fiscal/gestao', step: 2 },
              { label: 'Romaneios\nna rota', value: `${d?.fluxoDia.romaneios ?? 0} rota(s)`, cor: '#f59e0b', rota: '/logistica/torre', step: 3 },
              { label: 'Entregas\nconcluídas', value: `${d?.fluxoDia.entregues ?? 0}`, cor: '#8b5cf6', rota: '/logistica/torre', step: 4 },
            ].map((item, i, arr) => (
              <div key={i} className="flex items-center">
                <button onClick={() => navigate(item.rota)} className="flex flex-col items-center flex-1 group">
                  <div className="h-11 w-11 rounded-full flex items-center justify-center text-white text-sm font-bold ring-4 ring-white/[0.04] shadow-lg group-hover:scale-105 transition-transform" style={{ background: item.cor }}>{item.step}</div>
                  <p className="text-[11px] font-medium text-slate-400 mt-2 text-center whitespace-pre-line">{item.label}</p>
                  <p className="text-sm font-bold text-white mt-0.5">{item.value}</p>
                </button>
                {i < arr.length - 1 && <div className="h-0.5 w-full bg-slate-700 mx-1 mb-9" />}
              </div>
            ))}
          </div>
        </div>
      </Secao>
    </div>
  );
}
