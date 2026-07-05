import { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Navigation,
  Camera,
  Check,
  Eraser,
  Loader2,
  CircleDot,
  Clock,
  Route as RouteIcon,
  Map as MapIcon,
  PenLine,
  Phone,
  Package,
} from 'lucide-react';
import { rotasApi } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from '../../../components/ui/feedback';

/**
 * App do Motorista — simulação fiel de um app de entregas nativo (pronto p/ Capacitor).
 * Tema dark/navy. Bottom navigation com 3 abas:
 *   • Rota Atual  → timeline vertical das paradas com ações
 *   • Mapa        → foco na parada atual + botão gigante Waze/Maps
 *   • Finalizar   → canhoto digital (canvas de assinatura real + foto + GPS)
 */

type Aba = 'rota' | 'mapa' | 'finalizar';

interface Parada {
  id: string;
  pedidoId: string;
  numero: number;
  cliente: string;
  endereco: string;
  janela: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED';
  pesoKg: number;
  volumes: number;
  telefone?: string;
}

/* ── Paradas de demonstração (usadas quando não há rota real na API) ── */
const PARADAS_MOCK: Parada[] = [
  {
    id: 's1',
    pedidoId: 'mock-1',
    numero: 2001,
    cliente: 'Bom Preço — Bela Vista',
    endereco: 'Av. Paulista, 1500 — Bela Vista, São Paulo/SP',
    janela: '08:00 — 10:00',
    status: 'PENDING',
    pesoKg: 1240,
    volumes: 62,
    telefone: '(11) 3000-0001',
  },
  {
    id: 's2',
    pedidoId: 'mock-2',
    numero: 2002,
    cliente: 'Hortifruti Central',
    endereco: 'Rua da Cantareira, 306 — Centro, São Paulo/SP',
    janela: '10:00 — 12:00',
    status: 'PENDING',
    pesoKg: 1200,
    volumes: 60,
    telefone: '(11) 3000-0002',
  },
  {
    id: 's3',
    pedidoId: 'mock-3',
    numero: 2003,
    cliente: 'Mercado do Zé — Pinheiros',
    endereco: 'Rua dos Pinheiros, 820 — Pinheiros, São Paulo/SP',
    janela: '13:00 — 15:00',
    status: 'PENDING',
    pesoKg: 1360,
    volumes: 68,
    telefone: '(11) 3000-0003',
  },
];

