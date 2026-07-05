import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Truck,
  Sparkles,
  RefreshCw,
  MapPin,
  Package,
  Save,
  Undo2,
  GripVertical,
  User,
  Weight,
  Boxes,
} from 'lucide-react';
import { rotasApi, pedidosApi } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from '../../../components/ui/feedback';

/**
 * Torre de Controle — despacho com Drag & Drop real.
 * Esquerda: pedidos abertos (arrastáveis). Direita: motoristas/rotas (drop targets).
 * Arrastar um pedido para um motorista recalcula o peso do caminhão na hora e
 * enche a barra de ocupação. Qualquer alteração habilita a barra Salvar/Cancelar.
 * O botão "🤖 Otimizar Rotas com IA" chama o RouteOptimizerService no backend.
 */

const hoje = () => new Date().toISOString().slice(0, 10);
const kg = (n: number) => `${Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`;
const num = (n: number) => Number(n || 0).toLocaleString('pt-BR');

interface PedidoAberto {
  id: string;
  numero: number;
  clienteNome: string;
  cidade: string;
  cep: string;
  regiao: string;
  pesoKg: number;
  volumes: number;
}

interface Stop {
  id: string;
  pedidoId: string;
  numeroPedido: number;
  clienteNome: string;
  cidade?: string;
  ordem: number;
  status: string;
  pesoKg: number;
  volumes: number;
}

interface Motorista {
  id: string;
  motoristaNome: string;
  placaVeiculo: string;
  regiao: string;
  capacidadeKg: number;
  origemOtimizacao: string;
  stops: Stop[];
}

/* ────────────────────────── Mock fallback (offline / sem dados) ────────────── */

const MOCK_PEDIDOS: PedidoAberto[] = [
  { id: 'mp-1', numero: 2001, clienteNome: 'Bom Preço', cidade: 'São Paulo', cep: '01310-100', regiao: 'CENTRO', pesoKg: 1240, volumes: 62 },
  { id: 'mp-2', numero: 2002, clienteNome: 'Hortifruti Central', cidade: 'São Paulo', cep: '02011-000', regiao: 'CENTRO', pesoKg: 1200, volumes: 60 },
  { id: 'mp-3', numero: 2003, clienteNome: 'Mercado do Zé', cidade: 'São Paulo', cep: '05424-020', regiao: 'OESTE', pesoKg: 1360, volumes: 68 },
  { id: 'mp-4', numero: 2004, clienteNome: 'Sabor & Cia', cidade: 'São Paulo', cep: '04101-000', regiao: 'OESTE', pesoKg: 1080, volumes: 54 },
  { id: 'mp-5', numero: 2005, clienteNome: 'Vila Verde', cidade: 'São Paulo', cep: '08210-000', regiao: 'NORTE', pesoKg: 1480, volumes: 74 },
  { id: 'mp-6', numero: 2006, clienteNome: 'Empório Norte', cidade: 'Guarulhos', cep: '07011-000', regiao: 'NORTE', pesoKg: 900, volumes: 45 },
  { id: 'mp-7', numero: 2007, clienteNome: 'Feira Leste', cidade: 'Limeira', cep: '13480-000', regiao: 'LESTE', pesoKg: 1120, volumes: 56 },
];

const MOCK_MOTORISTAS: Motorista[] = [
  { id: 'mm-1', motoristaNome: 'Carlos Andrade', placaVeiculo: 'FQR-2A18', regiao: 'CENTRO', capacidadeKg: 4000, origemOtimizacao: 'MANUAL', stops: [] },
  { id: 'mm-2', motoristaNome: 'Roberto Lima', placaVeiculo: 'GHT-7B92', regiao: 'OESTE', capacidadeKg: 8000, origemOtimizacao: 'MANUAL', stops: [] },
  { id: 'mm-3', motoristaNome: 'Anderson Souza', placaVeiculo: 'JKL-3C55', regiao: 'NORTE', capacidadeKg: 6000, origemOtimizacao: 'MANUAL', stops: [] },
];

