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
  Radar,
  X,
  Clock,
  AlertTriangle,
  PackageOpen,
  CheckCircle2,
  Loader2,
  Star,
  Plus,
  ChevronDown,
  ChevronUp,
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

// Elenco completo de motoristas disponíveis para roteirização manual.
const ROSTER_MOTORISTAS: Motorista[] = [
  { id: 'mm-1', motoristaNome: 'Carlos Andrade', placaVeiculo: 'FQR-2A18', regiao: 'CENTRO', capacidadeKg: 4000, origemOtimizacao: 'MANUAL', stops: [] },
  { id: 'mm-2', motoristaNome: 'Roberto Lima', placaVeiculo: 'GHT-7B92', regiao: 'OESTE', capacidadeKg: 8000, origemOtimizacao: 'MANUAL', stops: [] },
  { id: 'mm-3', motoristaNome: 'Anderson Souza', placaVeiculo: 'JKL-3C55', regiao: 'NORTE', capacidadeKg: 6000, origemOtimizacao: 'MANUAL', stops: [] },
  { id: 'mm-4', motoristaNome: 'Marcos Pereira', placaVeiculo: 'PLK-9D71', regiao: 'LESTE', capacidadeKg: 5000, origemOtimizacao: 'MANUAL', stops: [] },
  { id: 'mm-5', motoristaNome: 'Fernando Rocha', placaVeiculo: 'RTV-4E33', regiao: 'SUL', capacidadeKg: 7000, origemOtimizacao: 'MANUAL', stops: [] },
  { id: 'mm-6', motoristaNome: 'Juliano Costa', placaVeiculo: 'BNM-1F08', regiao: 'CENTRO', capacidadeKg: 3500, origemOtimizacao: 'MANUAL', stops: [] },
  { id: 'mm-7', motoristaNome: 'Rafael Nunes', placaVeiculo: 'XCV-6G22', regiao: 'OESTE', capacidadeKg: 9000, origemOtimizacao: 'MANUAL', stops: [] },
  { id: 'mm-8', motoristaNome: 'Diego Martins', placaVeiculo: 'QAZ-2H90', regiao: 'NORTE', capacidadeKg: 4500, origemOtimizacao: 'MANUAL', stops: [] },
];

// Compat: primeiros 3 servem de fallback quando não há API.
const MOCK_MOTORISTAS: Motorista[] = ROSTER_MOTORISTAS.slice(0, 3);

/* ──────────────────── Motoristas frequentes (favoritos) ────────────────────── */

const FAV_KEY = 'torre.motoristas.frequentes';

function carregarFavoritos(): Set<string> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (raw) return new Set<string>(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return new Set(['mm-1', 'mm-2', 'mm-3']);
}

function salvarFavoritos(s: Set<string>) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
}

