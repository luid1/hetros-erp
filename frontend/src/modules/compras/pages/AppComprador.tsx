import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutGrid,
  Boxes,
  Truck,
  Search,
  Plus,
  Check,
  X,
  MapPin,
  ShieldAlert,
  Loader2,
  TrendingDown,
  Package,
  ArrowRight,
  Navigation,
  BadgeCheck,
  AlertTriangle,
  User,
  Wallet,
  ClipboardList,
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════════════════════════
   App de Compras & Abastecimento (Compradores) — Hetros WMS
   Simulação de smartphone: container centralizado, design "greige" sofisticado,
   tipografia oversized para dados vitais. Máquina de estados com 3 abas:
   Dashboard & CIs · Estoque & Nova CI · Recebimento (geofencing).
   ════════════════════════════════════════════════════════════════════════════ */

/* ───────────────────────────── Tipos ─────────────────────────────────────── */
type Aba = 'dashboard' | 'estoque' | 'recebimento';
type StatusCI = 'PENDENTE' | 'APROVADA' | 'REJEITADA';

interface CI {
  id: string;
  item: string;
  sku: string;
  solicitante: string;
  setor: string;
  valorEstimado: number;
  quantidade: number;
  unidade: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  status: StatusCI;
  criadaEm: string;
}

interface Produto {
  id: string;
  nome: string;
  sku: string;
  categoria: string;
  quantidade: number;
  minimo: number;
  unidade: string;
  custoMedio: number;
}

interface PedidoCompra {
  id: string;
  numero: string;
  fornecedor: string;
  itens: number;
  volumes: number;
  valor: number;
  previsao: string;
  placa: string;
  recebido: boolean;
}

/* ───────────────────────────── Mock data ─────────────────────────────────── */
const ORCAMENTO_INICIAL = 45000;

const CIS_INICIAIS: CI[] = [
  {
    id: 'ci-1001',
    item: 'Filme Stretch Industrial 500mm',
    sku: 'EMB-STR-500',
    solicitante: 'Marcos Aurélio',
    setor: 'Expedição',
    valorEstimado: 3480,
    quantidade: 40,
    unidade: 'rolos',
    estoqueAtual: 6,
    estoqueMinimo: 50,
    status: 'PENDENTE',
    criadaEm: 'Hoje, 08:12',
  },
  {
    id: 'ci-1002',
    item: 'Etiqueta Térmica 100x150mm',
    sku: 'ETQ-TER-100',
    solicitante: 'Juliana Reis',
    setor: 'Recebimento',
    valorEstimado: 1290,
    quantidade: 30,
    unidade: 'milheiros',
    estoqueAtual: 22,
    estoqueMinimo: 25,
    status: 'PENDENTE',
    criadaEm: 'Hoje, 07:55',
  },
  {
    id: 'ci-1003',
    item: 'Paletes PBR Madeira (novo)',
    sku: 'PAL-PBR-01',
    solicitante: 'Cláudio Mendes',
    setor: 'Armazenagem',
    valorEstimado: 8750,
    quantidade: 250,
    unidade: 'un',
    estoqueAtual: 12,
    estoqueMinimo: 120,
    status: 'PENDENTE',
    criadaEm: 'Ontem, 17:40',
  },
  {
    id: 'ci-1004',
    item: 'Luva de Segurança Nitrílica',
    sku: 'EPI-LUV-NIT',
    solicitante: 'Fernanda Lopes',
    setor: 'Segurança do Trabalho',
    valorEstimado: 2160,
    quantidade: 120,
    unidade: 'pares',
    estoqueAtual: 48,
    estoqueMinimo: 60,
    status: 'PENDENTE',
    criadaEm: 'Ontem, 15:03',
  },
  {
    id: 'ci-1005',
    item: 'Fita Adesiva Transparente 48mm',
    sku: 'EMB-FIT-48',
    solicitante: 'Rafael Souza',
    setor: 'Expedição',
    valorEstimado: 960,
    quantidade: 200,
    unidade: 'un',
    estoqueAtual: 34,
    estoqueMinimo: 80,
    status: 'PENDENTE',
    criadaEm: 'Ontem, 11:20',
  },
];

const PRODUTOS_INICIAIS: Produto[] = [
  { id: 'p1', nome: 'Filme Stretch Industrial 500mm', sku: 'EMB-STR-500', categoria: 'Embalagem', quantidade: 6, minimo: 50, unidade: 'rolos', custoMedio: 87 },
  { id: 'p2', nome: 'Etiqueta Térmica 100x150mm', sku: 'ETQ-TER-100', categoria: 'Identificação', quantidade: 22, minimo: 25, unidade: 'milheiros', custoMedio: 43 },
  { id: 'p3', nome: 'Paletes PBR Madeira', sku: 'PAL-PBR-01', categoria: 'Movimentação', quantidade: 12, minimo: 120, unidade: 'un', custoMedio: 35 },
  { id: 'p4', nome: 'Luva Nitrílica (par)', sku: 'EPI-LUV-NIT', categoria: 'EPI', quantidade: 48, minimo: 60, unidade: 'pares', custoMedio: 18 },
  { id: 'p5', nome: 'Fita Adesiva 48mm', sku: 'EMB-FIT-48', categoria: 'Embalagem', quantidade: 34, minimo: 80, unidade: 'un', custoMedio: 4.8 },
  { id: 'p6', nome: 'Caixa Papelão 60x40x40', sku: 'EMB-CX-604040', categoria: 'Embalagem', quantidade: 320, minimo: 150, unidade: 'un', custoMedio: 6.2 },
  { id: 'p7', nome: 'Bobina Plástica Bolha', sku: 'EMB-BOL-01', categoria: 'Embalagem', quantidade: 9, minimo: 40, unidade: 'rolos', custoMedio: 52 },
  { id: 'p8', nome: 'Capacete Segurança Branco', sku: 'EPI-CAP-BR', categoria: 'EPI', quantidade: 75, minimo: 30, unidade: 'un', custoMedio: 22 },
];

