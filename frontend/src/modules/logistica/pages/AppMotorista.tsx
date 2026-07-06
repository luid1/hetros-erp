import { useEffect, useRef, useState, useCallback } from 'react';
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
  ShieldAlert,
  Satellite,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Timer,
  TrendingUp,
  User,
  CreditCard,
  FileText,
  Hash,
} from 'lucide-react';
import { rotasApi, nfeApi } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from '../../../components/ui/feedback';

/**
 * App do Motorista — simulação fiel de app de entregas nativo (pronto p/ Capacitor).
 * • Gatekeeper de GPS: watchPosition obrigatório; sem localização, app bloqueia.
 * • Aba Mapa: "Entrega Atual" + "Programação do Dia", mapa mockado, ETA previsto x real.
 * • Wizard de finalização em 3 passos: recebedor → foto → assinatura (landscape).
 */

type Aba = 'rota' | 'mapa' | 'finalizar';
type GpsEstado = 'aguardando' | 'ativo' | 'negado';

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
  etaPrevisto: string;
  // NF-e vinculada ao pedido — dá origem ao canhoto que será assinado.
  numeroNfe?: string;
  numeroCanhoto?: string;
  chaveNfe?: string;
  lat?: number;
  lng?: number;
}

/* ── Paradas de demonstração (fallback quando não há rota real) ── */
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
    etaPrevisto: '08:40',
    numeroNfe: '000012845',
    numeroCanhoto: '000012845',
    chaveNfe: '3524 0100 0000 0000 0001 5500 1000 0012 8451 2345 6789',
    lat: -23.5613,
    lng: -46.6565,
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
    etaPrevisto: '10:25',
    numeroNfe: '000012846',
    numeroCanhoto: '000012846',
    chaveNfe: '3524 0100 0000 0000 0001 5500 1000 0012 8461 2345 6790',
    lat: -23.5320,
    lng: -46.6290,
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
    etaPrevisto: '13:35',
    numeroNfe: '000012847',
    numeroCanhoto: '000012847',
    chaveNfe: '3524 0100 0000 0000 0001 5500 1000 0012 8471 2345 6791',
    lat: -23.5670,
    lng: -46.6920,
  },
];

/* ── Leaflet via CDN (sem dependência npm) — mapa real de entregas ── */
const BASE_SP: [number, number] = [-23.5505, -46.6333];

let leafletPromise: Promise<any> | null = null;
function carregarLeaflet(): Promise<any> {
  if ((window as any).L) return Promise.resolve((window as any).L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.async = true;
    js.onload = () => resolve((window as any).L);
    js.onerror = () => reject(new Error('Falha ao carregar Leaflet'));
    document.body.appendChild(js);
  });
  return leafletPromise;
}

// Coordenada estável por índice quando a parada não tem lat/lng real.
function coordDaParada(p: Parada, i: number): [number, number] {
  if (typeof p.lat === 'number' && typeof p.lng === 'number') return [p.lat, p.lng];
  const ang = (i * 137.5 * Math.PI) / 180;
  const raio = 0.02 + (i % 4) * 0.012;
  return [BASE_SP[0] + Math.sin(ang) * raio, BASE_SP[1] + Math.cos(ang) * raio];
}

/* Máscara progressiva de CPF: 000.000.000-00 conforme digita. */
function formatCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}