function clonarMotorista(m: Motorista): Motorista {
  return JSON.parse(JSON.stringify(m));
}

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

  // Mapa de frotas (telemetria live)
  const [mapaAberto, setMapaAberto] = useState(false);

  // Motoristas frequentes (favoritos) + "ver mais"
  const [favoritos, setFavoritos] = useState<Set<string>>(carregarFavoritos);
  const [verMais, setVerMais] = useState(false);

  // Painel lateral de telemetria por motorista
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Garante que os motoristas favoritos apareçam sempre como alvos de arraste,
  // mesclados com as rotas carregadas (sem duplicar por nome).
  function mesclarFrequentes(base: Motorista[], favs: Set<string>): Motorista[] {
    const nomes = new Set(base.map((m) => m.motoristaNome.toLowerCase()));
    const frequentes = ROSTER_MOTORISTAS.filter(
      (r) => favs.has(r.id) && !nomes.has(r.motoristaNome.toLowerCase()),
    ).map(clonarMotorista);
    return [...base, ...frequentes];
  }

  function alternarFavorito(id: string) {
    setFavoritos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      salvarFavoritos(next);
      return next;
    });
  }

  // Adiciona um motorista do elenco como alvo de arraste (via "ver mais").
  function adicionarMotorista(r: Motorista) {
    setMotoristas((prev) =>
      prev.some((m) => m.motoristaNome.toLowerCase() === r.motoristaNome.toLowerCase())
        ? prev
        : [...prev, clonarMotorista(r)],
    );
  }

  // Motoristas do elenco que ainda não estão na lista ativa.
  const motoristasDisponiveis = useMemo(
    () => {
      const ativos = new Set(motoristas.map((m) => m.motoristaNome.toLowerCase()));
      return ROSTER_MOTORISTAS.filter((r) => !ativos.has(r.motoristaNome.toLowerCase()));
    },
    [motoristas],
  );

  // Motorista aberto no painel lateral — re-derivado do array para refletir add/remove de paradas.
  const selectedDriver = useMemo(
    () => (selectedDriverId ? motoristas.find((m) => m.id === selectedDriverId) ?? null : null),
    [selectedDriverId, motoristas],
  );

  async function carregar() {
    if (!filialId) {
      // Sem filial: entra em modo demonstração para a tela nunca ficar vazia.
      setPedidos(MOCK_PEDIDOS);
      {
        const frequentes = mesclarFrequentes([], favoritos);
        setMotoristas(frequentes);
        setUsandoMock(true);
        resetSnapshot(MOCK_PEDIDOS, frequentes);
      }
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
        const comFrequentes = mesclarFrequentes(mots, favoritos);
        setPedidos(abertos);
        setMotoristas(comFrequentes);
        setUsandoMock(false);
        resetSnapshot(abertos, comFrequentes);
      }
    } catch {
      // Falhou a API: mantém a tela usável em modo demonstração.
      setPedidos(MOCK_PEDIDOS);
      {
        const frequentes = mesclarFrequentes([], favoritos);
        setMotoristas(frequentes);
        setUsandoMock(true);
        resetSnapshot(MOCK_PEDIDOS, frequentes);
      }
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
            onClick={() => setMapaAberto(true)}
            className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm hover:bg-slate-700 hover:border-emerald-500/50"
          >
            <Radar className="h-4 w-4 text-emerald-400" /> Ver Mapa de Frotas
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
          <h2 className="text-xs uppercase tracking-widest text-slate-400 font-semibold flex items-center gap-2">
            <Truck className="h-3.5 w-3.5" /> Motoristas frequentes
            <span className="ml-auto text-slate-500 normal-case tracking-normal flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" /> marque os frequentes
            </span>
          </h2>

          {motoristas.length === 0 && (
            <div className="bg-slate-800/30 rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-500">
              <Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Nenhum motorista na lista. Adicione em{' '}
              <strong className="text-slate-300">Ver mais motoristas</strong> abaixo.
            </div>
          )}

          {motoristas.map((m) => (
            <MotoristaCard
              key={m.id}
              motorista={m}
              favorito={favoritos.has(m.id)}
              onToggleFavorito={() => alternarFavorito(m.id)}
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
              onOpen={() => setSelectedDriverId(m.id)}
            />
          ))}

          {/* ── Ver mais motoristas ── */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800/30">
            <button
              onClick={() => setVerMais((v) => !v)}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-300 hover:text-white"
            >
              {verMais ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Ver mais motoristas
              <span className="ml-auto text-xs text-slate-500">
                {motoristasDisponiveis.length} disponíveis
              </span>
            </button>

            {verMais && (
              <div className="px-3 pb-3 space-y-2">
                {motoristasDisponiveis.length === 0 && (
                  <p className="text-xs text-slate-500 italic py-3 text-center">
                    Todos os motoristas já estão na lista.
                  </p>
                )}
                {motoristasDisponiveis.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-700/70 bg-slate-800/40 px-3 py-2.5"
                  >
                    <button
                      onClick={() => alternarFavorito(r.id)}
                      title={favoritos.has(r.id) ? 'Remover dos frequentes' : 'Marcar como frequente'}
                      className="shrink-0"
                    >
                      <Star
                        className={`h-4 w-4 transition ${
                          favoritos.has(r.id)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-600 hover:text-amber-400'
                        }`}
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-100 truncate">{r.motoristaNome}</p>
                      <p className="text-[11px] text-slate-500">
                        {r.placaVeiculo} · {r.regiao} · {kg(r.capacidadeKg)}
                      </p>
                    </div>
                    <button
                      onClick={() => adicionarMotorista(r)}
                      className="shrink-0 flex items-center gap-1 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-300 px-2.5 py-1.5 text-xs font-medium hover:bg-sky-500/25"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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

      {/* ── Modal: Mapa de Frotas (telemetria live) ── */}
      {mapaAberto && <MapaFrotas motoristas={motoristas} onClose={() => setMapaAberto(false)} />}

      {/* ── Painel lateral: telemetria por motorista ── */}
      {selectedDriver && (
        <DriverDrawer
          motorista={selectedDriver}
          onClose={() => setSelectedDriverId(null)}
          onRemoveStop={(s) => removerStop(selectedDriver.id, s)}
        />
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
  favorito,
  onToggleFavorito,
  isOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onOpen,
}: {
  motorista: Motorista;
  favorito: boolean;
  onToggleFavorito: () => void;
  isOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onOpen: () => void;
}) {
  const peso = pesoDaRota(motorista);
  const pct = ocupacao(motorista);
  const pctBar = Math.min(pct, 100);
  const barra = pct > 100 ? 'bg-rose-500' : pct >= 90 ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <button
      type="button"
      onClick={onOpen}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`w-full text-left rounded-2xl border px-3.5 py-3 transition group ${
        isOver
          ? 'border-sky-400 bg-sky-500/10 ring-2 ring-sky-400/40 scale-[1.01]'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorito();
          }}
          title={favorito ? 'Remover dos frequentes' : 'Marcar como frequente'}
          className="shrink-0 cursor-pointer"
        >
          <Star
            className={`h-4 w-4 transition ${
              favorito ? 'text-amber-400 fill-amber-400' : 'text-slate-600 hover:text-amber-400'
            }`}
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-medium leading-tight text-white flex items-center gap-1.5 truncate">
            <span className="truncate">{motorista.motoristaNome}</span>
            {favorito && (
              <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 shrink-0">
                Frequente
              </span>
            )}
          </p>
          <p className="text-[11px] text-slate-400 truncate">
            {motorista.placaVeiculo} · {motorista.regiao}
            {motorista.origemOtimizacao === 'IA_OPTIMIZER' && ' · 🤖 IA'}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className={`text-lg font-light tabular-nums leading-none ${pct > 100 ? 'text-rose-400' : 'text-white'}`}>
            {pct}%
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{motorista.stops.length} parada(s)</p>
        </div>
      </div>

      {/* Barra de ocupação fina */}
      <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden mt-2.5">
        <div className={`h-full ${barra} transition-all duration-500`} style={{ width: `${pctBar}%` }} />
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
        <span className="flex items-center gap-1">
          <Weight className="h-3 w-3" /> {kg(peso)} / {kg(motorista.capacidadeKg)}
        </span>
        <span className="text-slate-500 flex items-center gap-1">
          detalhes <ChevronDown className="h-3 w-3 -rotate-90 opacity-60 group-hover:opacity-100" />
        </span>
      </div>
    </button>
  );
}

/* ────────────────────────── Painel lateral: telemetria por motorista ───────── */

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371; // km
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function DriverDrawer({
  motorista,
  onClose,
  onRemoveStop,
}: {
  motorista: Motorista;
  onClose: () => void;
  onRemoveStop: (s: Stop) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const [mapErro, setMapErro] = useState(false);
  const [mapPronto, setMapPronto] = useState(false);

  const pct = ocupacao(motorista);
  const peso = pesoDaRota(motorista);
  const vols = volumesDaRota(motorista);
  const statusLabel = pct > 100 ? 'Excedido' : pct >= 90 ? 'Cheio' : 'Leve';
  const statusClass =
    pct > 100
      ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
      : pct >= 90
        ? 'bg-amber-400/15 text-amber-300 border-amber-400/40'
        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';

  const stopsOrdenados = useMemo(
    () => [...motorista.stops].sort((a, b) => a.ordem - b.ordem),
    [motorista.stops],
  );

  // Coordenadas de cada parada (derivadas da região, como no Mapa de Frotas).
  const coords = useMemo<[number, number][]>(
    () => stopsOrdenados.map((_, i) => coordDaRegiao(motorista.regiao, i)),
    [stopsOrdenados, motorista.regiao],
  );

  // Métricas
  const distanciaKm = useMemo(() => {
    const pontos: [number, number][] = [BASE_COORD, ...coords];
    let total = 0;
    for (let i = 1; i < pontos.length; i++) total += haversine(pontos[i - 1], pontos[i]);
    return total;
  }, [coords]);
  const etaMin = stopsOrdenados.length * 18; // ~18 min por parada
  const transito = pct > 100 ? 'Intenso' : pct >= 90 ? 'Moderado' : 'Livre';

  // Fecha com ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Inicializa o mapa Leaflet
  useEffect(() => {
    let cancelado = false;
    carregarLeaflet()
      .then((L: any) => {
        if (cancelado || !mapRef.current) return;
        if (!mapObj.current) {
          mapObj.current = L.map(mapRef.current, {
            zoomControl: false,
            attributionControl: false,
          }).setView(BASE_COORD, 11);
          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
          }).addTo(mapObj.current);
        }
        setMapPronto(true);
      })
      .catch(() => !cancelado && setMapErro(true));
    return () => {
      cancelado = true;
      if (mapObj.current) {
        mapObj.current.remove();
        mapObj.current = null;
      }
    };
  }, []);

  // Desenha paradas + rota sempre que mudar
  useEffect(() => {
    if (!mapPronto || !mapObj.current) return;
    carregarLeaflet().then((L: any) => {
      if (!mapObj.current) return;
      if (layerRef.current) {
        mapObj.current.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      const grupo = L.layerGroup();
      // Base
      L.marker(BASE_COORD, { icon: baseDivIcon(L) }).addTo(grupo);
      // Paradas numeradas
      coords.forEach((c, i) => {
        const html = `<div style="transform:translate(-50%,-50%);width:22px;height:22px;border-radius:9999px;background:#38bdf8;border:2px solid #0f172a;box-shadow:0 0 0 4px #38bdf833;display:flex;align-items:center;justify-content:center;color:#0f172a;font-size:11px;font-weight:700">${i + 1}</div>`;
        L.marker(c, { icon: L.divIcon({ html, className: '', iconSize: [0, 0] }) })
          .bindPopup(`#${stopsOrdenados[i].numeroPedido} · ${stopsOrdenados[i].clienteNome}`)
          .addTo(grupo);
      });
      // Polyline tracejada base → paradas
      if (coords.length > 0) {
        L.polyline([BASE_COORD, ...coords], {
          color: '#38bdf8',
          weight: 2,
          opacity: 0.7,
          dashArray: '6 8',
        }).addTo(grupo);
      }
      grupo.addTo(mapObj.current);
      layerRef.current = grupo;
      const todos: [number, number][] = [BASE_COORD, ...coords];
      if (todos.length > 1) mapObj.current.fitBounds(todos, { padding: [40, 40] });
      setTimeout(() => mapObj.current && mapObj.current.invalidateSize(), 60);
    });
  }, [mapPronto, coords, stopsOrdenados]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-[46%] min-w-[420px] bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col animate-[slideIn_.2s_ease-out]">
        {/* A) Header */}
        <div className="shrink-0 border-b border-slate-700 px-6 py-4 flex items-start justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-medium text-white truncate">{motorista.motoristaNome}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {motorista.placaVeiculo} · {motorista.regiao}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusClass}`}>
              {statusLabel} · {pct}%
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-white" title="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* B) Mapa */}
          <div className="relative h-64 bg-slate-800 border-b border-slate-700">
            <div ref={mapRef} className="absolute inset-0" />
            {!mapPronto && !mapErro && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando mapa…
              </div>
            )}
            {mapErro && (
              <div className="absolute inset-0 flex items-center justify-center text-rose-300 text-sm gap-2">
                <AlertTriangle className="h-4 w-4" /> Falha ao carregar o mapa
              </div>
            )}
          </div>

          {/* C) Métricas */}
          <div className="grid grid-cols-3 gap-3 px-6 py-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Distância</p>
              <p className="text-xl font-light text-white tabular-nums mt-0.5">
                {distanciaKm.toFixed(1)}<span className="text-xs text-slate-500 ml-1">km</span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">ETA</p>
              <p className="text-xl font-light text-white tabular-nums mt-0.5">
                {Math.floor(etaMin / 60)}<span className="text-xs text-slate-500 mx-1">h</span>
                {etaMin % 60}<span className="text-xs text-slate-500 ml-1">min</span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Trânsito</p>
              <p
                className={`text-xl font-light tabular-nums mt-0.5 ${
                  transito === 'Intenso' ? 'text-rose-400' : transito === 'Moderado' ? 'text-amber-300' : 'text-emerald-400'
                }`}
              >
                {transito}
              </p>
            </div>
          </div>

          {/* Resumo de carga */}
          <div className="px-6 flex items-center gap-4 text-[12px] text-slate-400">
            <span className="flex items-center gap-1">
              <Weight className="h-3.5 w-3.5" /> {kg(peso)} / {kg(motorista.capacidadeKg)}
            </span>
            <span className="flex items-center gap-1">
              <Boxes className="h-3.5 w-3.5" /> {num(vols)} cx
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {stopsOrdenados.length} parada(s)
            </span>
          </div>

          {/* D) Timeline de paradas */}
          <div className="px-6 py-4">
            <h3 className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" /> Roteiro da rota
            </h3>
            {stopsOrdenados.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-600 py-8 text-center text-[13px] text-slate-500">
                <PackageOpen className="h-6 w-6 mx-auto mb-2 opacity-40" />
                Nenhuma parada. Arraste pedidos para este motorista.
              </div>
            ) : (
              <ol className="relative border-l border-slate-700 ml-2 space-y-3">
                {stopsOrdenados.map((s) => (
                  <li key={s.pedidoId} className="ml-4 group">
                    <span className="absolute -left-[9px] mt-1 h-4 w-4 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[9px] font-semibold text-slate-200">
                      {s.ordem}
                    </span>
                    <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-white truncate">
                          #{s.numeroPedido} · {s.clienteNome}
                        </p>
                        {s.status === 'DELIVERED' ? (
                          <span className="text-[10px] text-emerald-400 shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> entregue
                          </span>
                        ) : (
                          <button
                            onClick={() => onRemoveStop(s)}
                            className="text-[11px] text-rose-400/70 opacity-0 group-hover:opacity-100 hover:text-rose-300 shrink-0"
                            title="Remover da rota"
                          >
                            remover
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                        {s.cidade && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {s.cidade}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Weight className="h-3 w-3" /> {kg(s.pesoKg)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── Mapa de Frotas (Live Tracking) ─────────────────── */

type StatusFrota = 'EM_ROTA' | 'ATRASADO' | 'DESCARREGANDO' | 'RETORNANDO';

interface StopFrota {
  ordem: number;
  numeroPedido: number;
  clienteNome: string;
  pesoKg: number;
  status: string;
}

interface Veiculo {
  id: string;
  nome: string;
  placa: string;
  regiao: string;
  status: StatusFrota;
  detalhe: string;
  entregasFeitas: number;
  entregasTotal: number;
  lat: number;
  lng: number;
  capacidadeKg: number;
  pesoTotalKg: number;
  stops: StopFrota[];
}

/* Coordenadas reais aproximadas por zona de São Paulo (para o mapa Leaflet). */
const BASE_COORD: [number, number] = [-23.5478, -46.6389]; // CD Matriz — Centro/SP
const REGIAO_COORD: Record<string, [number, number]> = {
  CENTRO: [-23.5505, -46.6333],
  OESTE: [-23.567, -46.692],
  NORTE: [-23.51, -46.62],
  LESTE: [-23.54, -46.53],
  SUL: [-23.63, -46.64],
};
function coordDaRegiao(regiao: string, i: number): [number, number] {
  const base = REGIAO_COORD[regiao] || BASE_COORD;
  return [base[0] + ((i % 3) - 1) * 0.014, base[1] + ((i % 4) - 1.5) * 0.015];
}

/* Cores hex por status (para os marcadores desenhados no Leaflet). */
const STATUS_HEX: Record<StatusFrota, string> = {
  EM_ROTA: '#38bdf8',
  ATRASADO: '#fb7185',
  DESCARREGANDO: '#fbbf24',
  RETORNANDO: '#34d399',
};

/* Carrega o Leaflet via CDN sob demanda — sem adicionar dependência ao projeto. */
let leafletPromise: Promise<any> | null = null;
function carregarLeaflet(): Promise<any> {
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.async = true;
    s.onload = () => resolve((window as any).L);
    s.onerror = () => reject(new Error('Falha ao carregar Leaflet'));
    document.head.appendChild(s);
  });
  return leafletPromise;
}

/* Marcador do veículo desenhado como divIcon (bolha colorida + nome). */
function veiculoDivIcon(L: any, v: Veiculo, ativo: boolean) {
  const cor = STATUS_HEX[v.status];
  const size = ativo ? 26 : 20;
  const html = `
    <div style="transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center">
      <div style="width:${size}px;height:${size}px;border-radius:9999px;background:${cor};
        border:2px solid ${ativo ? '#ffffff' : 'rgba(15,23,42,.6)'};
        box-shadow:0 0 0 ${ativo ? '7px' : '0px'} ${cor}33;transition:all .2s"></div>
      <span style="margin-top:3px;font-size:10px;line-height:1;padding:2px 6px;border-radius:5px;
        background:${ativo ? '#ffffff' : 'rgba(15,23,42,.85)'};color:${ativo ? '#0f172a' : '#e2e8f0'};
        white-space:nowrap;font-weight:${ativo ? 700 : 400}">${v.nome.split(' ')[0]}</span>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [0, 0] });
}

