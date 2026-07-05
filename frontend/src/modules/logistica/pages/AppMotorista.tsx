import { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Navigation,
  Camera,
  Check,
  ChevronLeft,
  Eraser,
  Loader2,
  CircleDot,
} from 'lucide-react';
import { rotasApi } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from '../../../components/ui/feedback';

/**
 * App do Motorista (React simulando tela de celular — pronto para Capacitor).
 * Paleta neutra (off-white / greige) + números oversized.
 *  Tela 1: Timeline das paradas na ordem otimizada.
 *  Tela 2: Foco na entrega atual + botão gigante Waze/Maps.
 *  Tela 3: Canhoto digital (Canvas de assinatura + foto + GPS real).
 */

type Tela = 'timeline' | 'entrega' | 'canhoto';

interface Stop {
  id: string;
  numeroPedido?: number;
  clienteNome?: string;
  endereco?: string;
  cep?: string;
  ordem: number;
  pesoKg: number;
  volumes: number;
  status: string;
}
interface Rota {
  id: string;
  motoristaNome?: string;
  placaVeiculo?: string;
  stops: Stop[];
}

export default function AppMotorista() {
  const { user } = useAuth() as any;
  const motorista = user?.nome || '';
  const [rota, setRota] = useState<Rota | null>(null);
  const [tela, setTela] = useState<Tela>('timeline');
  const [atual, setAtual] = useState<Stop | null>(null);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    try {
      const { data } = await rotasApi.doMotorista(motorista);
      setRota(data?.[0] || null);
    } catch {
      toast('Falha ao carregar suas entregas.', 'error');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (motorista) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motorista]);

  const pendentes = rota?.stops.filter((s) => s.status !== 'DELIVERED') ?? [];
  const entregues = rota?.stops.filter((s) => s.status === 'DELIVERED').length ?? 0;

  function abrir(stop: Stop) {
    setAtual(stop);
    setTela('entrega');
  }

  return (
    // Moldura de celular
    <div className="min-h-screen bg-[#e7e3da] flex items-center justify-center p-4">
      <div className="w-[390px] h-[780px] bg-[#f6f4ef] rounded-[2.5rem] shadow-2xl border-8 border-[#12100e] overflow-hidden flex flex-col relative">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#12100e] rounded-b-2xl z-20" />

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#a49b8b]" />
          </div>
        ) : tela === 'timeline' ? (
          <TimelineScreen
            rota={rota}
            pendentes={pendentes}
            entregues={entregues}
            motorista={motorista}
            onOpen={abrir}
          />
        ) : tela === 'entrega' && atual ? (
          <EntregaScreen stop={atual} onBack={() => setTela('timeline')} onDeliver={() => setTela('canhoto')} />
        ) : tela === 'canhoto' && atual ? (
          <CanhotoScreen
            stop={atual}
            onBack={() => setTela('entrega')}
            onDone={async () => {
              setTela('timeline');
              await carregar();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

/* ────────────────────────── TELA 1: TIMELINE ────────────────────────── */
function TimelineScreen({
  rota,
  pendentes,
  entregues,
  motorista,
  onOpen,
}: {
  rota: Rota | null;
  pendentes: Stop[];
  entregues: number;
  motorista: string;
  onOpen: (s: Stop) => void;
}) {
  return (
    <div className="flex-1 flex flex-col pt-9 overflow-hidden">
      <header className="px-6 pt-3 pb-4">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#a49b8b] font-semibold">Minha rota · hoje</p>
        <h1 className="text-3xl font-light text-[#2b2925]">Olá, {motorista.split(' ')[0] || 'motorista'}</h1>
        <div className="flex gap-6 mt-4">
          <div>
            <p className="text-5xl font-extralight tabular-nums text-[#2b2925]">{pendentes.length}</p>
            <p className="text-[11px] text-[#a49b8b] uppercase tracking-wide">Restantes</p>
          </div>
          <div>
            <p className="text-5xl font-extralight tabular-nums text-[#7c8471]">{entregues}</p>
            <p className="text-[11px] text-[#a49b8b] uppercase tracking-wide">Entregues</p>
          </div>
        </div>
        {rota && (
          <p className="text-[11px] text-[#a49b8b] mt-2">Veículo {rota.placaVeiculo}</p>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {!rota && <p className="text-sm text-[#a49b8b] italic text-center mt-10">Nenhuma rota atribuída.</p>}
        <ol className="relative border-l-2 border-[#e3ddd0] ml-3">
          {rota?.stops.map((s) => {
            const done = s.status === 'DELIVERED';
            return (
              <li key={s.id} className="mb-5 ml-5">
                <span
                  className={`absolute -left-[11px] flex items-center justify-center w-5 h-5 rounded-full ${
                    done ? 'bg-[#7c8471]' : 'bg-[#2b2925]'
                  }`}
                >
                  {done ? <Check className="h-3 w-3 text-white" /> : <CircleDot className="h-3 w-3 text-white" />}
                </span>
                <button
                  disabled={done}
                  onClick={() => onOpen(s)}
                  className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                    done ? 'border-[#eee8dc] opacity-60' : 'border-[#e3ddd0] bg-white hover:border-[#d8cfbc]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-light text-[#2b2925]">#{s.numeroPedido}</p>
                    <span className="text-[10px] text-[#a49b8b]">Parada {s.ordem}</span>
                  </div>
                  <p className="text-sm text-[#5a5348] truncate">{s.clienteNome}</p>
                  <p className="text-[11px] text-[#a49b8b] truncate">{s.endereco || s.cep}</p>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/* ────────────────────────── TELA 2: ENTREGA ────────────────────────── */
function EntregaScreen({
  stop,
  onBack,
  onDeliver,
}: {
  stop: Stop;
  onBack: () => void;
  onDeliver: () => void;
}) {
  const destino = encodeURIComponent(stop.endereco || stop.cep || '');
  const waze = `https://waze.com/ul?q=${destino}&navigate=yes`;
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${destino}`;

  return (
    <div className="flex-1 flex flex-col pt-9">
      <header className="px-5 py-3 flex items-center gap-2">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-[#efece4]">
          <ChevronLeft className="h-5 w-5 text-[#2b2925]" />
        </button>
        <span className="text-[11px] uppercase tracking-widest text-[#a49b8b] font-semibold">Entrega atual</span>
      </header>

      <div className="px-6 flex-1 flex flex-col">
        <p className="text-6xl font-extralight text-[#2b2925] tabular-nums">#{stop.numeroPedido}</p>
        <p className="text-lg text-[#2b2925] mt-2">{stop.clienteNome}</p>
        <div className="flex items-start gap-2 mt-3 text-[#5a5348]">
          <MapPin className="h-4 w-4 mt-0.5 text-[#a49b8b]" />
          <p className="text-sm">{stop.endereco || '—'}<br />{stop.cep}</p>
        </div>
        <div className="flex gap-6 mt-5">
          <div>
            <p className="text-3xl font-extralight tabular-nums">{Number(stop.pesoKg).toFixed(0)}</p>
            <p className="text-[11px] text-[#a49b8b] uppercase">kg</p>
          </div>
          <div>
            <p className="text-3xl font-extralight tabular-nums">{stop.volumes}</p>
            <p className="text-[11px] text-[#a49b8b] uppercase">caixas</p>
          </div>
        </div>

        {/* Botão GIGANTE de navegação */}
        <a
          href={waze}
          target="_blank"
          rel="noreferrer"
          className="mt-6 flex items-center justify-center gap-3 bg-[#2b2925] text-[#f6f4ef] rounded-3xl py-6 text-xl font-semibold shadow-lg active:scale-[0.98] transition"
        >
          <Navigation className="h-7 w-7" /> Navegar (Waze)
        </a>
        <a
          href={maps}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-2 border border-[#d8cfbc] rounded-2xl py-3 text-sm text-[#5a5348]"
        >
          Abrir no Google Maps
        </a>

        <button
          onClick={onDeliver}
          className="mt-auto mb-6 flex items-center justify-center gap-2 bg-[#7c8471] text-white rounded-3xl py-5 text-lg font-semibold shadow-lg active:scale-[0.98] transition"
        >
          <Check className="h-6 w-6" /> Confirmar entrega
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────── TELA 3: CANHOTO DIGITAL ────────────────────────── */
function CanhotoScreen({
  stop,
  onBack,
  onDone,
}: {
  stop: Stop;
  onBack: () => void;
  onDone: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [assinou, setAssinou] = useState(false);
  const [foto, setFoto] = useState<string>('');
  const [recebedor, setRecebedor] = useState('');
  const [doc, setDoc] = useState('');
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsErro, setGpsErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Captura de GPS real via navegador
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsErro('GPS indisponível neste dispositivo.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGpsErro('Não foi possível obter a localização. Habilite o GPS.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // Desenho no canvas
  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2b2925';
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setAssinou(true);
  }
  function end() {
    drawing.current = false;
  }
  function limpar() {
    const c = canvasRef.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setAssinou(false);
  }

  function onFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setFoto(String(reader.result));
    reader.readAsDataURL(f);
  }

  async function finalizar() {
    if (!assinou) return toast('Colete a assinatura do cliente.', 'error');
    if (!recebedor.trim()) return toast('Informe quem recebeu.', 'error');
    if (!gps) return toast(gpsErro || 'Aguardando GPS...', 'error');
    setEnviando(true);
    try {
      const assinaturaBase64 = canvasRef.current!.toDataURL('image/png');
      const { data } = await rotasApi.confirmarEntrega(stop.id, {
        latitude: gps.lat,
        longitude: gps.lng,
        assinaturaBase64,
        fotoBase64: foto || undefined,
        recebedorNome: recebedor.trim(),
        recebedorDoc: doc.trim() || undefined,
      });
      const st = data?.sefaz?.status;
      toast(
        `Entrega registrada${st && st !== 'sem_nfe' ? ` · SEFAZ: ${st}` : ''}.`,
        'success',
      );
      onDone();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha ao confirmar entrega.', 'error');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col pt-9 overflow-y-auto">
      <header className="px-5 py-3 flex items-center gap-2 sticky top-0 bg-[#f6f4ef] z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-[#efece4]">
          <ChevronLeft className="h-5 w-5 text-[#2b2925]" />
        </button>
        <span className="text-[11px] uppercase tracking-widest text-[#a49b8b] font-semibold">
          Canhoto · #{stop.numeroPedido}
        </span>
      </header>

      <div className="px-5 pb-6 space-y-4">
        {/* GPS */}
        <div className="flex items-center gap-2 text-xs">
          <MapPin className="h-4 w-4 text-[#7c8471]" />
          {gps ? (
            <span className="text-[#5a5348]">
              GPS: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
            </span>
          ) : (
            <span className="text-rose-500">{gpsErro || 'Obtendo localização...'}</span>
          )}
        </div>

        {/* Recebedor */}
        <input
          value={recebedor}
          onChange={(e) => setRecebedor(e.target.value)}
          placeholder="Nome de quem recebeu"
          className="w-full bg-white border border-[#e3ddd0] rounded-xl px-4 py-3 text-sm"
        />
        <input
          value={doc}
          onChange={(e) => setDoc(e.target.value)}
          placeholder="CPF/RG (opcional)"
          className="w-full bg-white border border-[#e3ddd0] rounded-xl px-4 py-3 text-sm"
        />

        {/* Assinatura */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] uppercase tracking-widest text-[#a49b8b] font-semibold">Assinatura</label>
            <button onClick={limpar} className="flex items-center gap-1 text-[11px] text-[#a49b8b]">
              <Eraser className="h-3 w-3" /> limpar
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={330}
            height={150}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="w-full bg-white border-2 border-dashed border-[#d8cfbc] rounded-2xl touch-none"
          />
        </div>

        {/* Foto da mercadoria */}
        <label className="flex items-center gap-3 bg-white border border-[#e3ddd0] rounded-xl px-4 py-3 text-sm text-[#5a5348] cursor-pointer">
          <Camera className="h-5 w-5 text-[#a49b8b]" />
          {foto ? 'Foto anexada ✓' : 'Foto da mercadoria'}
          <input type="file" accept="image/*" capture="environment" onChange={onFoto} className="hidden" />
        </label>
        {foto && <img src={foto} alt="mercadoria" className="w-full h-32 object-cover rounded-xl" />}

        <button
          onClick={finalizar}
          disabled={enviando}
          className="w-full flex items-center justify-center gap-2 bg-[#2b2925] text-[#f6f4ef] rounded-3xl py-5 text-lg font-semibold shadow-lg active:scale-[0.98] transition disabled:opacity-50"
        >
          {enviando ? <Loader2 className="h-6 w-6 animate-spin" /> : <Check className="h-6 w-6" />}
          Finalizar e enviar à SEFAZ
        </button>
      </div>
    </div>
  );
}