/* Soma minutos a um "HH:MM" e devolve outro "HH:MM". */
function addMinutos(hhmm: string, min: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + min;
  const hh = Math.floor((total % (24 * 60)) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/* ══════════════════════════════ RAIZ ══════════════════════════════════════ */

export default function AppMotorista() {
  const { user, filialAtiva } = useAuth() as any;
  const motorista = user?.nome || 'Motorista';
  const filialId = filialAtiva?.id || '';

  const [aba, setAba] = useState<Aba>('rota');
  const [paradas, setParadas] = useState<Parada[]>(PARADAS_MOCK);
  const [ativaIdx, setAtivaIdx] = useState(0);
  const [carregando, setCarregando] = useState(false);

  // GPS gatekeeper
  const [gpsEstado, setGpsEstado] = useState<GpsEstado>('aguardando');
  const [pos, setPos] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const watchId = useRef<number | null>(null);

  const paradaAtiva =
    paradas[ativaIdx] || paradas.find((p) => p.status !== 'DELIVERED') || paradas[0];
  const pendentes = paradas.filter((p) => p.status !== 'DELIVERED').length;
  const total = paradas.length;
  const progresso = total ? Math.round(((total - pendentes) / total) * 100) : 0;

  /* ── Gatekeeper: watchPosition obrigatório ── */
  const iniciarGps = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsEstado('negado');
      return;
    }
    setGpsEstado('aguardando');
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy });
        setGpsEstado('ativo');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGpsEstado('negado');
        else setGpsEstado('negado');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }, []);

  useEffect(() => {
    iniciarGps();
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [iniciarGps]);

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
          (r.stops || []).forEach((s: any, i: number) =>
            stops.push({
              id: s.id,
              pedidoId: s.pedidoId,
              numero: s.numeroPedido,
              cliente: s.clienteNome || '—',
              endereco: s.endereco || '—',
              janela: s.janelaInicio && s.janelaFim ? `${s.janelaInicio} — ${s.janelaFim}` : 'Sem janela',
              status: s.status || 'PENDING',
              pesoKg: Number(s.pesoKg || 0),
              volumes: Number(s.volumes || 0),
              etaPrevisto: s.janelaInicio || addMinutos('08:00', 40 + i * 90),
              lat: s.latitude ?? undefined,
              lng: s.longitude ?? undefined,
            }),
          ),
        );

        // Puxa as NF-e da filial e vincula por pedido → canhoto a assinar.
        if (filialId) {
          try {
            const { data: nfeData } = await nfeApi.list(filialId);
            const notas = nfeData?.items || nfeData || [];
            const porPedido = new Map<string, any>();
            const porNumeroPedido = new Map<number, any>();
            notas.forEach((n: any) => {
              if (n.pedidoId) porPedido.set(String(n.pedidoId), n);
              if (n.numeroPedido != null) porNumeroPedido.set(Number(n.numeroPedido), n);
            });
            stops.forEach((st) => {
              const nf = porPedido.get(String(st.pedidoId)) || porNumeroPedido.get(st.numero);
              if (nf) {
                const num = String(nf.numero ?? nf.numeroNfe ?? '');
                st.numeroNfe = num || undefined;
                st.numeroCanhoto = num || undefined;
                st.chaveNfe = nf.chaveAcesso || nf.chave || undefined;
              }
            });
          } catch {
            /* sem NF-e vinculada — segue sem canhoto */
          }
        }

        if (vivo && stops.length > 0) {
          setParadas(stops);
          const idx = stops.findIndex((s) => s.status !== 'DELIVERED');
          setAtivaIdx(idx >= 0 ? idx : 0);
        }
      } catch {
        /* mantém demonstração */
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [user?.nome, filialId]);

  function iniciarParada(idx: number) {
    setParadas((prev) => prev.map((p, i) => (i === idx ? { ...p, status: 'IN_TRANSIT' } : p)));
    setAtivaIdx(idx);
    setAba('mapa');
  }

  function irParaFinalizar(idx: number) {
    setAtivaIdx(idx);
    setAba('finalizar');
  }

  async function confirmarEntrega(payload: {
    recebedorNome: string;
    recebedorDoc?: string;
    fotoBase64?: string;
    assinaturaBase64: string;
  }) {
    const stopId = paradaAtiva.id;
    const corpo = {
      latitude: pos?.lat ?? 0,
      longitude: pos?.lng ?? 0,
      assinaturaBase64: payload.assinaturaBase64,
      fotoBase64: payload.fotoBase64,
      recebedorNome: payload.recebedorNome,
      recebedorDoc: payload.recebedorDoc,
    };
    if (!stopId.startsWith('mock') && !stopId.startsWith('s')) {
      await rotasApi.confirmarEntrega(stopId, corpo);
    }
    setParadas((prev) => prev.map((p, i) => (i === ativaIdx ? { ...p, status: 'DELIVERED' } : p)));
    toast('✅ Entrega confirmada! Comprovante registrado.', 'success');
    const prox = paradas.findIndex((p, i) => i !== ativaIdx && p.status !== 'DELIVERED');
    setAtivaIdx(prox >= 0 ? prox : ativaIdx);
    setAba('rota');
  }

  /* ── Moldura do celular ── */
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-8">
      <div className="relative w-[390px] max-w-full h-[820px] rounded-[2.5rem] bg-slate-950 border-[10px] border-slate-800 shadow-2xl shadow-black/60 overflow-hidden flex flex-col">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 bg-slate-800 rounded-b-2xl z-30" />

        {/* ── Gatekeeper de GPS: bloqueia tela inteira ── */}
        {gpsEstado !== 'ativo' && (
          <GpsGatekeeper estado={gpsEstado} onTentar={iniciarGps} />
        )}

        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] text-slate-400 z-10">
          <span>09:41</span>
          <span className="flex items-center gap-1.5">
            {carregando && <Loader2 className="h-3 w-3 animate-spin" />}
            <Satellite className={`h-3 w-3 ${gpsEstado === 'ativo' ? 'text-emerald-400' : 'text-slate-600'}`} />
            Hetros Driver
          </span>
        </div>

        {/* Header */}
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

        {/* Conteúdo */}
        <main className="flex-1 overflow-y-auto px-4 pb-4">
          {aba === 'rota' && (
            <TimelineTab paradas={paradas} ativaIdx={ativaIdx} onIniciar={iniciarParada} onFinalizar={irParaFinalizar} />
          )}
          {aba === 'mapa' && (
            <MapaTab paradaAtiva={paradaAtiva} paradas={paradas} pos={pos} onFinalizar={() => irParaFinalizar(ativaIdx)} />
          )}
          {aba === 'finalizar' && (
            <WizardFinalizar key={paradaAtiva.id} parada={paradaAtiva} onConfirmar={confirmarEntrega} />
          )}
        </main>

        {/* Bottom navigation */}
        <nav className="grid grid-cols-3 border-t border-slate-800 bg-slate-950/95 backdrop-blur z-10">
          <TabButton label="Rota Atual" icon={RouteIcon} active={aba === 'rota'} onClick={() => setAba('rota')} />
          <TabButton label="Mapa" icon={MapIcon} active={aba === 'mapa'} onClick={() => setAba('mapa')} />
          <TabButton label="Finalizar" icon={PenLine} active={aba === 'finalizar'} onClick={() => setAba('finalizar')} />
        </nav>
      </div>
    </div>
  );
}

