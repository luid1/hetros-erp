import { useEffect, useMemo, useState } from 'react';
import { Truck, Sparkles, RefreshCw, MapPin, Package } from 'lucide-react';
import { rotasApi, pedidosApi } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from '../../../components/ui/feedback';

/**
 * Torre de Controle — visão de despacho.
 * Paleta neutra (off-white / greige / bege) + tipografia oversized nos números.
 * Esquerda: pedidos abertos (arrastáveis). Direita: rotas/motoristas (drop targets).
 * Botão "🤖 Otimizar Rotas com IA" chama o RouteOptimizerService no backend.
 */

const hoje = () => new Date().toISOString().slice(0, 10);
const kg = (n: number) => `${Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`;

interface PedidoAberto {
  id: string;
  numero: number;
  cliente?: { nomeFantasia?: string; razaoSocial?: string };
  pesoTotal?: number | string;
  volumes?: number;
}

interface Rota {
  id: string;
  motoristaNome?: string;
  placaVeiculo?: string;
  regiao?: string;
  capacidadeKg: number;
  pesoTotalKg: number;
  volumesTotal: number;
  ocupacaoPct: number;
  origemOtimizacao: string;
  stops: Array<{ id: string; numeroPedido?: number; clienteNome?: string; ordem: number; status: string }>;
}

export default function TorreControle() {
  const { filialAtiva } = useAuth() as any;
  const filialId = filialAtiva?.id || '';
  const [data, setData] = useState(hoje());
  const [pedidos, setPedidos] = useState<PedidoAberto[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [loading, setLoading] = useState(false);
  const [otimizando, setOtimizando] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  async function carregar() {
    if (!filialId) return;
    setLoading(true);
    try {
      const [pRes, rRes] = await Promise.all([
        pedidosApi.list(filialId, { status: 'CONFIRMADO' }),
        rotasApi.listar(filialId, data),
      ]);
      const roteirizados = new Set<number>();
      (rRes.data || []).forEach((r: Rota) => r.stops.forEach((s) => s.numeroPedido && roteirizados.add(s.numeroPedido)));
      setPedidos((pRes.data?.items || pRes.data || []).filter((p: PedidoAberto) => !roteirizados.has(p.numero)));
      setRotas(rRes.data || []);
    } catch {
      toast('Falha ao carregar a torre de controle.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filialId, data]);

  async function otimizarIA() {
    setOtimizando(true);
    try {
      const { data: res } = await rotasApi.otimizar({ filialId, dataRota: data });
      toast(`🤖 IA gerou ${res.rotasCriadas} rota(s) para ${res.pedidosRoteirizados} pedido(s).`, 'success');
      await carregar();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha na otimização.', 'error');
    } finally {
      setOtimizando(false);
    }
  }

  const totalPeso = useMemo(
    () => pedidos.reduce((s, p) => s + Number(p.pesoTotal || 0), 0),
    [pedidos],
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-sky-400/80 font-semibold">Logística · Despacho</p>
          <h1 className="text-4xl font-light tracking-tight text-white">Torre de Controle</h1>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 [color-scheme:dark]"
          />
          <button
            onClick={carregar}
            className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm hover:bg-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
          <button
            onClick={otimizarIA}
            disabled={otimizando || pedidos.length === 0}
            className="flex items-center gap-2 bg-sky-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-sky-400 disabled:opacity-40 shadow-lg shadow-sky-500/20"
          >
            <Sparkles className={`h-4 w-4 ${otimizando ? 'animate-pulse' : ''}`} />
            🤖 Otimizar Rotas com IA
          </button>
        </div>
      </header>

      {/* KPIs oversized */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Kpi label="Pedidos abertos" value={pedidos.length} />
        <Kpi label="Peso a despachar" value={totalPeso} suffix="kg" />
        <Kpi label="Rotas do dia" value={rotas.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-5">
        {/* ── Pedidos abertos (arrastáveis) ── */}
        <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3 flex items-center gap-2">
            <Package className="h-3.5 w-3.5" /> Pedidos abertos
          </h2>
          <div className="space-y-2 max-h-[62vh] overflow-y-auto pr-1">
            {pedidos.length === 0 && (
              <p className="text-sm text-slate-500 italic py-8 text-center">Tudo roteirizado. 🎉</p>
            )}
            {pedidos.map((p) => (
              <div
                key={p.id}
                draggable
                onDragStart={() => setDragId(p.id)}
                onDragEnd={() => setDragId(null)}
                className={`cursor-grab active:cursor-grabbing rounded-xl border px-4 py-3 flex items-center justify-between transition ${
                  dragId === p.id ? 'border-sky-400 bg-sky-500/10' : 'border-slate-700 bg-slate-800/40 hover:border-slate-500'
                }`}
              >
                <div>
                  <p className="text-2xl font-light leading-none text-white">#{p.numero}</p>
                  <p className="text-xs text-slate-400 mt-1 truncate max-w-[220px]">
                    {p.cliente?.nomeFantasia || p.cliente?.razaoSocial || '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-200">{kg(Number(p.pesoTotal || 0))}</p>
                  <p className="text-[11px] text-slate-500">{p.volumes || 0} cx</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Rotas / Motoristas (drop targets) ── */}
        <section className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {rotas.length === 0 && (
            <div className="bg-slate-800/30 rounded-2xl border border-dashed border-slate-700 p-10 text-center text-slate-500">
              <Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Nenhuma rota. Use <strong className="text-slate-300">Otimizar com IA</strong> para gerar automaticamente.
            </div>
          )}
          {rotas.map((r) => (
            <RotaCard key={r.id} rota={r} />
          ))}
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 px-5 py-4">
      <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">{label}</p>
      <p className="mt-1 text-5xl font-extralight tracking-tight tabular-nums text-white">
        {value.toLocaleString('pt-BR')}
        {suffix && <span className="text-lg text-slate-500 ml-2">{suffix}</span>}
      </p>
    </div>
  );
}

function RotaCard({ rota }: { rota: Rota }) {
  const pct = Math.min(rota.ocupacaoPct, 100);
  const barra =
    rota.ocupacaoPct > 100 ? 'bg-rose-500' : rota.ocupacaoPct >= 90 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-emerald-400" />
          <div>
            <p className="font-medium leading-tight text-white">{rota.motoristaNome || 'Sem motorista'}</p>
            <p className="text-[11px] text-slate-400">
              {rota.placaVeiculo} · {rota.regiao}
              {rota.origemOtimizacao === 'IA_OPTIMIZER' && ' · 🤖 IA'}
            </p>
          </div>
        </div>
        <p className="text-3xl font-extralight tabular-nums text-white">{rota.ocupacaoPct}%</p>
      </div>
      {/* Barra de ocupação de peso */}
      <div className="h-2 rounded-full bg-slate-700 overflow-hidden mb-1">
        <div className={`h-full ${barra} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-slate-400 mb-3">
        {kg(rota.pesoTotalKg)} / {kg(rota.capacidadeKg)} · {rota.volumesTotal} cx
      </p>
      <ol className="space-y-1">
        {rota.stops.map((s) => (
          <li key={s.id} className="flex items-center gap-2 text-sm text-slate-200">
            <span className="h-5 w-5 rounded-full bg-slate-700 text-[10px] flex items-center justify-center font-semibold text-slate-200">
              {s.ordem}
            </span>
            <MapPin className="h-3 w-3 text-slate-500" />
            <span className="truncate">#{s.numeroPedido} · {s.clienteNome}</span>
            {s.status === 'DELIVERED' && <span className="ml-auto text-[10px] text-emerald-400">entregue</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