const PEDIDOS_COMPRA: PedidoCompra[] = [
  { id: 'oc1', numero: 'OC-2025-0481', fornecedor: 'Embalagens Vitória Ltda', itens: 3, volumes: 48, valor: 12340, previsao: 'Hoje, 14:00', placa: 'FKR-2E19', recebido: false },
  { id: 'oc2', numero: 'OC-2025-0482', fornecedor: 'Paletes do Brasil S.A.', itens: 1, volumes: 250, valor: 8750, previsao: 'Hoje, 16:30', placa: 'BQT-7A88', recebido: false },
  { id: 'oc3', numero: 'OC-2025-0479', fornecedor: 'SafeWork EPIs', itens: 4, volumes: 22, valor: 4380, previsao: 'Amanhã, 09:00', placa: 'GHD-1C05', recebido: false },
];

/* Coordenadas mockadas do Centro de Distribuição (CD Matriz — São Paulo). */
const CD_COORD = { lat: -23.5478, lng: -46.6389 };
const RAIO_PERMITIDO_M = 200;

/* ───────────────────────────── Helpers ───────────────────────────────────── */
const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

const num = (v: number) => v.toLocaleString('pt-BR');

/** Distância Haversine em metros entre dois pontos geográficos. */
function distanciaMetros(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000; // raio da Terra em metros
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nível de necessidade a partir do estoque atual vs. mínimo (0..1, quanto menor mais crítico). */
function nivelEstoque(atual: number, minimo: number): number {
  if (minimo <= 0) return 1;
  return Math.max(0, Math.min(1, atual / minimo));
}

/* ══════════════════════════════════════════════════════════════════════════════
   COMPONENTE RAIZ
   ════════════════════════════════════════════════════════════════════════════ */
export default function AppComprador() {
  const [aba, setAba] = useState<Aba>('dashboard');
  const [orcamento, setOrcamento] = useState(ORCAMENTO_INICIAL);
  const [cis, setCis] = useState<CI[]>(CIS_INICIAIS);
  const [produtos, setProdutos] = useState<Produto[]>(PRODUTOS_INICIAIS);
  const [pedidos, setPedidos] = useState<PedidoCompra[]>(PEDIDOS_COMPRA);

  // Toast interno do app (feedback flutuante)
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'erro' | 'info' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificar = useCallback((msg: string, tone: 'ok' | 'erro' | 'info' = 'info') => {
    setToast({ msg, tone });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // Modal "Nova CI"
  const [modalNovaCI, setModalNovaCI] = useState(false);
  const [prefillProduto, setPrefillProduto] = useState<Produto | null>(null);

  /* ── Regras de negócio ── */
  const aprovarCI = useCallback(
    (id: string) => {
      setCis((prev) => {
        const ci = prev.find((c) => c.id === id);
        if (!ci || ci.status !== 'PENDENTE') return prev;
        if (ci.valorEstimado > orcamento) {
          notificar('Orçamento insuficiente para aprovar esta CI.', 'erro');
          return prev;
        }
        setOrcamento((o) => o - ci.valorEstimado);
        notificar(`CI aprovada · ${brl(ci.valorEstimado)} debitados`, 'ok');
        return prev.map((c) => (c.id === id ? { ...c, status: 'APROVADA' } : c));
      });
    },
    [orcamento, notificar],
  );

  const rejeitarCI = useCallback(
    (id: string) => {
      setCis((prev) =>
        prev.map((c) => (c.id === id && c.status === 'PENDENTE' ? { ...c, status: 'REJEITADA' } : c)),
      );
      notificar('CI rejeitada.', 'info');
    },
    [notificar],
  );

  const criarCI = useCallback(
    (dados: {
      item: string;
      sku: string;
      quantidade: number;
      unidade: string;
      valorEstimado: number;
      estoqueAtual: number;
      estoqueMinimo: number;
    }) => {
      const nova: CI = {
        id: `ci-${Date.now()}`,
        item: dados.item,
        sku: dados.sku || '—',
        solicitante: 'Você (Comprador)',
        setor: 'Suprimentos',
        valorEstimado: dados.valorEstimado,
        quantidade: dados.quantidade,
        unidade: dados.unidade || 'un',
        estoqueAtual: dados.estoqueAtual,
        estoqueMinimo: dados.estoqueMinimo,
        status: 'PENDENTE',
        criadaEm: 'Agora',
      };
      setCis((prev) => [nova, ...prev]);
      setModalNovaCI(false);
      setPrefillProduto(null);
      setAba('dashboard');
      notificar('Nova CI criada e enviada para aprovação.', 'ok');
    },
    [notificar],
  );

  const confirmarRecebimento = useCallback(
    (id: string) => {
      setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, recebido: true } : p)));
      const oc = pedidos.find((p) => p.id === id);
      // Dá entrada no estoque dos produtos relacionados (mock: soma volumes ao 1º match por fornecedor).
      if (oc) {
        setProdutos((prev) =>
          prev.map((p, i) => (i === 0 ? { ...p, quantidade: p.quantidade + oc.volumes } : p)),
        );
      }
      notificar(`Entrada confirmada · ${oc?.numero ?? ''}`, 'ok');
    },
    [pedidos, notificar],
  );

  const abrirNovaCIComProduto = useCallback((p: Produto) => {
    setPrefillProduto(p);
    setModalNovaCI(true);
  }, []);

  const cisPendentes = useMemo(() => cis.filter((c) => c.status === 'PENDENTE'), [cis]);
  const cisResolvidas = useMemo(() => cis.filter((c) => c.status !== 'PENDENTE'), [cis]);
  const pctOrcamento = Math.max(0, Math.min(100, (orcamento / ORCAMENTO_INICIAL) * 100));

  return (
    <div className="min-h-full w-full flex items-center justify-center bg-neutral-200/60 py-6 px-4">
      {/* ── Moldura do smartphone ── */}
      <div className="relative w-full max-w-[400px] h-[820px] bg-[#FAFAFA] rounded-[2.75rem] shadow-2xl ring-1 ring-black/10 overflow-hidden flex flex-col">
        {/* Notch */}
        <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-30 pointer-events-none">
          <div className="mt-2 h-5 w-32 bg-black rounded-full" />
        </div>

        {/* Status bar simulada */}
        <div className="shrink-0 pt-3 pb-1 px-6 flex items-center justify-between text-[11px] font-medium text-neutral-500">
          <span>9:41</span>
          <span className="tracking-widest">HETROS · SUPRIMENTOS</span>
          <span>100%</span>
        </div>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {aba === 'dashboard' && (
            <DashboardTab
              orcamento={orcamento}
              pctOrcamento={pctOrcamento}
              cisPendentes={cisPendentes}
              cisResolvidas={cisResolvidas}
              onAprovar={aprovarCI}
              onRejeitar={rejeitarCI}
            />
          )}
          {aba === 'estoque' && (
            <EstoqueTab produtos={produtos} onNovaCI={() => setModalNovaCI(true)} onReporProduto={abrirNovaCIComProduto} />
          )}
          {aba === 'recebimento' && (
            <RecebimentoTab pedidos={pedidos} onConfirmar={confirmarRecebimento} notificar={notificar} />
          )}
        </div>

        {/* ── Bottom Tabs ── */}
        <nav className="shrink-0 bg-white/90 backdrop-blur border-t border-neutral-200 px-3 pt-2 pb-5 grid grid-cols-3 gap-1">
          <TabButton ativo={aba === 'dashboard'} icon={LayoutGrid} label="CIs" onClick={() => setAba('dashboard')} badge={cisPendentes.length} />
          <TabButton ativo={aba === 'estoque'} icon={Boxes} label="Estoque" onClick={() => setAba('estoque')} />
          <TabButton ativo={aba === 'recebimento'} icon={Truck} label="Recebimento" onClick={() => setAba('recebimento')} />
        </nav>

        {/* ── Toast ── */}
        {toast && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-24 z-40 w-[86%]">
            <div
              className={`rounded-2xl px-4 py-3 text-sm font-medium shadow-lg flex items-center gap-2 ${
                toast.tone === 'ok'
                  ? 'bg-emerald-900 text-emerald-50'
                  : toast.tone === 'erro'
                    ? 'bg-rose-900 text-rose-50'
                    : 'bg-neutral-900 text-neutral-50'
              }`}
            >
              {toast.tone === 'ok' ? (
                <BadgeCheck className="h-4 w-4 shrink-0" />
              ) : toast.tone === 'erro' ? (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              ) : (
                <ClipboardList className="h-4 w-4 shrink-0" />
              )}
              <span>{toast.msg}</span>
            </div>
          </div>
        )}

        {/* ── Modal Nova CI ── */}
        {modalNovaCI && (
          <NovaCIModal
            prefill={prefillProduto}
            onClose={() => {
              setModalNovaCI(false);
              setPrefillProduto(null);
            }}
            onSubmit={criarCI}
          />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ABA 1 — DASHBOARD & CIs
   ════════════════════════════════════════════════════════════════════════════ */
function DashboardTab({
  orcamento,
  pctOrcamento,
  cisPendentes,
  cisResolvidas,
  onAprovar,
  onRejeitar,
}: {
  orcamento: number;
  pctOrcamento: number;
  cisPendentes: CI[];
  cisResolvidas: CI[];
  onAprovar: (id: string) => void;
  onRejeitar: (id: string) => void;
}) {
  return (
    <div className="pb-6">
      {/* Header do orçamento (oversized) */}
      <header className="px-6 pt-4 pb-6 bg-gradient-to-b from-[#EFEBE4] to-[#FAFAFA]">
        <div className="flex items-center gap-2 text-neutral-500">
          <Wallet className="h-4 w-4" />
          <p className="text-[13px] uppercase tracking-[0.18em] font-semibold">Orçamento disponível</p>
        </div>
        <p className="mt-2 text-[52px] leading-none font-semibold tracking-tight text-neutral-900 tabular-nums">
          {brl(orcamento)}
        </p>
        <div className="mt-4 h-2 rounded-full bg-neutral-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              pctOrcamento < 20 ? 'bg-rose-500' : pctOrcamento < 50 ? 'bg-amber-500' : 'bg-neutral-800'
            }`}
            style={{ width: `${pctOrcamento}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500">
          <span>{pctOrcamento.toFixed(0)}% do ciclo</span>
          <span>Meta mensal · {brl(ORCAMENTO_INICIAL)}</span>
        </div>
      </header>

      {/* Lista de CIs pendentes */}
      <section className="px-4">
        <div className="flex items-center justify-between px-2 mb-3">
          <h2 className="text-[15px] font-semibold text-neutral-900">CIs pendentes</h2>
          <span className="text-[11px] font-medium text-neutral-500 bg-neutral-200/70 rounded-full px-2.5 py-1">
            {cisPendentes.length} aguardando
          </span>
        </div>

        {cisPendentes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-300 bg-white/60 py-14 text-center">
            <BadgeCheck className="h-9 w-9 mx-auto text-emerald-500 mb-2" />
            <p className="text-neutral-700 font-medium">Tudo em dia</p>
            <p className="text-[13px] text-neutral-400 mt-1">Nenhuma CI aguardando aprovação.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cisPendentes.map((ci) => (
              <CICard key={ci.id} ci={ci} onAprovar={() => onAprovar(ci.id)} onRejeitar={() => onRejeitar(ci.id)} />
            ))}
          </div>
        )}
      </section>

      {/* Histórico resolvido */}
      {cisResolvidas.length > 0 && (
        <section className="px-4 mt-7">
          <h3 className="px-2 mb-2 text-[12px] uppercase tracking-widest font-semibold text-neutral-400">
            Resolvidas hoje
          </h3>
          <div className="space-y-2">
            {cisResolvidas.map((ci) => (
              <div
                key={ci.id}
                className="flex items-center gap-3 rounded-2xl bg-white border border-neutral-200 px-4 py-3"
              >
                <span
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    ci.status === 'APROVADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {ci.status === 'APROVADA' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-neutral-800 truncate">{ci.item}</p>
                  <p className="text-[11px] text-neutral-400">
                    {ci.status === 'APROVADA' ? 'Aprovada' : 'Rejeitada'} · {ci.solicitante}
                  </p>
                </div>
                <p className="text-[13px] font-semibold text-neutral-500 tabular-nums">{brl(ci.valorEstimado)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Card de CI com swipe (arrastar) + botões ── */
function CICard({ ci, onAprovar, onRejeitar }: { ci: CI; onAprovar: () => void; onRejeitar: () => void }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [saindo, setSaindo] = useState<null | 'ok' | 'no'>(null);
  const startX = useRef(0);
  const LIMIAR = 96;

  const nivel = nivelEstoque(ci.estoqueAtual, ci.estoqueMinimo);
  const critico = nivel < 0.35;
  const alerta = nivel >= 0.35 && nivel < 0.7;

  const onDown = (clientX: number) => {
    setDragging(true);
    startX.current = clientX;
  };
  const onMove = (clientX: number) => {
    if (!dragging) return;
    setDx(clientX - startX.current);
  };
  const finalizar = () => {
    if (!dragging) return;
    setDragging(false);
    if (dx > LIMIAR) {
      setSaindo('ok');
      setTimeout(onAprovar, 220);
    } else if (dx < -LIMIAR) {
      setSaindo('no');
      setTimeout(onRejeitar, 220);
    } else {
      setDx(0);
    }
  };

  const progresso = Math.max(-1, Math.min(1, dx / LIMIAR));
  const revelaAprovar = dx > 8;
  const revelaRejeitar = dx < -8;

  return (
    <div className="relative select-none">
      {/* Fundos revelados no swipe */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden flex">
        <div
          className={`flex-1 bg-emerald-600 flex items-center pl-6 transition-opacity ${revelaAprovar ? 'opacity-100' : 'opacity-0'}`}
        >
          <Check className="h-6 w-6 text-white" />
          <span className="ml-2 text-white font-semibold text-sm">Aprovar</span>
        </div>
        <div
          className={`flex-1 bg-rose-600 flex items-center justify-end pr-6 transition-opacity ${revelaRejeitar ? 'opacity-100' : 'opacity-0'}`}
        >
          <span className="mr-2 text-white font-semibold text-sm">Rejeitar</span>
          <X className="h-6 w-6 text-white" />
        </div>
      </div>

      {/* Card */}
      <div
        className={`relative rounded-3xl bg-white border border-neutral-200 p-4 shadow-sm cursor-grab active:cursor-grabbing ${
          dragging ? '' : 'transition-transform duration-200'
        }`}
        style={{
          transform: saindo
            ? `translateX(${saindo === 'ok' ? 460 : -460}px) rotate(${saindo === 'ok' ? 6 : -6}deg)`
            : `translateX(${dx}px) rotate(${progresso * 2}deg)`,
          opacity: saindo ? 0 : 1,
        }}
        onMouseDown={(e) => onDown(e.clientX)}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseUp={finalizar}
        onMouseLeave={finalizar}
        onTouchStart={(e) => onDown(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={finalizar}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-neutral-900 leading-snug">{ci.item}</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {ci.sku} · {num(ci.quantidade)} {ci.unidade}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-neutral-400">Estimado</p>
            <p className="text-xl font-semibold text-neutral-900 tabular-nums leading-tight">{brl(ci.valorEstimado)}</p>
          </div>
        </div>

        {/* Solicitante */}
        <div className="mt-3 flex items-center gap-2 text-[12px] text-neutral-500">
          <span className="h-6 w-6 rounded-full bg-neutral-200 flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-neutral-500" />
          </span>
          <span className="font-medium text-neutral-700">{ci.solicitante}</span>
          <span className="text-neutral-300">·</span>
          <span>{ci.setor}</span>
          <span className="ml-auto text-neutral-300">{ci.criadaEm}</span>
        </div>

        {/* Termômetro de necessidade */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="flex items-center gap-1 font-medium text-neutral-500">
              <TrendingDown className="h-3.5 w-3.5" /> Termômetro de necessidade
            </span>
            <span
              className={`font-semibold ${critico ? 'text-rose-600' : alerta ? 'text-amber-600' : 'text-emerald-600'}`}
            >
              {critico ? 'CRÍTICO' : alerta ? 'BAIXO' : 'NORMAL'}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                critico ? 'bg-rose-500' : alerta ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(6, nivel * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-neutral-400">
            Estoque {num(ci.estoqueAtual)} / mínimo {num(ci.estoqueMinimo)} {ci.unidade}
          </p>
        </div>

        {/* Ações explícitas */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={onRejeitar}
            className="rounded-2xl border border-neutral-200 bg-neutral-50 text-neutral-700 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-neutral-100 active:scale-[0.98] transition"
          >
            <X className="h-4 w-4" /> Rejeitar
          </button>
          <button
            onClick={onAprovar}
            className="rounded-2xl bg-neutral-900 text-white py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-black active:scale-[0.98] transition shadow-sm"
          >
            <Check className="h-4 w-4" /> Aprovar
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-neutral-300">arraste o card para aprovar → ou ← rejeitar</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ABA 2 — ESTOQUE & NOVA CI
   ════════════════════════════════════════════════════════════════════════════ */
function EstoqueTab({
  produtos,
  onNovaCI,
  onReporProduto,
}: {
  produtos: Produto[];
  onNovaCI: () => void;
  onReporProduto: (p: Produto) => void;
}) {
  const [busca, setBusca] = useState('');
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter(
      (p) => p.nome.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q),
    );
  }, [busca, produtos]);

  const abaixoMinimo = produtos.filter((p) => p.quantidade < p.minimo).length;

  return (
    <div className="relative pb-24">
      <header className="px-6 pt-4 pb-3 bg-gradient-to-b from-[#EFEBE4] to-[#FAFAFA]">
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Estoque</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">
          {produtos.length} itens · <span className="text-rose-600 font-medium">{abaixoMinimo} abaixo do mínimo</span>
        </p>

        {/* Busca */}
        <div className="mt-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto, SKU ou categoria…"
            className="w-full rounded-2xl border border-neutral-200 bg-white pl-11 pr-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
          />
        </div>
      </header>

      {/* Lista de produtos */}
      <section className="px-4 mt-2 space-y-2.5">
        {filtrados.length === 0 && (
          <div className="rounded-3xl border border-dashed border-neutral-300 py-12 text-center text-neutral-400 text-sm">
            Nenhum produto encontrado.
          </div>
        )}
        {filtrados.map((p) => {
          const critico = p.quantidade < p.minimo;
          const nivel = nivelEstoque(p.quantidade, p.minimo);
          return (
            <div key={p.id} className="rounded-3xl bg-white border border-neutral-200 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-neutral-900 truncate">{p.nome}</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {p.sku} · {p.categoria}
                  </p>
                </div>
                {/* Quantidade oversized */}
                <div className="text-right shrink-0">
                  <p
                    className={`text-[34px] leading-none font-semibold tabular-nums ${critico ? 'text-rose-600' : 'text-neutral-900'}`}
                  >
                    {num(p.quantidade)}
                  </p>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wide">{p.unidade}</p>
                </div>
              </div>

              <div className="mt-3 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${critico ? 'bg-rose-500' : nivel < 0.7 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.max(6, nivel * 100)}%` }}
                />
              </div>

              <div className="mt-2.5 flex items-center justify-between">
                <span className={`text-[11px] font-medium ${critico ? 'text-rose-600' : 'text-neutral-400'}`}>
                  {critico ? 'Abaixo do mínimo' : 'Nível adequado'} · mín. {num(p.minimo)}
                </span>
                {critico && (
                  <button
                    onClick={() => onReporProduto(p)}
                    className="text-[12px] font-semibold text-neutral-900 flex items-center gap-1 hover:gap-1.5 transition-all"
                  >
                    Repor <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* FAB — Nova CI */}
      <button
        onClick={onNovaCI}
        className="fixed sm:absolute bottom-24 right-5 z-20 rounded-2xl bg-neutral-900 text-white pl-4 pr-5 py-3.5 shadow-xl shadow-black/25 flex items-center gap-2 font-semibold text-sm hover:bg-black active:scale-95 transition"
      >
        <Plus className="h-5 w-5" /> Criar Nova CI
      </button>
    </div>
  );
}

/* ── Modal de criação de CI ── */
function NovaCIModal({
  prefill,
  onClose,
  onSubmit,
}: {
  prefill: Produto | null;
  onClose: () => void;
  onSubmit: (dados: {
    item: string;
    sku: string;
    quantidade: number;
    unidade: string;
    valorEstimado: number;
    estoqueAtual: number;
    estoqueMinimo: number;
  }) => void;
}) {
  const [item, setItem] = useState(prefill?.nome ?? '');
  const [sku, setSku] = useState(prefill?.sku ?? '');
  const [unidade, setUnidade] = useState(prefill?.unidade ?? 'un');
  const [quantidade, setQuantidade] = useState<string>(
    prefill ? String(Math.max(1, prefill.minimo - prefill.quantidade)) : '',
  );
  const [custoUnit, setCustoUnit] = useState<string>(prefill ? String(prefill.custoMedio) : '');
  const [estoqueAtual, setEstoqueAtual] = useState<string>(prefill ? String(prefill.quantidade) : '0');
  const [estoqueMinimo, setEstoqueMinimo] = useState<string>(prefill ? String(prefill.minimo) : '0');

  const qtd = Number(quantidade) || 0;
  const custo = Number(custoUnit) || 0;
  const total = qtd * custo;
  const valido = item.trim().length >= 3 && qtd > 0 && custo > 0;

  const submeter = () => {
    if (!valido) return;
    onSubmit({
      item: item.trim(),
      sku: sku.trim(),
      quantidade: qtd,
      unidade,
      valorEstimado: total,
      estoqueAtual: Number(estoqueAtual) || 0,
      estoqueMinimo: Number(estoqueMinimo) || 0,
    });
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-[#FAFAFA] rounded-t-[2rem] max-h-[92%] overflow-y-auto animate-[slideUp_.25s_ease-out]">
        {/* Handle + header */}
        <div className="sticky top-0 bg-[#FAFAFA] px-6 pt-3 pb-4 z-10">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-neutral-300 mb-4" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Nova CI</h2>
              <p className="text-[12px] text-neutral-400">Comunicação Interna de compra</p>
            </div>
            <button onClick={onClose} className="h-9 w-9 rounded-full bg-neutral-200 flex items-center justify-center">
              <X className="h-4 w-4 text-neutral-600" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-8 space-y-4">
          <Campo label="Item / Descrição">
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="Ex.: Filme Stretch 500mm"
              className="campo"
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="SKU">
              <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="EMB-000" className="campo" />
            </Campo>
            <Campo label="Unidade">
              <select value={unidade} onChange={(e) => setUnidade(e.target.value)} className="campo">
                <option value="un">un</option>
                <option value="rolos">rolos</option>
                <option value="pares">pares</option>
                <option value="milheiros">milheiros</option>
                <option value="caixas">caixas</option>
                <option value="kg">kg</option>
              </select>
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Quantidade">
              <input
                inputMode="numeric"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="campo"
              />
            </Campo>
            <Campo label="Custo unit. (R$)">
              <input
                inputMode="decimal"
                value={custoUnit}
                onChange={(e) => setCustoUnit(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))}
                placeholder="0,00"
                className="campo"
              />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Estoque atual">
              <input
                inputMode="numeric"
                value={estoqueAtual}
                onChange={(e) => setEstoqueAtual(e.target.value.replace(/\D/g, ''))}
                className="campo"
              />
            </Campo>
            <Campo label="Estoque mínimo">
              <input
                inputMode="numeric"
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(e.target.value.replace(/\D/g, ''))}
                className="campo"
              />
            </Campo>
          </div>

          {/* Total estimado (oversized) */}
          <div className="rounded-3xl bg-[#EFEBE4] p-5">
            <p className="text-[12px] uppercase tracking-widest text-neutral-500 font-semibold">Valor estimado</p>
            <p className="text-[40px] leading-none font-semibold text-neutral-900 tabular-nums mt-1">{brl(total)}</p>
            <p className="text-[12px] text-neutral-500 mt-1">
              {num(qtd)} {unidade} × {brl(custo)}
            </p>
          </div>

          <button
            disabled={!valido}
            onClick={submeter}
            className="w-full rounded-2xl bg-neutral-900 text-white py-4 text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black active:scale-[0.99] transition shadow-lg"
          >
            <Plus className="h-5 w-5" /> Enviar CI para aprovação
          </button>
        </div>
      </div>

      {/* estilos utilitários locais */}
      <style>{`
        .campo {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #e5e5e5;
          background: #fff;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          color: #262626;
          outline: none;
        }
        .campo:focus { border-color: #a3a3a3; box-shadow: 0 0 0 3px rgba(0,0,0,0.05); }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-neutral-500 mb-1.5 ml-1">{label}</span>
      {children}
    </label>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ABA 3 — RECEBIMENTO (Gatekeeper de Geolocalização)
   ════════════════════════════════════════════════════════════════════════════ */
type GeoEstado = 'idle' | 'carregando' | 'permitido' | 'bloqueado' | 'negado' | 'indisponivel';

function RecebimentoTab({
  pedidos,
  onConfirmar,
  notificar,
}: {
  pedidos: PedidoCompra[];
  onConfirmar: (id: string) => void;
  notificar: (msg: string, tone?: 'ok' | 'erro' | 'info') => void;
}) {
  const [estado, setEstado] = useState<GeoEstado>('idle');
  const [distancia, setDistancia] = useState<number | null>(null);
  const [erroMsg, setErroMsg] = useState('');
  const [simularNoLocal, setSimularNoLocal] = useState(false);

  const verificarLocalizacao = useCallback(() => {
    setEstado('carregando');
    setErroMsg('');

    // Modo simulação: teletransporta o operador para dentro do CD (para testes/demonstração).
    if (simularNoLocal) {
      setTimeout(() => {
        setDistancia(42);
        setEstado('permitido');
      }, 700);
      return;
    }

    if (!('geolocation' in navigator)) {
      setEstado('indisponivel');
      setErroMsg('Este dispositivo não suporta geolocalização.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const atual = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const d = distanciaMetros(atual, CD_COORD);
        setDistancia(d);
        if (d <= RAIO_PERMITIDO_M) {
          setEstado('permitido');
        } else {
          setEstado('bloqueado');
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setEstado('negado');
          setErroMsg('Permissão de localização negada. Autorize o acesso para operar o recebimento.');
        } else {
          setEstado('indisponivel');
          setErroMsg('Não foi possível obter sua localização. Tente novamente.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [simularNoLocal]);

  const pendentes = pedidos.filter((p) => !p.recebido);
  const recebidos = pedidos.filter((p) => p.recebido);

  return (
    <div className="pb-6">
      <header className="px-6 pt-4 pb-3 bg-gradient-to-b from-[#EFEBE4] to-[#FAFAFA]">
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Recebimento</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">Entrada física de mercadorias no CD</p>

        {/* Toggle simulação (dev) */}
        <label className="mt-3 flex items-center gap-2 text-[11px] text-neutral-500 select-none">
          <span className="relative inline-flex">
            <input
              type="checkbox"
              checked={simularNoLocal}
              onChange={(e) => {
                setSimularNoLocal(e.target.checked);
                setEstado('idle');
                setDistancia(null);
              }}
              className="peer sr-only"
            />
            <span className="h-5 w-9 rounded-full bg-neutral-300 peer-checked:bg-neutral-900 transition-colors" />
            <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
          </span>
          Simular presença no CD (demonstração)
        </label>
      </header>

      <div className="px-4 mt-2">
        {/* Estados iniciais / bloqueio */}
        {(estado === 'idle' || estado === 'carregando') && (
          <div className="rounded-3xl bg-white border border-neutral-200 p-6 text-center shadow-sm">
            <div className="mx-auto h-16 w-16 rounded-full bg-[#EFEBE4] flex items-center justify-center mb-4">
              <Navigation className={`h-7 w-7 text-neutral-700 ${estado === 'carregando' ? 'animate-pulse' : ''}`} />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900">Validação de perímetro</h2>
            <p className="text-[13px] text-neutral-500 mt-1 leading-relaxed">
              O recebimento físico exige que você esteja dentro do raio de{' '}
              <strong className="text-neutral-700">{RAIO_PERMITIDO_M} m</strong> do Centro de Distribuição.
            </p>
            <button
              onClick={verificarLocalizacao}
              disabled={estado === 'carregando'}
              className="mt-5 w-full rounded-2xl bg-neutral-900 text-white py-3.5 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-black active:scale-[0.99] transition disabled:opacity-60"
            >
              {estado === 'carregando' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Localizando…
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4" /> Validar minha localização
                </>
              )}
            </button>
          </div>
        )}

        {(estado === 'bloqueado' || estado === 'negado' || estado === 'indisponivel') && (
          <div className="rounded-3xl bg-white border border-rose-200 p-6 text-center shadow-sm">
            <div className="mx-auto h-16 w-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
              <ShieldAlert className="h-7 w-7 text-rose-600" />
            </div>
            <h2 className="text-lg font-semibold text-rose-700">Acesso Negado</h2>
            <p className="text-[13px] text-neutral-600 mt-2 leading-relaxed">
              {estado === 'bloqueado'
                ? 'O recebimento físico só pode ser operado dentro do perímetro do Centro de Distribuição.'
                : erroMsg}
            </p>
            {estado === 'bloqueado' && distancia != null && (
              <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-100 py-3">
                <p className="text-[11px] uppercase tracking-widest text-rose-400 font-semibold">Distância do CD</p>
                <p className="text-[40px] leading-none font-semibold text-rose-700 tabular-nums mt-1">
                  {distancia >= 1000 ? `${(distancia / 1000).toFixed(1)} km` : `${Math.round(distancia)} m`}
                </p>
                <p className="text-[11px] text-rose-400 mt-1">Limite permitido: {RAIO_PERMITIDO_M} m</p>
              </div>
            )}
            <button
              onClick={verificarLocalizacao}
              className="mt-5 w-full rounded-2xl border border-neutral-300 text-neutral-700 py-3 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-neutral-50 active:scale-[0.99] transition"
            >
              <Navigation className="h-4 w-4" /> Tentar novamente
            </button>
          </div>
        )}

        {/* Liberado — lista de OCs */}
        {estado === 'permitido' && (
          <>
            <div className="rounded-3xl bg-emerald-900 text-emerald-50 p-4 flex items-center gap-3 shadow-sm">
              <div className="h-11 w-11 rounded-full bg-emerald-800 flex items-center justify-center shrink-0">
                <BadgeCheck className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">Dentro do perímetro do CD</p>
                <p className="text-[12px] text-emerald-200/90">
                  {distancia != null ? `${Math.round(distancia)} m do ponto central` : 'Localização confirmada'} · recebimento
                  liberado
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 mt-5 mb-2">
              <h2 className="text-[15px] font-semibold text-neutral-900">Aguardando recebimento</h2>
              <span className="text-[11px] font-medium text-neutral-500 bg-neutral-200/70 rounded-full px-2.5 py-1">
                {pendentes.length} OCs
              </span>
            </div>

            {pendentes.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-neutral-300 py-12 text-center">
                <Package className="h-9 w-9 mx-auto text-neutral-300 mb-2" />
                <p className="text-neutral-500 text-sm font-medium">Nenhuma OC aguardando entrada.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendentes.map((oc) => (
                  <div key={oc.id} className="rounded-3xl bg-white border border-neutral-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-neutral-900">{oc.numero}</p>
                        <p className="text-[12px] text-neutral-500 truncate">{oc.fornecedor}</p>
                      </div>
                      <span className="shrink-0 text-[11px] font-medium text-neutral-500 bg-neutral-100 rounded-lg px-2 py-1">
                        {oc.placa}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-neutral-50 border border-neutral-100 py-2">
                        <p className="text-xl font-semibold text-neutral-900 tabular-nums leading-none">{oc.itens}</p>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wide mt-1">itens</p>
                      </div>
                      <div className="rounded-2xl bg-neutral-50 border border-neutral-100 py-2">
                        <p className="text-xl font-semibold text-neutral-900 tabular-nums leading-none">{oc.volumes}</p>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wide mt-1">volumes</p>
                      </div>
                      <div className="rounded-2xl bg-neutral-50 border border-neutral-100 py-2">
                        <p className="text-[13px] font-semibold text-neutral-900 tabular-nums leading-none pt-1">
                          {brl(oc.valor)}
                        </p>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wide mt-1">valor</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5" /> Previsão {oc.previsao}
                      </span>
                      <button
                        onClick={() => {
                          onConfirmar(oc.id);
                          notificar(`Entrada registrada · ${oc.numero}`, 'ok');
                        }}
                        className="rounded-2xl bg-neutral-900 text-white px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 hover:bg-black active:scale-95 transition shadow-sm"
                      >
                        <Check className="h-4 w-4" /> Confirmar Entrada
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recebidos.length > 0 && (
              <div className="mt-6">
                <h3 className="px-2 mb-2 text-[12px] uppercase tracking-widest font-semibold text-neutral-400">
                  Recebidos nesta sessão
                </h3>
                <div className="space-y-2">
                  {recebidos.map((oc) => (
                    <div
                      key={oc.id}
                      className="flex items-center gap-3 rounded-2xl bg-white border border-neutral-200 px-4 py-3"
                    >
                      <span className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-neutral-800 truncate">{oc.numero}</p>
                        <p className="text-[11px] text-neutral-400 truncate">{oc.fornecedor}</p>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-600">Entrada OK</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Bottom Tab Button
   ════════════════════════════════════════════════════════════════════════════ */
function TabButton({
  ativo,
  icon: Icon,
  label,
  onClick,
  badge,
}: {
  ativo: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 py-2 rounded-2xl transition ${
        ativo ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
      }`}
    >
      <span
        className={`relative flex items-center justify-center h-9 w-9 rounded-xl transition ${
          ativo ? 'bg-neutral-900 text-white' : 'bg-transparent'
        }`}
      >
        <Icon className="h-[18px] w-[18px]" />
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
            {badge}
          </span>
        )}
      </span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