/* Marcador do CD/base. */
function baseDivIcon(L: any) {
  const html = `
    <div style="transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center">
      <div style="width:26px;height:26px;border-radius:6px;background:#475569;border:2px solid #cbd5e1;
        display:flex;align-items:center;justify-content:center;color:#f1f5f9;font-size:13px">🏭</div>
      <span style="margin-top:3px;font-size:10px;padding:2px 6px;border-radius:5px;background:rgba(15,23,42,.85);
        color:#e2e8f0;white-space:nowrap">CD Matriz</span>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [0, 0] });
}

const STATUS_META: Record<StatusFrota, { label: string; cor: string; dot: string; icon: any }> = {
  EM_ROTA: { label: 'Em rota', cor: 'text-sky-300', dot: 'bg-sky-400', icon: Truck },
  ATRASADO: { label: 'Atrasado', cor: 'text-rose-300', dot: 'bg-rose-400', icon: AlertTriangle },
  DESCARREGANDO: { label: 'Descarregando', cor: 'text-amber-300', dot: 'bg-amber-400', icon: PackageOpen },
  RETORNANDO: { label: 'Retornando à base', cor: 'text-emerald-300', dot: 'bg-emerald-400', icon: CheckCircle2 },
};

/* Deriva frota "ao vivo" a partir dos motoristas; complementa com mocks se vazio. */
function derivarFrota(motoristas: Motorista[]): Veiculo[] {
  const base: Veiculo[] = motoristas
    .filter((m) => m.stops.length > 0)
    .map((m, i) => {
      const feitas = m.stops.filter((s) => s.status === 'DELIVERED').length;
      const statusPool: StatusFrota[] = ['EM_ROTA', 'ATRASADO', 'DESCARREGANDO', 'RETORNANDO'];
      const status = statusPool[i % statusPool.length];
      const prox = m.stops.find((s) => s.status !== 'DELIVERED');
      const detalhe =
        status === 'ATRASADO'
          ? `Em rota p/ ${prox?.clienteNome || 'cliente'} — atrasado 10 min`
          : status === 'DESCARREGANDO'
          ? `Descarregando em ${prox?.clienteNome || 'cliente'}`
          : status === 'RETORNANDO'
          ? 'Todas entregues — voltando à base'
          : `Em rota p/ ${prox?.clienteNome || 'cliente'}`;
      const [lat, lng] = coordDaRegiao(m.regiao, i);
      return {
        id: m.id,
        nome: m.motoristaNome,
        placa: m.placaVeiculo,
        regiao: m.regiao,
        status,
        detalhe,
        entregasFeitas: feitas,
        entregasTotal: m.stops.length,
        lat,
        lng,
        capacidadeKg: m.capacidadeKg,
        pesoTotalKg: m.stops.reduce((s, x) => s + x.pesoKg, 0),
        stops: m.stops.map((s) => ({
          ordem: s.ordem,
          numeroPedido: s.numeroPedido,
          clienteNome: s.clienteNome,
          pesoKg: s.pesoKg,
          status: s.status,
        })),
      };
    });

  if (base.length > 0) return base;

  // Frota de demonstração (com rotas detalhadas)
  const mock = (
    id: string,
    nome: string,
    placa: string,
    regiao: string,
    status: StatusFrota,
    detalhe: string,
    cap: number,
    stops: StopFrota[],
    idx: number,
  ): Veiculo => {
    const [lat, lng] = coordDaRegiao(regiao, idx);
    return {
      id,
      nome,
      placa,
      regiao,
      status,
      detalhe,
      entregasFeitas: stops.filter((s) => s.status === 'DELIVERED').length,
      entregasTotal: stops.length,
      lat,
      lng,
      capacidadeKg: cap,
      pesoTotalKg: stops.reduce((s, x) => s + x.pesoKg, 0),
      stops,
    };
  };

  return [
    mock('v1', 'João Silva', 'FRZ1A23', 'CENTRO', 'ATRASADO', 'Em rota p/ Empório Norte — atrasado 10 min', 8000, [
      { ordem: 1, numeroPedido: 2001, clienteNome: 'Bom Preço', pesoKg: 560, status: 'DELIVERED' },
      { ordem: 2, numeroPedido: 2002, clienteNome: 'Hortifruti Central', pesoKg: 1560, status: 'DELIVERED' },
      { ordem: 3, numeroPedido: 2006, clienteNome: 'Empório Norte', pesoKg: 900, status: 'IN_TRANSIT' },
      { ordem: 4, numeroPedido: 2011, clienteNome: 'Padaria Aurora', pesoKg: 720, status: 'PENDING' },
    ], 0),
    mock('v2', 'Pedro Santos', 'FRZ2B34', 'OESTE', 'EM_ROTA', 'Em rota p/ Atacadão Sul', 6000, [
      { ordem: 1, numeroPedido: 2003, clienteNome: 'Mercado do Zé', pesoKg: 1360, status: 'DELIVERED' },
      { ordem: 2, numeroPedido: 2004, clienteNome: 'Sabor & Cia', pesoKg: 1080, status: 'IN_TRANSIT' },
      { ordem: 3, numeroPedido: 2015, clienteNome: 'Atacadão Sul', pesoKg: 1520, status: 'PENDING' },
    ], 1),
    mock('v3', 'Antônio Rocha', 'EXV5E67', 'NORTE', 'DESCARREGANDO', 'Descarregando em Bom Preço', 13300, [
      { ordem: 1, numeroPedido: 2001, clienteNome: 'Bom Preço', pesoKg: 560, status: 'IN_TRANSIT' },
      { ordem: 2, numeroPedido: 2002, clienteNome: 'Hortifruti Central', pesoKg: 1560, status: 'PENDING' },
    ], 2),
    mock('v4', 'José Pereira', 'EXV6F78', 'LESTE', 'RETORNANDO', 'Todas entregues — voltando à base', 6000, [
      { ordem: 1, numeroPedido: 2007, clienteNome: 'Feira Leste', pesoKg: 1120, status: 'DELIVERED' },
      { ordem: 2, numeroPedido: 2008, clienteNome: 'Atacadão Sul', pesoKg: 980, status: 'DELIVERED' },
      { ordem: 3, numeroPedido: 2012, clienteNome: 'Mercado Boa Vista', pesoKg: 640, status: 'DELIVERED' },
    ], 3),
  ];
}

function MapaFrotas({ motoristas, onClose }: { motoristas: Motorista[]; onClose: () => void }) {
  const [frota] = useState<Veiculo[]>(() => derivarFrota(motoristas));
  const [selecionado, setSelecionado] = useState<string>(frota[0]?.id || '');
  const [estadoMapa, setEstadoMapa] = useState<'carregando' | 'ok' | 'erro'>('carregando');
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapInst = useRef<any>(null);
  const markers = useRef<Record<string, any>>({});

  // Fecha no ESC.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Inicializa o mapa real (Leaflet via CDN) + marcadores dos veículos.
  useEffect(() => {
    let cancel = false;
    setEstadoMapa('carregando');
    carregarLeaflet()
      .then((L) => {
        if (cancel || !mapEl.current) return;
        if (mapInst.current) {
          mapInst.current.remove();
          mapInst.current = null;
        }
        const map = L.map(mapEl.current, { zoomControl: true, attributionControl: false }).setView(
          [-23.55, -46.63],
          12,
        );
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd',
          maxZoom: 19,
        }).addTo(map);
        L.marker(BASE_COORD, { icon: baseDivIcon(L), zIndexOffset: 500 }).addTo(map);
        frota.forEach((v) => {
          const mk = L.marker([v.lat, v.lng], { icon: veiculoDivIcon(L, v, v.id === selecionado) }).addTo(map);
          mk.on('click', () => setSelecionado(v.id));
          markers.current[v.id] = mk;
        });
        mapInst.current = map;
        setEstadoMapa('ok');
        setTimeout(() => {
          try {
            map.invalidateSize();
          } catch {
            /* noop */
          }
        }, 250);
      })
      .catch(() => {
        if (!cancel) setEstadoMapa('erro');
      });
    return () => {
      cancel = true;
      if (mapInst.current) {
        mapInst.current.remove();
        mapInst.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recolore os marcadores e voa até o veículo selecionado.
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapInst.current) return;
    frota.forEach((v) => {
      const mk = markers.current[v.id];
      if (mk) mk.setIcon(veiculoDivIcon(L, v, v.id === selecionado));
    });
    const v = frota.find((x) => x.id === selecionado);
    if (v) mapInst.current.flyTo([v.lat, v.lng], 13, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionado]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-6xl h-[82vh] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Header do modal */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Mapa de Frotas — Live Tracking</h2>
            <span className="ml-2 flex items-center gap-1.5 text-[11px] text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> {frota.length} veículos na rua
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white rounded-lg p-1.5 hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_340px] min-h-0">
          {/* Mapa real (Leaflet via CDN) */}
          <div className="relative bg-slate-800 min-h-[300px]">
            <div ref={mapEl} className="absolute inset-0 z-0" />

            {estadoMapa !== 'ok' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-800 text-slate-400">
                {estadoMapa === 'carregando' ? (
                  <>
                    <Loader2 className="h-7 w-7 animate-spin mb-2 text-sky-400" />
                    <p className="text-sm">Carregando mapa…</p>
                  </>
                ) : (
                  <div className="text-center px-6">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Sem conexão para carregar o mapa.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Verifique a internet — os motoristas continuam na lista ao lado.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* legenda */}
            <div className="absolute bottom-3 left-3 z-[500] flex flex-wrap gap-3 bg-slate-900/85 rounded-lg px-3 py-2 pointer-events-none">
              {(Object.keys(STATUS_META) as StatusFrota[]).map((s) => (
                <span key={s} className="flex items-center gap-1.5 text-[10px] text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} /> {STATUS_META[s].label}
                </span>
              ))}
            </div>
          </div>

          {/* Lista lateral de motoristas na rua */}
          <aside className="border-t lg:border-t-0 lg:border-l border-slate-700 bg-slate-900 overflow-y-auto">
            <div className="px-4 py-3 border-b border-slate-800">
              <p className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Motoristas na rua</p>
            </div>
            <div className="divide-y divide-slate-800">
              {frota.map((v) => {
                const meta = STATUS_META[v.status];
                const Icon = meta.icon;
                const ativo = v.id === selecionado;
                const pct = v.entregasTotal ? Math.round((v.entregasFeitas / v.entregasTotal) * 100) : 0;
                const ocup = v.capacidadeKg ? Math.min(100, Math.round((v.pesoTotalKg / v.capacidadeKg) * 100)) : 0;
                return (
                  <div key={v.id} className={ativo ? 'bg-slate-800/70' : 'hover:bg-slate-800/40'}>
                    <button onClick={() => setSelecionado(v.id)} className="w-full text-left px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${meta.dot}`} />
                          <p className="font-medium text-white truncate">{v.nome}</p>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">{v.placa}</span>
                      </div>
                      <p className={`text-[12px] mt-1 flex items-center gap-1.5 ${meta.cor}`}>
                        <Icon className="h-3.5 w-3.5 shrink-0" /> {v.detalhe}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-slate-700 overflow-hidden">
                          <div className={`h-full ${meta.dot}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {v.entregasFeitas}/{v.entregasTotal}
                        </span>
                      </div>
                    </button>

                    {/* Detalhes da rota — expandido ao selecionar o motorista */}
                    {ativo && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-800/70 animate-in fade-in">
                        <div className="grid grid-cols-3 gap-2 my-3">
                          <MiniStat label="Região" valor={v.regiao} />
                          <MiniStat label="Paradas" valor={String(v.entregasTotal)} />
                          <MiniStat label="Ocupação" valor={`${ocup}%`} />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span className="flex items-center gap-1">
                            <Weight className="h-3 w-3" /> Carga
                          </span>
                          <span>
                            {kg(v.pesoTotalKg)} / {kg(v.capacidadeKg)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden mb-3">
                          <div className={`h-full ${meta.dot}`} style={{ width: `${ocup}%` }} />
                        </div>

                        <p className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-2">
                          Paradas da rota
                        </p>
                        <ol className="space-y-1.5">
                          {v.stops.map((s) => {
                            const entregue = s.status === 'DELIVERED';
                            const emRota = s.status === 'IN_TRANSIT';
                            return (
                              <li key={`${v.id}-${s.ordem}`} className="flex items-center gap-2 text-[13px]">
                                <span
                                  className={`h-5 w-5 rounded-full text-[10px] flex items-center justify-center font-semibold shrink-0 ${
                                    entregue
                                      ? 'bg-emerald-500 text-white'
                                      : emRota
                                      ? 'bg-sky-500 text-white'
                                      : 'bg-slate-700 text-slate-300'
                                  }`}
                                >
                                  {entregue ? <CheckCircle2 className="h-3 w-3" /> : s.ordem}
                                </span>
                                <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                                <span className="truncate flex-1 text-slate-200">
                                  #{s.numeroPedido} · {s.clienteNome}
                                </span>
                                <span className="text-[11px] text-slate-500 shrink-0">{kg(s.pesoKg)}</span>
                                {entregue && <span className="text-[10px] text-emerald-400 shrink-0">ok</span>}
                                {emRota && <span className="text-[10px] text-sky-400 shrink-0">agora</span>}
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg bg-slate-900/60 border border-slate-700 px-2 py-1.5 text-center">
      <p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-100 truncate">{valor}</p>
    </div>
  );
}