/* ────────────────────────── Gatekeeper de GPS ─────────────────────────────── */
function GpsGatekeeper({ estado, onTentar }: { estado: GpsEstado; onTentar: () => void }) {
  const aguardando = estado === 'aguardando';
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center text-center px-8 bg-slate-950">
      {aguardando ? (
        <>
          <div className="relative mb-6">
            <span className="absolute inset-0 rounded-full bg-sky-500/20 animate-ping" />
            <Satellite className="h-16 w-16 text-sky-400 relative" />
          </div>
          <h2 className="text-xl font-semibold text-white">Buscando sinal de GPS…</h2>
          <p className="text-sm text-slate-400 mt-2">
            Autorize a localização para começar a operar. O rastreamento é obrigatório durante toda a rota.
          </p>
          <Loader2 className="h-6 w-6 text-slate-500 animate-spin mt-6" />
        </>
      ) : (
        <>
          <div className="h-20 w-20 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center mb-6">
            <ShieldAlert className="h-11 w-11 text-rose-400" />
          </div>
          <h2 className="text-2xl font-bold text-white leading-tight">Acesso Negado</h2>
          <p className="text-[15px] text-slate-300 mt-3 leading-relaxed">
            A localização em tempo real é <strong className="text-rose-300">obrigatória</strong> para operar este aplicativo.
          </p>
          <p className="text-[13px] text-slate-500 mt-2">
            Ative o GPS e conceda a permissão de localização nas configurações do dispositivo.
          </p>
          <button
            onClick={onTentar}
            className="mt-7 flex items-center gap-2 rounded-xl bg-sky-500 text-white px-6 py-3 font-semibold hover:bg-sky-400"
          >
            <RotateCw className="h-4 w-4" /> Tentar novamente
          </button>
        </>
      )}
    </div>
  );
}