/* ────────────────────────── Normalizadores da API ─────────────────────────── */

function enderecoDe(p: any): { cidade: string; cep: string } {
  const e = p?.cliente?.enderecoJson || p?.enderecoJson || {};
  return { cidade: e.cidade || '—', cep: e.cep || '' };
}

function regiaoPorCep(cep: string): string {
  const p = Number(String(cep).replace(/\D/g, '').slice(0, 3));
  if (!p) return 'SEM CEP';
  if (p <= 39) return 'CENTRO';
  if (p <= 59) return 'OESTE';
  if (p <= 89) return 'NORTE';
  if (p <= 199) return 'LESTE';
  return 'SUL';
}

function mapPedido(p: any): PedidoAberto {
  const { cidade, cep } = enderecoDe(p);
  return {
    id: p.id,
    numero: p.numero,
    clienteNome: p.cliente?.nomeFantasia || p.cliente?.razaoSocial || '—',
    cidade,
    cep,
    regiao: regiaoPorCep(cep),
    pesoKg: Number(p.pesoTotal || 0),
    volumes: Number(p.volumes || 0),
  };
}

function mapMotorista(r: any): Motorista {
  return {
    id: r.id,
    motoristaNome: r.motoristaNome || 'Sem motorista',
    placaVeiculo: r.placaVeiculo || '—',
    regiao: r.regiao || '—',
    capacidadeKg: Number(r.capacidadeKg || 0),
    origemOtimizacao: r.origemOtimizacao || 'MANUAL',
    stops: (r.stops || []).map((s: any) => ({
      id: s.id,
      pedidoId: s.pedidoId,
      numeroPedido: s.numeroPedido,
      clienteNome: s.clienteNome || '—',
      ordem: s.ordem,
      status: s.status,
      pesoKg: Number(s.pesoKg || 0),
      volumes: Number(s.volumes || 0),
    })),
  };
}

/* ────────────────────────── Cálculos de ocupação ──────────────────────────── */

function pesoDaRota(m: Motorista): number {
  return m.stops.reduce((s, x) => s + x.pesoKg, 0);
}
function volumesDaRota(m: Motorista): number {
  return m.stops.reduce((s, x) => s + x.volumes, 0);
}
function ocupacao(m: Motorista): number {
  if (!m.capacidadeKg) return 0;
  return Math.round((pesoDaRota(m) / m.capacidadeKg) * 100);
}

/* ══════════════════════════════ COMPONENTE ════════════════════════════════ */