export default function AppMotorista() {
  const { user } = useAuth() as any;
  const motorista = user?.nome || 'Motorista';

  const [aba, setAba] = useState<Aba>('rota');
  const [paradas, setParadas] = useState<Parada[]>(PARADAS_MOCK);
  const [ativaIdx, setAtivaIdx] = useState(0);
  const [carregando, setCarregando] = useState(false);

  // Canhoto
  const [recebedor, setRecebedor] = useState('');
  const [recebedorDoc, setRecebedorDoc] = useState('');
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const paradaAtiva = paradas[ativaIdx] || paradas.find((p) => p.status !== 'DELIVERED') || paradas[0];
  const pendentes = paradas.filter((p) => p.status !== 'DELIVERED').length;
  const total = paradas.length;
  const progresso = total ? Math.round(((total - pendentes) / total) * 100) : 0;

  /* ── Carrega rota real do motorista (se houver) ── */
  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!user?.nome) return;
      setCarregando(true);
      try {
        const { data } = await rotasApi.doMotorista(user.nome);
        const rotas = data || [];
        const stops: Parada[] = [];
        rotas.forEach((r: any) =>
          (r.stops || []).forEach((s: any) =>
            stops.push({
              id: s.id,
              pedidoId: s.pedidoId,
              numero: s.numeroPedido,
              cliente: s.clienteNome || '—',
              endereco: s.endereco || '—',
              janela:
                s.janelaInicio && s.janelaFim
                  ? `${s.janelaInicio} — ${s.janelaFim}`
                  : 'Sem janela',
              status: s.status || 'PENDING',
              pesoKg: Number(s.pesoKg || 0),
              volumes: Number(s.volumes || 0),
            }),
          ),
        );
        if (vivo && stops.length > 0) {
          setParadas(stops);
          const idx = stops.findIndex((s) => s.status !== 'DELIVERED');
          setAtivaIdx(idx >= 0 ? idx : 0);
        }
      } catch {
        // Mantém as paradas de demonstração.
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [user?.nome]);

  function iniciarParada(idx: number) {
    setParadas((prev) => prev.map((p, i) => (i === idx ? { ...p, status: 'IN_TRANSIT' } : p)));
    setAtivaIdx(idx);
    setAba('mapa');
  }

  function irParaFinalizar(idx: number) {
    setAtivaIdx(idx);
    setAba('finalizar');
  }

  function capturarGps() {
    if (!navigator.geolocation) {
      toast('GPS indisponível neste dispositivo.', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast('📍 Localização capturada.', 'success');
      },
      () => toast('Não foi possível obter a localização.', 'error'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function onFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFotoBase64(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-8">
      {/* Moldura do celular */}
      <div className="relative w-[390px] max-w-full h-[820px] rounded-[2.5rem] bg-slate-950 border-[10px] border-slate-800 shadow-2xl shadow-black/60 overflow-hidden flex flex-col">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 bg-slate-800 rounded-b-2xl z-20" />

        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] text-slate-400 z-10">
          <span>09:41</span>
          <span className="flex items-center gap-1">
            {carregando && <Loader2 className="h-3 w-3 animate-spin" />} Hetros Driver
          </span>
        </div>

        {/* Header do app */}
        <header className="px-5 pt-2 pb-4 bg-gradient-to-b from-slate-800/80 to-transparent">
          <p className="text-[11px] uppercase tracking-[0.2em] text-sky-400/80 font-semibold">Entregas de hoje</p>
          <h1 className="text-xl font-semibold text-white truncate">{motorista}</h1>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>{total - pendentes} de {total} entregues</span>
              <span>{progresso}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progresso}%` }} />
            </div>
          </div>
        </header>

        {/* Conteúdo scrollável */}
        <main className="flex-1 overflow-y-auto px-4 pb-4">
          {aba === 'rota' && (
            <TimelineTab
              paradas={paradas}
              ativaIdx={ativaIdx}
              onIniciar={iniciarParada}
              onFinalizar={irParaFinalizar}
            />
          )}
          {aba === 'mapa' && (
            <MapaTab parada={paradaAtiva} onFinalizar={() => irParaFinalizar(ativaIdx)} />
          )}
          {aba === 'finalizar' && (
            <FinalizarTab
              parada={paradaAtiva}
              recebedor={recebedor}
              setRecebedor={setRecebedor}
              recebedorDoc={recebedorDoc}
              setRecebedorDoc={setRecebedorDoc}
              fotoBase64={fotoBase64}
              onFoto={onFoto}
              gps={gps}
              capturarGps={capturarGps}
              enviando={enviando}
              onConfirmar={async (assinaturaBase64: string) => {
                if (!recebedor.trim()) {
                  toast('Informe o nome de quem recebeu.', 'error');
                  return;
                }
                if (!assinaturaBase64) {
                  toast('Colete a assinatura no canhoto.', 'error');
                  return;
                }
                setEnviando(true);
                try {
                  const stopId = paradaAtiva.id;
                  const payload = {
                    latitude: gps?.lat ?? 0,
                    longitude: gps?.lng ?? 0,
                    assinaturaBase64,
                    fotoBase64: fotoBase64 || undefined,
                    recebedorNome: recebedor.trim(),
                    recebedorDoc: recebedorDoc.trim() || undefined,
                  };
                  // Tenta persistir; em modo demo apenas marca localmente.
                  if (!stopId.startsWith('mock') && !stopId.startsWith('s')) {
                    await rotasApi.confirmarEntrega(stopId, payload);
                  }
                  setParadas((prev) =>
                    prev.map((p, i) => (i === ativaIdx ? { ...p, status: 'DELIVERED' } : p)),
                  );
                  toast('✅ Entrega confirmada! Comprovante registrado.', 'success');
                  // Reset e próxima parada
                  setRecebedor('');
                  setRecebedorDoc('');
                  setFotoBase64(null);
                  setGps(null);
                  const prox = paradas.findIndex((p, i) => i !== ativaIdx && p.status !== 'DELIVERED');
                  if (prox >= 0) {
                    setAtivaIdx(prox);
                    setAba('rota');
                  } else {
                    setAba('rota');
                  }
                } catch (e: any) {
                  toast(e?.response?.data?.message || 'Falha ao confirmar entrega.', 'error');
                } finally {
                  setEnviando(false);
                }
              }}
            />
          )}
        </main>

        {/* Bottom navigation */}
        <nav className="grid grid-cols-3 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
          <TabButton label="Rota Atual" icon={RouteIcon} active={aba === 'rota'} onClick={() => setAba('rota')} />
          <TabButton label="Mapa" icon={MapIcon} active={aba === 'mapa'} onClick={() => setAba('mapa')} />
          <TabButton label="Finalizar" icon={PenLine} active={aba === 'finalizar'} onClick={() => setAba('finalizar')} />
        </nav>
      </div>
    </div>
  );
}

/* ────────────────────────── Bottom nav button ─────────────────────────────── */
function TabButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: any;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition ${
        active ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

/* ────────────────────────── Aba 1: Timeline ───────────────────────────────── */
function TimelineTab({
  paradas,
  ativaIdx,
  onIniciar,
  onFinalizar,
}: {
  paradas: Parada[];
  ativaIdx: number;
  onIniciar: (idx: number) => void;
  onFinalizar: (idx: number) => void;
}) {
  return (
    <div className="pt-2">
      <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">Sequência de paradas</h2>
      <ol className="relative">
        {paradas.map((p, idx) => {
          const entregue = p.status === 'DELIVERED';
          const emRota = p.status === 'IN_TRANSIT';
          const isLast = idx === paradas.length - 1;
          return (
            <li key={p.id} className="relative pl-9 pb-5">
              {/* Linha vertical */}
              {!isLast && <span className="absolute left-[13px] top-6 bottom-0 w-px bg-slate-700" />}
              {/* Bolinha */}
              <span
                className={`absolute left-0 top-1 h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  entregue
                    ? 'bg-emerald-500 text-white'
                    : emRota
                    ? 'bg-sky-500 text-white ring-4 ring-sky-500/20'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {entregue ? <Check className="h-4 w-4" /> : idx + 1}
              </span>

              <div
                className={`rounded-xl border p-3 ${
                  idx === ativaIdx && !entregue
                    ? 'border-sky-500/50 bg-sky-500/5'
                    : 'border-slate-800 bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white text-sm truncate">{p.cliente}</p>
                  <span className="text-[10px] text-slate-500">#{p.numero}</span>
                </div>
                <p className="text-[12px] text-slate-400 mt-0.5 flex items-start gap-1">
                  <MapPin className="h-3 w-3 mt-0.5 shrink-0" /> {p.endereco}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {p.janela}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" /> {p.volumes} cx
                  </span>
                </div>

                {!entregue && (
                  <div className="flex gap-2 mt-3">
                    {emRota ? (
                      <button
                        onClick={() => onFinalizar(idx)}
                        className="flex-1 rounded-lg bg-emerald-500 text-white text-[13px] font-semibold py-2 hover:bg-emerald-400"
                      >
                        Finalizar entrega
                      </button>
                    ) : (
                      <button
                        onClick={() => onIniciar(idx)}
                        className="flex-1 rounded-lg bg-sky-500 text-white text-[13px] font-semibold py-2 hover:bg-sky-400 flex items-center justify-center gap-1.5"
                      >
                        <Navigation className="h-3.5 w-3.5" /> Iniciar rota
                      </button>
                    )}
                  </div>
                )}
                {entregue && (
                  <p className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Entregue
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ────────────────────────── Aba 2: Mapa ───────────────────────────────────── */
function MapaTab({ parada, onFinalizar }: { parada: Parada; onFinalizar: () => void }) {
  const destino = encodeURIComponent(parada.endereco);
  const waze = `https://waze.com/ul?q=${destino}&navigate=yes`;
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${destino}`;

  return (
    <div className="pt-2">
      <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">Navegação</h2>

      {/* "Mapa" simulado */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 h-56 bg-slate-800">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(0deg, rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.15) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute left-8 bottom-10 h-3 w-3 rounded-full bg-slate-400 ring-4 ring-slate-400/20" />
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path
            d="M 40 200 C 120 160, 90 90, 200 90 S 320 60, 330 40"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="4"
            strokeDasharray="8 6"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute right-6 top-6 flex flex-col items-center">
          <MapPin className="h-8 w-8 text-sky-400 drop-shadow" fill="#0ea5e9" />
        </div>
      </div>

      {/* Card destino */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
        <p className="text-[11px] uppercase tracking-widest text-sky-400/80 font-semibold">Destino atual</p>
        <p className="text-lg font-semibold text-white mt-1">{parada.cliente}</p>
        <p className="text-[13px] text-slate-400 mt-1 flex items-start gap-1.5">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-slate-500" /> {parada.endereco}
        </p>
        {parada.telefone && (
          <a
            href={`tel:${parada.telefone.replace(/\D/g, '')}`}
            className="text-[13px] text-slate-300 mt-2 flex items-center gap-1.5 hover:text-white"
          >
            <Phone className="h-4 w-4 text-slate-500" /> {parada.telefone}
          </a>
        )}
      </div>

      {/* Botões gigantes de navegação */}
      <div className="mt-4 space-y-3">
        <a
          href={waze}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-3 w-full rounded-2xl bg-sky-500 text-white text-lg font-bold py-4 hover:bg-sky-400 shadow-lg shadow-sky-500/25"
        >
          <Navigation className="h-6 w-6" /> Abrir no Waze
        </a>
        <a
          href={maps}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-3 w-full rounded-2xl border border-slate-700 text-slate-200 text-base font-semibold py-3.5 hover:bg-slate-800"
        >
          <MapIcon className="h-5 w-5" /> Abrir no Google Maps
        </a>
      </div>

      <button
        onClick={onFinalizar}
        className="mt-4 w-full rounded-2xl bg-emerald-500 text-white font-semibold py-3.5 hover:bg-emerald-400"
      >
        Cheguei — Finalizar entrega
      </button>
    </div>
  );
}

/* ────────────────────────── Aba 3: Finalizar (Canhoto) ────────────────────── */
function FinalizarTab({
  parada,
  recebedor,
  setRecebedor,
  recebedorDoc,
  setRecebedorDoc,
  fotoBase64,
  onFoto,
  gps,
  capturarGps,
  enviando,
  onConfirmar,
}: {
  parada: Parada;
  recebedor: string;
  setRecebedor: (v: string) => void;
  recebedorDoc: string;
  setRecebedorDoc: (v: string) => void;
  fotoBase64: string | null;
  onFoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  gps: { lat: number; lng: number } | null;
  capturarGps: () => void;
  enviando: boolean;
  onConfirmar: (assinaturaBase64: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const desenhando = useRef(false);
  const temAssinatura = useRef(false);
  const [assinou, setAssinou] = useState(false);

  // Prepara o canvas (resolução real + fundo).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    desenhando.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    temAssinatura.current = true;
    if (!assinou) setAssinou(true);
  }

  function end() {
    desenhando.current = false;
  }

  function limpar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    temAssinatura.current = false;
    setAssinou(false);
  }

  function confirmar() {
    if (!temAssinatura.current) {
      onConfirmar('');
      return;
    }
    const dataUrl = canvasRef.current?.toDataURL('image/png') || '';
    onConfirmar(dataUrl);
  }

  return (
    <div className="pt-2">
      <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">Canhoto digital</h2>
      <p className="text-[12px] text-slate-500 mb-3">
        Pedido <span className="text-slate-300">#{parada.numero}</span> · {parada.cliente}
      </p>

      {/* Recebedor */}
      <div className="space-y-2 mb-4">
        <input
          value={recebedor}
          onChange={(e) => setRecebedor(e.target.value)}
          placeholder="Nome de quem recebeu *"
          className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 outline-none"
        />
        <input
          value={recebedorDoc}
          onChange={(e) => setRecebedorDoc(e.target.value)}
          placeholder="Documento (CPF/RG) — opcional"
          className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 outline-none"
        />
      </div>

      {/* Canvas de assinatura */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[12px] text-slate-400 flex items-center gap-1.5">
            <PenLine className="h-3.5 w-3.5" /> Assinatura
          </label>
          <button
            onClick={limpar}
            className="text-[12px] text-slate-400 hover:text-white flex items-center gap-1"
          >
            <Eraser className="h-3.5 w-3.5" /> Limpar
          </button>
        </div>
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="w-full h-40 rounded-xl bg-white touch-none border border-slate-700 cursor-crosshair"
        />
        {!assinou && (
          <p className="text-[11px] text-slate-600 text-center -mt-24 pointer-events-none select-none">
            assine aqui com o dedo ou mouse
          </p>
        )}
      </div>

      {/* Foto do canhoto */}
      <div className="mb-4">
        <label className="text-[12px] text-slate-400 flex items-center gap-1.5 mb-1.5">
          <Camera className="h-3.5 w-3.5" /> Foto do canhoto / local
        </label>
        <label className="block cursor-pointer">
          <input type="file" accept="image/*" capture="environment" onChange={onFoto} className="hidden" />
          {fotoBase64 ? (
            <img
              src={fotoBase64}
              alt="canhoto"
              className="w-full h-40 object-cover rounded-xl border border-slate-700"
            />
          ) : (
            <div className="w-full h-32 rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 hover:border-sky-500/60 hover:text-slate-400">
              <Camera className="h-7 w-7 mb-1" />
              <span className="text-[12px]">Toque para fotografar</span>
            </div>
          )}
        </label>
      </div>

      {/* GPS */}
      <button
        onClick={capturarGps}
        className={`w-full rounded-xl border px-3 py-2.5 text-sm flex items-center justify-center gap-2 mb-4 ${
          gps
            ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/5'
            : 'border-slate-700 text-slate-300 hover:bg-slate-800'
        }`}
      >
        <CircleDot className="h-4 w-4" />
        {gps
          ? `📍 ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`
          : 'Capturar localização (GPS)'}
      </button>

      {/* Confirmar */}
      <button
        onClick={confirmar}
        disabled={enviando}
        className="w-full rounded-2xl bg-emerald-500 text-white text-base font-bold py-4 hover:bg-emerald-400 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
      >
        {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
        {enviando ? 'Enviando comprovante...' : 'Confirmar entrega'}
      </button>
    </div>
  );
}