/* ────────────────────────── Bottom nav button ─────────────────────────────── */
function TabButton({ label, icon: Icon, active, onClick }: { label: string; icon: any; active: boolean; onClick: () => void }) {
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
              {!isLast && <span className="absolute left-[13px] top-6 bottom-0 w-px bg-slate-700" />}
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
                className={`rounded-xl border p-3 transition ${
                  idx === ativaIdx && !entregue ? 'border-sky-500/50 bg-sky-500/5' : 'border-slate-800 bg-slate-800/40'
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
                  <span className="flex items-center gap-1 text-sky-400/80">
                    <Timer className="h-3 w-3" /> ETA {p.etaPrevisto}
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

/* ────────────────────────── Aba 2: Mapa (Now vs Scheduled) ─────────────────── */
/* ── Mapa real (Leaflet/CDN) com todas as entregas plotadas ── */
function MapaEntregas({
  paradas,
  paradaAtiva,
  pos,
}: {
  paradas: Parada[];
  paradaAtiva: Parada;
  pos: { lat: number; lng: number; acc: number } | null;
}) {
  const el = useRef<HTMLDivElement | null>(null);
  const mapInst = useRef<any>(null);
  const layer = useRef<any>(null);
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'erro'>('carregando');

  // Inicializa o mapa uma vez.
  useEffect(() => {
    let vivo = true;
    carregarLeaflet()
      .then((L) => {
        if (!vivo || !el.current || mapInst.current) return;
        const map = L.map(el.current, { zoomControl: false, attributionControl: false }).setView(BASE_SP, 12);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
        mapInst.current = map;
        layer.current = L.layerGroup().addTo(map);
        setEstado('ok');
        setTimeout(() => map.invalidateSize(), 60);
      })
      .catch(() => vivo && setEstado('erro'));
    return () => {
      vivo = false;
      if (mapInst.current) {
        mapInst.current.remove();
        mapInst.current = null;
      }
    };
  }, []);

  // Redesenha marcadores quando paradas / posição mudam.
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInst.current;
    if (!L || !map || !layer.current) return;
    layer.current.clearLayers();
    const pontos: [number, number][] = [];

    paradas.forEach((p, i) => {
      const [lat, lng] = coordDaParada(p, i);
      pontos.push([lat, lng]);
      const entregue = p.status === 'DELIVERED';
      const ativa = p.id === paradaAtiva.id;
      const cor = entregue ? '#10b981' : ativa ? '#38bdf8' : '#f59e0b';
      const icon = L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center">
          <div style="width:26px;height:26px;border-radius:50%;background:${cor};color:#0b1220;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.85);box-shadow:0 2px 6px rgba(0,0,0,.5)">${i + 1}</div>
        </div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker([lat, lng], { icon })
        .addTo(layer.current)
        .bindPopup(
          `<b>#${p.numero}</b> — ${p.cliente}<br/>${p.endereco}${p.numeroNfe ? `<br/>NF-e ${p.numeroNfe}` : ''}`,
        );
    });

    // Posição real do motorista.
    if (pos) {
      pontos.push([pos.lat, pos.lng]);
      const meIcon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#38bdf8;border:3px solid #fff;box-shadow:0 0 0 6px rgba(56,189,248,.3)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([pos.lat, pos.lng], { icon: meIcon }).addTo(layer.current).bindPopup('Você está aqui');
    }

    if (pontos.length === 1) map.setView(pontos[0], 14);
    else if (pontos.length > 1) map.fitBounds(pontos, { padding: [36, 36], maxZoom: 15 });
  }, [paradas, paradaAtiva.id, pos]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-800 h-60 bg-slate-900">
      <div ref={el} className="absolute inset-0 z-0" />
      {estado !== 'ok' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900 text-slate-500 text-[13px] gap-2">
          {estado === 'carregando' ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-sky-400" /> Carregando mapa…
            </>
          ) : (
            <>
              <MapIcon className="h-5 w-5 text-slate-600" /> Mapa indisponível offline
            </>
          )}
        </div>
      )}
      {pos && estado === 'ok' && (
        <div className="absolute top-2 left-2 z-[400] text-[10px] text-slate-200 bg-slate-900/80 rounded px-2 py-1 flex items-center gap-1">
          <Satellite className="h-3 w-3 text-emerald-400" /> ±{Math.round(pos.acc)}m
        </div>
      )}
    </div>
  );
}

