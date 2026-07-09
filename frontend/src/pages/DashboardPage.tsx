import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  Package, AlertTriangle, TrendingUp, Truck, Receipt, DollarSign,
  Activity, RefreshCw, BarChart3, PackageCheck, TrendingDown,
} from 'lucide-react';

const R$ = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const R$k = (v: number) => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(Math.round(v));

interface Resumo {
  kpis: {
    itensEstoque: number; alertasValidade: number; pedidosPendentes: number; pedidosSeparacao: number;
    pedidosSeparados: number; nfesHoje: number; faturadoHoje: number; contasReceberQtd: number;
    contasReceberValor: number; movimentacoesHoje: number; perdaHojeValor?: number; perdaHojeQtd?: number;
  };
  pedidosPorStatus: Record<string, number>;
  serieFaturamento: { dia: string; label: string; valor: number }[];
  fluxoDia: { entradas: number; faturados: number; romaneios: number; entregues: number };
}

// Acento semântico por KPI: chip de ícone tingido + glow sutil (classes estáticas p/ o Tailwind enxergar)
const KPI_ACCENT: Record<string, { chip: string; icon: string; glow: string }> = {
  'bg-sky-500':     { chip: 'bg-sky-500/10 border-sky-400/20',       icon: 'text-sky-300',     glow: 'bg-sky-500/20' },
  'bg-red-500':     { chip: 'bg-red-500/10 border-red-400/20',       icon: 'text-red-300',     glow: 'bg-red-500/20' },
  'bg-amber-500':   { chip: 'bg-amber-500/10 border-amber-400/20',   icon: 'text-amber-300',   glow: 'bg-amber-500/20' },
  'bg-violet-500':  { chip: 'bg-violet-500/10 border-violet-400/20', icon: 'text-violet-300',  glow: 'bg-violet-500/20' },
  'bg-teal-500':    { chip: 'bg-teal-500/10 border-teal-400/20',     icon: 'text-teal-300',    glow: 'bg-teal-500/20' },
  'bg-emerald-500': { chip: 'bg-emerald-500/10 border-emerald-400/20', icon: 'text-emerald-300', glow: 'bg-emerald-500/20' },
  'bg-blue-500':    { chip: 'bg-blue-500/10 border-blue-400/20',     icon: 'text-blue-300',    glow: 'bg-blue-500/20' },
  'bg-indigo-500':  { chip: 'bg-indigo-500/10 border-indigo-400/20', icon: 'text-indigo-300',  glow: 'bg-indigo-500/20' },
  'bg-rose-500':    { chip: 'bg-rose-500/10 border-rose-400/20',     icon: 'text-rose-300',    glow: 'bg-rose-500/20' },
  'bg-gray-500':    { chip: 'bg-white/[0.04] border-white/[0.08]',   icon: 'text-slate-400',   glow: 'bg-transparent' },
};
function KPICard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) {
  const a = KPI_ACCENT[color] || KPI_ACCENT['bg-gray-500'];
  return (
    <div className="card glass-hover p-5 cursor-default relative overflow-hidden">
      {/* glow de acento no canto — dá vida sem pesar */}
      <div className={`pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl ${a.glow}`} aria-hidden />
      <div className="flex items-center gap-2.5 mb-3 relative">
        <div className={`h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 ${a.chip}`}>
          <Icon className={`h-4 w-4 ${a.icon}`} strokeWidth={2} />
        </div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em] truncate">{label}</p>
      </div>
      <p className="text-3xl font-extrabold text-white tracking-tight tabular-nums truncate relative">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1 truncate relative">{sub}</p>}
    </div>
  );
}

const STATUS_INFO: Record<string, { label: string; cor: string }> = {
  CONFIRMADO: { label: 'Pendente', cor: 'bg-red-500' },
  EM_SEPARACAO: { label: 'Separando', cor: 'bg-sky-500' },
  SEPARADO: { label: 'Liberado', cor: 'bg-emerald-500' },
  FATURADO: { label: 'Faturado', cor: 'bg-slate-500' },
};