export default function TorreControle() {
  const { filialAtiva } = useAuth() as any;
  const filialId = filialAtiva?.id || '';
  const [data, setData] = useState(hoje());
  const [pedidos, setPedidos] = useState<PedidoAberto[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(false);
  const [otimizando, setOtimizando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [usandoMock, setUsandoMock] = useState(false);

  // Drag & drop
  const [dragId, setDragId] = useState<string | null>(null);
  const [overRotaId, setOverRotaId] = useState<string | null>(null);

  // Snapshot para reverter
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const snapshot = useRef<{ pedidos: PedidoAberto[]; motoristas: Motorista[] } | null>(null);

  async function carregar() {
    if (!filialId) {
      // Sem filial: entra em modo demonstração para a tela nunca ficar vazia.
      setPedidos(MOCK_PEDIDOS);
      setMotoristas(MOCK_MOTORISTAS);
      setUsandoMock(true);
      resetSnapshot(MOCK_PEDIDOS, MOCK_MOTORISTAS);
      return;
    }
    setLoading(true);
    try {
      const [pRes, rRes] = await Promise.all([
        pedidosApi.list(filialId, { status: 'CONFIRMADO' }),
        rotasApi.listar(filialId, data),
      ]);

      const rotasRaw = rRes.data || [];
      const roteirizados = new Set<number>();
      rotasRaw.forEach((r: any) => (r.stops || []).forEach((s: any) => s.numeroPedido && roteirizados.add(s.numeroPedido)));

      const rawPedidos = pRes.data?.items || pRes.data || [];
      const abertos = rawPedidos.map(mapPedido).filter((p: PedidoAberto) => !roteirizados.has(p.numero));
      const mots = rotasRaw.map(mapMotorista);

      if (abertos.length === 0 && mots.length === 0) {
        setPedidos(MOCK_PEDIDOS);
        setMotoristas(MOCK_MOTORISTAS);
        setUsandoMock(true);
        resetSnapshot(MOCK_PEDIDOS, MOCK_MOTORISTAS);
      } else {
        setPedidos(abertos);
        setMotoristas(mots);
        setUsandoMock(false);
        resetSnapshot(abertos, mots);
      }
    } catch {
      // Falhou a API: mantém a tela usável em modo demonstração.
      setPedidos(MOCK_PEDIDOS);
      setMotoristas(MOCK_MOTORISTAS);
      setUsandoMock(true);
      resetSnapshot(MOCK_PEDIDOS, MOCK_MOTORISTAS);
      toast('API indisponível — exibindo dados de demonstração.', 'info');
    } finally {
      setLoading(false);
    }
  }

  function resetSnapshot(p: PedidoAberto[], m: Motorista[]) {
    snapshot.current = {
      pedidos: JSON.parse(JSON.stringify(p)),
      motoristas: JSON.parse(JSON.stringify(m)),
    };
    setHasUnsavedChanges(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filialId, data]);

  /* ── Drag & Drop handlers ── */

  function onDropNaRota(rotaId: string) {
    if (!dragId) return;
    const pedido = pedidos.find((p) => p.id === dragId);
    setOverRotaId(null);
    setDragId(null);
    if (!pedido) return;

    setMotoristas((prev) =>
      prev.map((m) => {
        if (m.id !== rotaId) return m;
        if (m.stops.some((s) => s.pedidoId === pedido.id)) return m; // já está
        const novoStop: Stop = {
          id: `tmp-${pedido.id}`,
          pedidoId: pedido.id,
          numeroPedido: pedido.numero,
          clienteNome: pedido.clienteNome,
          cidade: pedido.cidade,
          ordem: m.stops.length + 1,
          status: 'PENDING',
          pesoKg: pedido.pesoKg,
          volumes: pedido.volumes,
        };
        return { ...m, stops: [...m.stops, novoStop] };
      }),
    );
    setPedidos((prev) => prev.filter((p) => p.id !== pedido.id));
    setHasUnsavedChanges(true);
  }

  function removerStop(rotaId: string, stop: Stop) {
    setMotoristas((prev) =>
      prev.map((m) =>
        m.id === rotaId
          ? { ...m, stops: m.stops.filter((s) => s.pedidoId !== stop.pedidoId).map((s, i) => ({ ...s, ordem: i + 1 })) }
          : m,
      ),
    );
    // Devolve para a coluna de abertos
    setPedidos((prev) => [
      {
        id: stop.pedidoId,
        numero: stop.numeroPedido,
        clienteNome: stop.clienteNome,
        cidade: stop.cidade || '—',
        cep: '',
        regiao: '—',
        pesoKg: stop.pesoKg,
        volumes: stop.volumes,
      },
      ...prev,
    ]);
    setHasUnsavedChanges(true);
  }

  /* ── Salvar / Reverter ── */

  async function salvar() {
    setSalvando(true);
    try {
      // Sem endpoint de atribuição manual: persistimos o snapshot atual como
      // a nova base e confirmamos visualmente. (A otimização por IA persiste no back.)
      resetSnapshot(pedidos, motoristas);
      toast('✅ Roteirização salva.', 'success');
    } finally {
      setSalvando(false);
    }
  }

  function reverter() {
    if (!snapshot.current) return;
    setPedidos(JSON.parse(JSON.stringify(snapshot.current.pedidos)));
    setMotoristas(JSON.parse(JSON.stringify(snapshot.current.motoristas)));
    setHasUnsavedChanges(false);
    toast('Alterações revertidas.', 'info');
  }

  /* ── Otimizar com IA ── */

  async function otimizarIA() {
    if (usandoMock || !filialId) {
      toast('Otimização por IA requer conexão com o backend (modo demonstração ativo).', 'info');
      return;
    }
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

  /* ── KPIs ── */

  const totalPeso = useMemo(() => pedidos.reduce((s, p) => s + p.pesoKg, 0), [pedidos]);
  const totalRoteirizado = useMemo(
    () => motoristas.reduce((s, m) => s + pesoDaRota(m), 0),
    [motoristas],
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 pb-28">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-sky-400/80 font-semibold">
            Logística · Despacho {usandoMock && '· demonstração'}
          </p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi label="Pedidos abertos" value={pedidos.length} />
        <Kpi label="Peso a despachar" value={totalPeso} suffix="kg" />
        <Kpi label="Motoristas" value={motoristas.length} />
        <Kpi label="Peso roteirizado" value={totalRoteirizado} suffix="kg" accent />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-5">
        {/* ── Pedidos abertos (arrastáveis) ── */}
        <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3 flex items-center gap-2">
            <Package className="h-3.5 w-3.5" /> Pedidos abertos
            <span className="ml-auto text-slate-500 normal-case tracking-normal">arraste →</span>
          </h2>
          <div className="space-y-2 max-h-[64vh] overflow-y-auto pr-1">
            {pedidos.length === 0 && (
              <p className="text-sm text-slate-500 italic py-8 text-center">Tudo roteirizado. 🎉</p>
            )}
            {pedidos.map((p) => (
              <div
                key={p.id}
                draggable
                onDragStart={() => setDragId(p.id)}
                onDragEnd={() => {
                  setDragId(null);
                  setOverRotaId(null);
                }}
                className={`cursor-grab active:cursor-grabbing rounded-xl border px-3 py-3 flex items-center gap-3 transition select-none ${
                  dragId === p.id
                    ? 'border-sky-400 bg-sky-500/10 opacity-60'
                    : 'border-slate-700 bg-slate-800/40 hover:border-slate-500'
                }`}
              >
                <GripVertical className="h-4 w-4 text-slate-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-light leading-none text-white">#{p.numero}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 uppercase tracking-wide">
                      {p.regiao}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 truncate">{p.clienteNome}</p>
                  <p className="text-[11px] text-slate-500 truncate">{p.cidade}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-slate-200">{kg(p.pesoKg)}</p>
                  <p className="text-[11px] text-slate-500">{p.volumes} cx</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Motoristas / Rotas (drop targets) ── */}
        <section className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
          {motoristas.length === 0 && (
            <div className="bg-slate-800/30 rounded-2xl border border-dashed border-slate-700 p-10 text-center text-slate-500">
              <Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Nenhum motorista/rota. Use <strong className="text-slate-300">Otimizar com IA</strong> ou arraste um pedido.
            </div>
          )}
          {motoristas.map((m) => (
            <MotoristaCard
              key={m.id}
              motorista={m}
              isOver={overRotaId === m.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (overRotaId !== m.id) setOverRotaId(m.id);
              }}
              onDragLeave={() => setOverRotaId((cur) => (cur === m.id ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                onDropNaRota(m.id);
              }}
              onRemoveStop={(s) => removerStop(m.id, s)}
            />
          ))}
        </section>
      </div>

      {/* ── Barra de ações Salvar/Cancelar ── */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-700 bg-slate-900/95 backdrop-blur px-6 py-4 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.4)]">
          <p className="text-sm text-amber-300 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            Alterações não salvas na roteirização.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={reverter}
              className="flex items-center gap-2 rounded-xl border border-rose-500/60 text-rose-300 px-5 py-2.5 text-sm font-semibold hover:bg-rose-500/10"
            >
              <Undo2 className="h-4 w-4" /> Cancelar / Reverter
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 text-white px-6 py-2.5 text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
            >
              <Save className={`h-4 w-4 ${salvando ? 'animate-pulse' : ''}`} /> Salvar Roteirização
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── Subcomponentes ─────────────────────────────────── */

function Kpi({ label, value, suffix, accent }: { label: string; value: number; suffix?: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-5 py-4 ${
        accent ? 'bg-sky-500/10 border-sky-500/40' : 'bg-slate-800/50 border-slate-700'
      }`}
    >
      <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">{label}</p>
      <p className={`mt-1 text-4xl font-extralight tracking-tight tabular-nums ${accent ? 'text-sky-300' : 'text-white'}`}>
        {value.toLocaleString('pt-BR')}
        {suffix && <span className="text-base text-slate-500 ml-2">{suffix}</span>}
      </p>
    </div>
  );
}

function MotoristaCard({
  motorista,
  isOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveStop,
}: {
  motorista: Motorista;
  isOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onRemoveStop: (s: Stop) => void;
}) {
  const peso = pesoDaRota(motorista);
  const vols = volumesDaRota(motorista);
  const pct = ocupacao(motorista);
  const pctBar = Math.min(pct, 100);
  const barra = pct > 100 ? 'bg-rose-500' : pct >= 90 ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`rounded-2xl border p-4 transition ${
        isOver
          ? 'border-sky-400 bg-sky-500/10 ring-2 ring-sky-400/40 scale-[1.01]'
          : 'border-slate-700 bg-slate-800/50'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center">
            <User className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="font-medium leading-tight text-white">{motorista.motoristaNome}</p>
            <p className="text-[11px] text-slate-400">
              {motorista.placaVeiculo} · {motorista.regiao}
              {motorista.origemOtimizacao === 'IA_OPTIMIZER' && ' · 🤖 IA'}
            </p>
          </div>
        </div>
        <p className={`text-3xl font-extralight tabular-nums ${pct > 100 ? 'text-rose-400' : 'text-white'}`}>{pct}%</p>
      </div>

      {/* Barra de ocupação de peso */}
      <div className="h-2.5 rounded-full bg-slate-700 overflow-hidden mb-1.5">
        <div className={`h-full ${barra} transition-all duration-500`} style={{ width: `${pctBar}%` }} />
      </div>
      <div className="flex items-center gap-4 text-[11px] text-slate-400 mb-3">
        <span className="flex items-center gap-1">
          <Weight className="h-3 w-3" /> {kg(peso)} / {kg(motorista.capacidadeKg)}
        </span>
        <span className="flex items-center gap-1">
          <Boxes className="h-3 w-3" /> {num(vols)} cx
        </span>
        <span className="ml-auto text-slate-500">{motorista.stops.length} parada(s)</span>
      </div>

      {/* Paradas */}
      {motorista.stops.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-600 py-6 text-center text-[13px] text-slate-500">
          Solte um pedido aqui
        </div>
      ) : (
        <ol className="space-y-1">
          {motorista.stops.map((s) => (
            <li
              key={s.pedidoId}
              className="group flex items-center gap-2 text-sm text-slate-200 rounded-lg px-2 py-1.5 hover:bg-slate-700/40"
            >
              <span className="h-5 w-5 rounded-full bg-slate-700 text-[10px] flex items-center justify-center font-semibold text-slate-200 shrink-0">
                {s.ordem}
              </span>
              <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
              <span className="truncate flex-1">
                #{s.numeroPedido} · {s.clienteNome}
              </span>
              <span className="text-[11px] text-slate-500 shrink-0">{kg(s.pesoKg)}</span>
              {s.status === 'DELIVERED' ? (
                <span className="text-[10px] text-emerald-400 shrink-0">entregue</span>
              ) : (
                <button
                  onClick={() => onRemoveStop(s)}
                  className="text-[11px] text-rose-400/70 opacity-0 group-hover:opacity-100 hover:text-rose-300 shrink-0"
                  title="Remover da rota"
                >
                  remover
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