function MapaTab({
  paradaAtiva,
  paradas,
  pos,
  onFinalizar,
}: {
  paradaAtiva: Parada;
  paradas: Parada[];
  pos: { lat: number; lng: number; acc: number } | null;
  onFinalizar: () => void;
}) {
  const destino = encodeURIComponent(paradaAtiva.endereco);
  const waze = `https://waze.com/ul?q=${destino}&navigate=yes`;
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${destino}`;

  // ETA em tempo real: simula atraso de trânsito de 3–14 min sobre o previsto.
  const [atrasoMin, setAtrasoMin] = useState(6);
  useEffect(() => {
    const t = setInterval(() => setAtrasoMin((m) => Math.max(2, Math.min(16, m + (Math.random() > 0.5 ? 1 : -1)))), 4000);
    return () => clearInterval(t);
  }, []);
  const etaReal = addMinutos(paradaAtiva.etaPrevisto, atrasoMin);
  const programacao = paradas.filter((p) => p.id !== paradaAtiva.id && p.status !== 'DELIVERED');

  return (
    <div className="pt-2 space-y-4">
      {/* ── Mapa de todas as entregas ── */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-sky-400/80 font-semibold mb-2 flex items-center justify-between">
          Mapa das Entregas
          <span className="text-slate-600 normal-case tracking-normal">{paradas.length} paradas</span>
        </h2>
        <MapaEntregas paradas={paradas} paradaAtiva={paradaAtiva} pos={pos} />
      </section>

      {/* ── Entrega Atual ── */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-sky-400/80 font-semibold mb-2">Entrega Atual</h2>

        {/* Card destino + ETAs */}
        <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
          <p className="text-lg font-semibold text-white">{paradaAtiva.cliente}</p>
          <p className="text-[13px] text-slate-400 mt-1 flex items-start gap-1.5">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-slate-500" /> {paradaAtiva.endereco}
          </p>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">ETA Previsto</p>
              <p className="text-2xl font-light text-slate-200 tabular-nums flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-500" /> {paradaAtiva.etaPrevisto}
              </p>
            </div>
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/40 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-amber-400/80">ETA Tempo Real</p>
              <p className="text-2xl font-light text-amber-300 tabular-nums flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" /> {etaReal}
              </p>
              <p className="text-[10px] text-amber-400/70 mt-0.5">+{atrasoMin} min · trânsito</p>
            </div>
          </div>

          {paradaAtiva.telefone && (
            <a
              href={`tel:${paradaAtiva.telefone.replace(/\D/g, '')}`}
              className="text-[13px] text-slate-300 mt-3 flex items-center gap-1.5 hover:text-white"
            >
              <Phone className="h-4 w-4 text-slate-500" /> {paradaAtiva.telefone}
            </a>
          )}
        </div>

        {/* Navegação */}
        <div className="mt-3 space-y-2.5">
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
          <button
            onClick={onFinalizar}
            className="w-full rounded-2xl bg-emerald-500 text-white font-semibold py-3.5 hover:bg-emerald-400"
          >
            Cheguei — Finalizar entrega
          </button>
        </div>
      </section>

      {/* ── Programação do Dia ── */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2 flex items-center justify-between">
          Programação do Dia <span className="text-slate-600 normal-case tracking-normal">{programacao.length} restante(s)</span>
        </h2>
        {programacao.length === 0 ? (
          <p className="text-[13px] text-slate-500 italic py-4 text-center">Sem outras paradas pendentes. 🎉</p>
        ) : (
          <div className="space-y-2">
            {programacao.map((p, i) => (
              <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-800/30 px-3 py-2.5 flex items-center gap-3">
                <span className="h-7 w-7 rounded-full bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {i + 2}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{p.cliente}</p>
                  <p className="text-[11px] text-slate-500 truncate">{p.endereco}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-sky-400/80 flex items-center gap-1 justify-end">
                    <Timer className="h-3 w-3" /> {p.etaPrevisto}
                  </p>
                  <p className="text-[10px] text-slate-500">{p.janela}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ────────────────────────── Aba 3: Wizard de finalização ───────────────────── */
function WizardFinalizar({
  parada,
  onConfirmar,
}: {
  parada: Parada;
  onConfirmar: (p: { recebedorNome: string; recebedorDoc?: string; fotoBase64?: string; assinaturaBase64: string }) => Promise<void>;
}) {
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [recebedor, setRecebedor] = useState('');
  const [cpf, setCpf] = useState('');
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function onFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFotoBase64(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="pt-2">
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex-1">
            <div className={`h-1.5 rounded-full transition-all ${passo >= n ? 'bg-sky-500' : 'bg-slate-700'}`} />
            <p className={`text-[10px] mt-1 ${passo >= n ? 'text-sky-400' : 'text-slate-600'}`}>
              {n === 1 ? 'Recebedor' : n === 2 ? 'Foto' : 'Assinatura'}
            </p>
          </div>
        ))}
      </div>

      <p className="text-[12px] text-slate-500 mb-3">
        Pedido <span className="text-slate-300">#{parada.numero}</span> · {parada.cliente}
      </p>

      {/* NF-e vinculada → origem do canhoto a assinar */}
      {parada.numeroNfe ? (
        <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/5 px-3 py-2.5">
          <div className="flex items-center gap-2 text-sky-300">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-semibold">NF-e Nº {parada.numeroNfe}</span>
            <span className="ml-auto flex items-center gap-1 text-[12px] text-amber-300">
              <Hash className="h-3.5 w-3.5" /> Canhoto {parada.numeroCanhoto}
            </span>
          </div>
          {parada.chaveNfe && (
            <p className="text-[10px] text-slate-500 mt-1 break-all">Chave: {parada.chaveNfe}</p>
          )}
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-[12px] text-amber-300 flex items-center gap-2">
          <FileText className="h-4 w-4" /> Pedido sem NF-e vinculada — canhoto será gerado sem número fiscal.
        </div>
      )}

      {/* PASSO 1 — Recebedor */}
      {passo === 1 && (
        <div className="space-y-4">
          <h3 className="text-white font-semibold text-lg">Quem recebeu?</h3>
          <div>
            <label className="text-[12px] text-slate-400 flex items-center gap-1.5 mb-1.5">
              <User className="h-3.5 w-3.5" /> Nome de quem recebeu *
            </label>
            <input
              value={recebedor}
              onChange={(e) => setRecebedor(e.target.value)}
              autoCapitalize="words"
              autoComplete="name"
              placeholder="Ex.: Maria Souza Silva"
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-3 text-sm text-white placeholder-slate-500 focus:border-sky-500 outline-none"
            />
          </div>
          <div>
            <label className="text-[12px] text-slate-400 flex items-center gap-1.5 mb-1.5">
              <CreditCard className="h-3.5 w-3.5" /> CPF *
            </label>
            <input
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              inputMode="numeric"
              maxLength={14}
              placeholder="000.000.000-00"
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-3 text-sm text-white placeholder-slate-500 focus:border-sky-500 outline-none tracking-wide tabular-nums"
            />
            <p className="text-[11px] text-slate-500 mt-1">{cpf.replace(/\D/g, '').length}/11 dígitos</p>
          </div>
          <button
            onClick={() => {
              if (!recebedor.trim()) return toast('Informe o nome de quem recebeu.', 'error');
              if (cpf.replace(/\D/g, '').length < 11) return toast('Informe um CPF válido.', 'error');
              setPasso(2);
            }}
            className="w-full rounded-2xl bg-sky-500 text-white font-semibold py-3.5 hover:bg-sky-400 flex items-center justify-center gap-2"
          >
            Próximo <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* PASSO 2 — Foto */}
      {passo === 2 && (
        <div className="space-y-4">
          <h3 className="text-white font-semibold text-lg">Foto do canhoto / local</h3>
          {fotoBase64 ? (
            <div>
              {/* Preview completo — imagem inteira visível (object-contain) */}
              <div className="w-full rounded-2xl border border-slate-700 bg-slate-950 overflow-hidden flex items-center justify-center">
                <img src={fotoBase64} alt="canhoto" className="w-full max-h-[52vh] object-contain" />
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[12px] text-emerald-400 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" /> Foto capturada — confira antes de enviar
                </p>
                <label className="text-[12px] text-sky-400 hover:text-sky-300 cursor-pointer flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5" /> Refazer
                  <input type="file" accept="image/*" capture="environment" onChange={onFoto} className="hidden" />
                </label>
              </div>
            </div>
          ) : (
            <label className="block cursor-pointer">
              <input type="file" accept="image/*" capture="environment" onChange={onFoto} className="hidden" />
              <div className="w-full h-64 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 hover:border-sky-500/60 hover:text-slate-400">
                <Camera className="h-10 w-10 mb-2" />
                <span className="text-[13px]">Toque para fotografar</span>
              </div>
            </label>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setPasso(1)}
              className="rounded-2xl border border-slate-700 text-slate-300 px-5 py-3.5 hover:bg-slate-800 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <button
              onClick={() => {
                if (!fotoBase64) return toast('Tire a foto do canhoto para continuar.', 'error');
                setPasso(3);
              }}
              className="flex-1 rounded-2xl bg-sky-500 text-white font-semibold py-3.5 hover:bg-sky-400 flex items-center justify-center gap-2"
            >
              Próximo <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* PASSO 3 — Assinatura */}
      {passo === 3 && (
        <PassoAssinatura
          enviando={enviando}
          numeroCanhoto={parada.numeroCanhoto}
          numeroNfe={parada.numeroNfe}
          onVoltar={() => setPasso(2)}
          onConfirmar={async (assinaturaBase64) => {
            setEnviando(true);
            try {
              await onConfirmar({
                recebedorNome: recebedor.trim(),
                recebedorDoc: cpf.trim() || undefined,
                fotoBase64: fotoBase64 || undefined,
                assinaturaBase64,
              });
            } finally {
              setEnviando(false);
            }
          }}
        />
      )}
    </div>
  );
}

/* ── Passo 3: assinatura em TELA CHEIA (overlay), botões Voltar/Confirmar fixos ── */
function PassoAssinatura({
  enviando,
  numeroCanhoto,
  numeroNfe,
  onVoltar,
  onConfirmar,
}: {
  enviando: boolean;
  numeroCanhoto?: string;
  numeroNfe?: string;
  onVoltar: () => void;
  onConfirmar: (assinaturaBase64: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const desenhando = useRef(false);
  const temAssinatura = useRef(false);
  const [assinou, setAssinou] = useState(false);

  // (Re)configura o canvas na resolução real do elemento. Chamado no mount e ao girar a tela.
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    temAssinatura.current = false;
    setAssinou(false);
  }, []);

  useEffect(() => {
    // pequeno atraso p/ garantir layout do overlay antes de medir
    const t = setTimeout(setupCanvas, 60);
    const onResize = () => setupCanvas();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [setupCanvas]);

  function ponto(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    desenhando.current = true;
    const { x, y } = ponto(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = ponto(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    temAssinatura.current = true;
    if (!assinou) setAssinou(true);
  }
  function end() {
    desenhando.current = false;
  }
  function limpar() {
    setupCanvas();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
        <button
          onClick={onVoltar}
          className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="flex flex-col items-center leading-tight">
          {numeroCanhoto ? (
            <span className="text-[12px] text-amber-300 flex items-center gap-1 font-semibold">
              <Hash className="h-3.5 w-3.5" /> Canhoto {numeroCanhoto}
              {numeroNfe && <span className="text-slate-500 font-normal">· NF-e {numeroNfe}</span>}
            </span>
          ) : (
            <span className="text-[12px] text-slate-400">Assinatura do canhoto</span>
          )}
          <span className="text-[10px] text-sky-300 flex items-center gap-1">
            <RotateCw className="h-3 w-3" /> Vire na horizontal para assinar
          </span>
        </div>
        <button onClick={limpar} className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm">
          <Eraser className="h-4 w-4" /> Limpar
        </button>
      </div>

      {/* Área de assinatura ocupando toda a tela disponível */}
      <div className="relative flex-1 p-3">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="w-full h-full rounded-2xl bg-white touch-none cursor-crosshair"
        />
        {!assinou && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <PenLine className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">✍️ assine aqui com o dedo ou mouse</p>
          </div>
        )}
      </div>

      {/* Barra inferior fixa: Voltar / Confirmar */}
      <div className="flex gap-3 p-4 border-t border-slate-800 shrink-0">
        <button
          onClick={onVoltar}
          className="rounded-2xl border border-slate-700 text-slate-300 px-6 py-3.5 hover:bg-slate-800 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <button
          onClick={() => {
            if (!temAssinatura.current) return toast('Colete a assinatura antes de confirmar.', 'error');
            onConfirmar(canvasRef.current?.toDataURL('image/png') || '');
          }}
          disabled={enviando}
          className="flex-1 rounded-2xl bg-emerald-500 text-white font-bold py-3.5 hover:bg-emerald-400 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
        >
          {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <CircleDot className="h-5 w-5" />}
          {enviando ? 'Enviando…' : 'Confirmar Entrega com GPS'}
        </button>
      </div>
    </div>
  );
}