export default function DashboardPage() {
  const { filialAtiva } = useAuth();
  const [d, setD] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(() => {
    setLoading(true);
    api.get('/dashboard', { params: { filialId: filialAtiva?.id } })
      .then(r => setD(r.data)).catch(() => setD(null)).finally(() => setLoading(false));
  }, [filialAtiva?.id]);
  useEffect(() => { carregar(); }, [carregar]);

  const k = d?.kpis;
  const maxFat = Math.max(1, ...(d?.serieFaturamento || []).map(s => s.valor));
  const maxStatus = Math.max(1, ...Object.values(d?.pedidosPorStatus || {}));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Painel Operacional</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {filialAtiva ? `${filialAtiva.codigo} — ${filialAtiva.nome}` : 'Selecione uma filial'} ·{' '}
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={carregar} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-200 text-sm">
          <RefreshCw className={`h-4 w-4 text-sky-400 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={Package} label="Itens em Estoque" value={String(k?.itensEstoque ?? 0)} color="bg-sky-500" />
        <KPICard icon={AlertTriangle} label="Alertas de Validade" value={String(k?.alertasValidade ?? 0)} sub="perecíveis vencendo" color={k?.alertasValidade ? 'bg-red-500' : 'bg-gray-500'} />
        <KPICard icon={Truck} label="Pedidos p/ Separar" value={String(k?.pedidosPendentes ?? 0)} color="bg-amber-500" />
        <KPICard icon={Activity} label="Em Separação" value={String(k?.pedidosSeparacao ?? 0)} color="bg-violet-500" />
        <KPICard icon={Receipt} label="NF-e Emitidas Hoje" value={String(k?.nfesHoje ?? 0)} color="bg-teal-500" />
        <KPICard icon={TrendingUp} label="Faturado Hoje" value={R$(k?.faturadoHoje ?? 0)} color="bg-emerald-500" />
        <KPICard icon={DollarSign} label="A Receber (7 dias)" value={String(k?.contasReceberQtd ?? 0)} sub={R$(k?.contasReceberValor ?? 0)} color="bg-blue-500" />
        <KPICard icon={Activity} label="Movimentações Hoje" value={String(k?.movimentacoesHoje ?? 0)} color="bg-indigo-500" />
        <KPICard icon={TrendingDown} label="Perdas/Quebras Hoje" value={R$(k?.perdaHojeValor ?? 0)} sub={`${(k?.perdaHojeQtd ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} baixados`} color={k?.perdaHojeValor ? 'bg-rose-500' : 'bg-gray-500'} />
      </div>

      {/* Alerta de validade */}
      {(k?.alertasValidade ?? 0) > 0 && (
        <div className="card border-red-500/40 p-4" style={{ background: 'rgba(244,63,94,0.08)' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300">{k?.alertasValidade} produto(s) com validade vencendo em breve</p>
              <p className="text-sm text-red-400/80 mt-1">Veja a tela <strong>Perecíveis / FLV</strong> para descarte ou promoção (FEFO).</p>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Faturamento 7 dias */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-500" /> Faturamento — últimos 7 dias</h3>
          <div className="flex items-end gap-2 h-44 pt-4">
            {(d?.serieFaturamento || []).map(s => (
              <div key={s.dia} className="flex-1 flex flex-col items-center gap-1 group" title={R$(s.valor)}>
                <span className="text-[10px] text-gray-400 font-mono group-hover:text-emerald-300 transition-colors">{s.valor > 0 ? R$k(s.valor) : ''}</span>
                <div className="w-full bg-gradient-to-t from-emerald-600/70 to-emerald-400 rounded-t-md transition-all duration-300 group-hover:from-emerald-500 group-hover:to-emerald-300 group-hover:shadow-[0_0_16px_rgba(16,185,129,0.35)]" style={{ height: `${Math.max(3, (s.valor / maxFat) * 140)}px` }} />
                <span className="text-[10px] text-gray-400">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pedidos por status */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><PackageCheck className="h-4 w-4 text-sky-500" /> Pedidos por status</h3>
          <div className="space-y-3">
            {Object.entries(d?.pedidosPorStatus || {}).map(([s, n]) => (
              <div key={s}>
                <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{STATUS_INFO[s]?.label || s}</span><span className="font-bold text-gray-700">{n}</span></div>
                <div className="h-2.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div className={`h-full ${STATUS_INFO[s]?.cor || 'bg-slate-500'} rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(255,255,255,0.15)]`} style={{ width: `${(n / maxStatus) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fluxo do dia */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-sky-500" /> Fluxo Operacional do Dia</h3>
        <div className="grid grid-cols-4 gap-0">
          {[
            { label: 'Entradas\nrecebidas', value: `${d?.fluxoDia.entradas ?? 0}`, color: 'bg-sky-500', step: 1 },
            { label: 'Pedidos\nfaturados', value: `${d?.fluxoDia.faturados ?? 0} NF-e`, color: 'bg-emerald-500', step: 2 },
            { label: 'Romaneios\nna rota', value: `${d?.fluxoDia.romaneios ?? 0} rota(s)`, color: 'bg-amber-500', step: 3 },
            { label: 'Entregas\nconcluídas', value: `${d?.fluxoDia.entregues ?? 0}`, color: 'bg-violet-500', step: 4 },
          ].map((item, i, arr) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center flex-1">
                <div className={`h-10 w-10 rounded-full ${item.color} flex items-center justify-center text-white text-xs font-bold ring-4 ring-white/[0.04] shadow-lg`}>{item.step}</div>
                <p className="text-xs font-medium text-gray-600 mt-2 text-center whitespace-pre-line">{item.label}</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{item.value}</p>
              </div>
              {i < arr.length - 1 && <div className="h-0.5 w-full bg-slate-700 mx-1 mb-6" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
