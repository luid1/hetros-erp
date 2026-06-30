import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, Scale, Check, Scissors, ChevronLeft, ChevronRight, SkipForward,
  Wifi, WifiOff, Settings, Truck,
} from 'lucide-react';
import api from '../../../services/api';
import { useBalanca } from '../../../hooks/useBalanca';

const kg = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

interface ItemSep {
  id: string;
  descricao: string;
  quantidade: string;
  unidade: string;
  pesoAferido: string | null;
  separado: boolean;
  cortado: boolean;
  produto?: { codigo?: string; pesoLiquido?: string | null; pesoBruto?: string | null };
}

function pesoVendidoRef(it: ItemSep): number {
  const u = (it.unidade || '').toUpperCase();
  const pesoUnit = Number(it.produto?.pesoLiquido || it.produto?.pesoBruto || 0);
  if (u === 'KG' || u === 'KGL') return Number(it.quantidade);
  if (pesoUnit > 0) return Number(it.quantidade) * pesoUnit;
  return 0;
}
const precisaPesar = (it: ItemSep) => (it.unidade || '').toUpperCase().startsWith('KG');

export default function SeparacaoPesagem({ pedidoId, onClose, onFinalizado }: {
  pedidoId: string;
  onClose: () => void;
  onFinalizado: () => void;
}) {
  const [pedido, setPedido] = useState<any>(null);
  const [itens, setItens] = useState<ItemSep[]>([]);
  const [ativo, setAtivo] = useState(0);
  const [staged, setStaged] = useState<Record<string, number>>({});
  const [salvando, setSalvando] = useState(false);
  const [configHost, setConfigHost] = useState(false);

  const { peso, estavel, conectado, host, trocarHost } = useBalanca(true);

  const carregar = useCallback(async () => {
    const { data } = await api.get(`/pedidos/${pedidoId}`);
    setPedido(data);
    setItens(data.itens || []);
    const prox = (data.itens || []).findIndex((i: ItemSep) => !i.separado && !i.cortado);
    setAtivo(prox >= 0 ? prox : 0);
  }, [pedidoId]);
  useEffect(() => { carregar(); }, [carregar]);

  const itemAtivo = itens[ativo];
  const refAtivo = itemAtivo ? pesoVendidoRef(itemAtivo) : 0;
  const pesoStaged = itemAtivo ? staged[itemAtivo.id] : undefined;
  const pesoFoco = pesoStaged !== undefined ? pesoStaged : (itemAtivo && precisaPesar(itemAtivo) ? peso : 0);
  const divergencia = pesoFoco - refAtivo;

  const totalRef = useMemo(() => itens.filter(i => !i.cortado).reduce((s, i) => s + pesoVendidoRef(i), 0), [itens]);
  const totalAferido = useMemo(() => itens.filter(i => !i.cortado).reduce((s, i) => s + Number(i.pesoAferido || 0), 0), [itens]);
  const conferidos = itens.filter(i => i.separado || i.cortado).length;
  const tudoPronto = itens.length > 0 && conferidos === itens.length;

  const irPara = (idx: number) => setAtivo(Math.max(0, Math.min(itens.length - 1, idx)));
  const proximoPendente = () => {
    for (let k = 1; k <= itens.length; k++) {
      const idx = (ativo + k) % itens.length;
      if (!itens[idx].separado && !itens[idx].cortado) { setAtivo(idx); return; }
    }
  };

  const capturarPeso = () => { if (itemAtivo) setStaged(prev => ({ ...prev, [itemAtivo.id]: peso })); };

  const confirmarItem = async () => {
    if (!itemAtivo || salvando) return;
    setSalvando(true);
    try {
      const pesoFinal = pesoStaged !== undefined ? pesoStaged : (precisaPesar(itemAtivo) ? peso : refAtivo);
      const { data } = await api.patch(`/pedidos/${pedidoId}/itens/${itemAtivo.id}/separacao`, {
        pesoAferido: pesoFinal, separado: true, cortado: false,
      });
      setPedido(data); setItens(data.itens || []);
      setStaged(prev => { const n = { ...prev }; delete n[itemAtivo.id]; return n; });
      proximoPendente();
    } finally { setSalvando(false); }
  };

  const cortarItem = async () => {
    if (!itemAtivo || salvando) return;
    setSalvando(true);
    try {
      const novo = !itemAtivo.cortado;
      const { data } = await api.patch(`/pedidos/${pedidoId}/itens/${itemAtivo.id}/separacao`, {
        cortado: novo, separado: false, pesoAferido: novo ? 0 : Number(itemAtivo.pesoAferido || 0),
      });
      setPedido(data); setItens(data.itens || []);
      if (novo) proximoPendente();
    } finally { setSalvando(false); }
  };

  const liberar = async () => {
    if (salvando) return;
    setSalvando(true);
    try {
      await api.patch(`/pedidos/${pedidoId}/status`, { status: 'SEPARADO' });
      onFinalizado(); onClose();
    } finally { setSalvando(false); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); confirmarItem(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); irPara(ativo + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); irPara(ativo - 1); }
      else if (e.key === ' ') { e.preventDefault(); capturarPeso(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const semDiv = Math.abs(divergencia) < 0.005;
  const divCor = semDiv ? 'bg-slate-700 text-slate-200' : divergencia > 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col select-none">
      {/* ═══ Topo ═══ */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b-2 border-slate-700 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <Scale className="h-10 w-10 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-2xl font-black truncate leading-tight">{pedido?.cliente?.nomeFantasia || pedido?.cliente?.razaoSocial || '—'}</p>
            <p className="text-base text-slate-400">Pedido nº {pedido?.numero} · {itens.length} itens · <span className="text-emerald-400 font-bold">{conferidos}/{itens.length} conferidos</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <button onClick={() => setConfigHost(v => !v)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-base font-bold ${conectado ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'}`}>
              {conectado ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
              {conectado ? 'Balança OK' : 'Balança offline'}
              <Settings className="h-4 w-4 opacity-60" />
            </button>
            {configHost && (
              <div className="absolute right-0 mt-2 bg-white text-slate-800 rounded-xl shadow-2xl p-4 w-64 z-10">
                <p className="text-sm font-bold mb-1">Endereço da balança</p>
                <input defaultValue={host} onKeyDown={e => { if (e.key === 'Enter') { trocarHost((e.target as HTMLInputElement).value); setConfigHost(false); } }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base" placeholder="localhost" />
                <p className="text-xs text-gray-400 mt-1">ws://{host}:8765 · Enter pra salvar</p>
              </div>
            )}
          </div>
          <button onClick={onClose} className="h-14 w-14 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200">
            <X className="h-7 w-7" />
          </button>
        </div>
      </div>

      {/* ═══ Corpo ═══ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Item ativo + balança (esquerda, grande) ── */}
        <div className="w-[46%] shrink-0 border-r-2 border-slate-700 flex flex-col p-6 gap-4 overflow-auto">
          {itemAtivo ? (
            <>
              <div>
                <p className="text-5xl font-black leading-none">{itemAtivo.descricao}</p>
                <p className="text-2xl text-slate-300 mt-3">
                  Vendido <b className="text-white">{kg(Number(itemAtivo.quantidade))} {itemAtivo.unidade}</b>
                  <span className="text-slate-500"> · </span>
                  Esperado <b className="text-white">{kg(refAtivo)} kg</b>
                </p>
              </div>

              {/* Peso ao vivo — GIGANTE */}
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl px-6 py-8 text-center shadow-2xl">
                <div className="text-[140px] leading-none font-black tabular-nums tracking-tight">{kg(pesoFoco)}</div>
                <div className="text-3xl opacity-80 mt-2 font-bold">kg {pesoStaged !== undefined ? '· capturado' : ''}</div>
                <div className={`text-2xl font-bold mt-3 ${precisaPesar(itemAtivo) ? (estavel ? 'text-emerald-100' : 'text-amber-200') : 'text-emerald-100'}`}>
                  {!precisaPesar(itemAtivo) ? 'Item por unidade — pesagem opcional'
                    : conectado ? (estavel ? '● PESO ESTÁVEL' : '○ medindo…') : '✕ balança desligada'}
                </div>
              </div>

              {/* Divergência */}
              <div className={`rounded-2xl py-4 text-center font-black text-3xl ${divCor}`}>
                {semDiv ? '✓ Sem divergência'
                  : `${divergencia > 0 ? '+' : ''}${kg(divergencia)} kg ${divergencia > 0 ? 'ACIMA' : 'ABAIXO'}`}
              </div>

              {/* Botões grandes 2x2 */}
              <div className="grid grid-cols-2 gap-4 mt-auto">
                <button onClick={capturarPeso} disabled={!precisaPesar(itemAtivo) || !conectado}
                  className="flex items-center justify-center gap-3 bg-white text-slate-900 rounded-2xl py-8 text-2xl font-black disabled:opacity-30 active:scale-95 transition-transform">
                  <Scale className="h-8 w-8" /> Capturar
                </button>
                <button onClick={confirmarItem} disabled={salvando}
                  className="flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl py-8 text-2xl font-black disabled:opacity-40 active:scale-95 transition-transform">
                  <Check className="h-9 w-9" /> Confirmar
                </button>
                <button onClick={cortarItem} disabled={salvando}
                  className={`flex items-center justify-center gap-3 rounded-2xl py-6 text-xl font-bold active:scale-95 transition-transform ${itemAtivo.cortado ? 'bg-amber-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-100'}`}>
                  <Scissors className="h-7 w-7" /> {itemAtivo.cortado ? 'Cortado ✓' : 'Cortar'}
                </button>
                <button onClick={proximoPendente}
                  className="flex items-center justify-center gap-3 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-2xl py-6 text-xl font-bold active:scale-95 transition-transform">
                  <SkipForward className="h-7 w-7" /> Pular
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-2xl">Pedido sem itens.</div>
          )}
        </div>

        {/* ── Lista de itens (direita) — linhas grandes ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-auto divide-y divide-slate-800">
            {itens.map((it, idx) => {
              const ref = pesoVendidoRef(it);
              const af = Number(it.pesoAferido || 0);
              const div = af - ref;
              const isAtivo = idx === ativo;
              return (
                <button key={it.id} onClick={() => setAtivo(idx)}
                  className={`w-full flex items-center gap-4 px-5 py-4 text-left ${isAtivo ? 'bg-emerald-600/25 border-l-8 border-emerald-400' : 'border-l-8 border-transparent hover:bg-slate-800/60'} ${it.cortado ? 'opacity-50' : ''}`}>
                  {/* status bolinha */}
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center text-base font-black shrink-0
                    ${it.cortado ? 'bg-amber-500 text-white' : it.separado ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                    {it.cortado ? '✕' : it.separado ? '✓' : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-2xl font-bold truncate ${it.cortado ? 'line-through text-slate-500' : 'text-white'}`}>{it.descricao}</p>
                    <p className="text-lg text-slate-400">{kg(Number(it.quantidade))} {it.unidade} · esperado {kg(ref)} kg</p>
                  </div>
                  <div className="text-right shrink-0">
                    {it.separado ? (
                      <>
                        <p className={`text-3xl font-black tabular-nums ${div > 0.005 ? 'text-emerald-400' : div < -0.005 ? 'text-red-400' : 'text-white'}`}>{kg(af)}</p>
                        <p className="text-sm text-slate-500">kg aferido</p>
                      </>
                    ) : it.cortado ? (
                      <p className="text-xl font-bold text-amber-400">CORTADO</p>
                    ) : (
                      <p className="text-xl text-slate-500">pendente</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Rodapé: navegação + totais + liberar */}
          <div className="border-t-2 border-slate-700 bg-slate-950 px-5 py-4 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => irPara(ativo - 1)} className="h-16 w-16 flex items-center justify-center rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95"><ChevronLeft className="h-8 w-8" /></button>
                <button onClick={() => irPara(ativo + 1)} className="h-16 w-16 flex items-center justify-center rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95"><ChevronRight className="h-8 w-8" /></button>
              </div>
              <div className="flex items-center gap-6 text-lg">
                <div className="text-right"><span className="block text-xs uppercase text-slate-500">Vendido</span><b className="tabular-nums text-xl">{kg(totalRef)}</b></div>
                <div className="text-right"><span className="block text-xs uppercase text-slate-500">Aferido</span><b className="tabular-nums text-xl text-emerald-400">{kg(totalAferido)}</b></div>
              </div>
              <button onClick={liberar} disabled={salvando || !tudoPronto}
                className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl px-8 py-5 text-2xl font-black disabled:opacity-30 active:scale-95 transition-transform">
                <Truck className="h-8 w-8" /> Liberar
              </button>
            </div>
            {!tudoPronto && (
              <p className="text-base text-slate-500 mt-2 text-center">Confirme ou corte todos os itens para liberar ({conferidos}/{itens.length}).</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
