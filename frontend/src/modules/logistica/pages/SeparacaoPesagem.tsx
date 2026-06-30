import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, Check, Scissors, ChevronRight, Wifi, WifiOff, Truck, ArrowLeft, Keyboard,
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
  const [pesandoIdx, setPesandoIdx] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const { data } = await api.get(`/pedidos/${pedidoId}`);
    setPedido(data);
    setItens(data.itens || []);
  }, [pedidoId]);
  useEffect(() => { carregar(); }, [carregar]);

  const conferidos = itens.filter(i => i.separado || i.cortado).length;
  const pct = itens.length ? Math.round((conferidos / itens.length) * 100) : 0;
  const tudoPronto = itens.length > 0 && conferidos === itens.length;

  const salvarItem = async (itemId: string, body: any) => {
    setSalvando(true);
    try {
      const { data } = await api.patch(`/pedidos/${pedidoId}/itens/${itemId}/separacao`, body);
      setPedido(data); setItens(data.itens || []);
      return data.itens as ItemSep[];
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

  const st = (it: ItemSep) => it.cortado ? 'cortado' : it.separado ? 'ok' : 'pendente';

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col select-none">
      {/* ═══ Cabeçalho ═══ */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={onClose} className="h-12 w-12 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 shrink-0">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="min-w-0">
              <p className="text-2xl font-black text-slate-800 leading-tight truncate">{pedido?.cliente?.nomeFantasia || pedido?.cliente?.razaoSocial || '—'}</p>
              <p className="text-base text-slate-400">Pedido nº {pedido?.numero} · {itens.length} itens</p>
            </div>
          </div>
          <button onClick={liberar} disabled={salvando || !tudoPronto}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl px-7 py-4 text-xl font-black disabled:opacity-30 active:scale-95 transition-transform shrink-0">
            <Truck className="h-6 w-6" /> Finalizar
          </button>
        </div>
        {/* Barra de progresso */}
        <div className="mt-3">
          <div className="flex justify-between text-sm text-slate-500 mb-1">
            <span>{conferidos} de {itens.length} itens confirmados</span>
            <span className="font-bold">{pct}%</span>
          </div>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* ═══ Lista de itens ═══ */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {itens.map((it, idx) => {
          const status = st(it);
          const ref = pesoVendidoRef(it);
          const af = Number(it.pesoAferido || 0);
          const div = af - ref;
          return (
            <button key={it.id} onClick={() => setPesandoIdx(idx)}
              className={`w-full flex items-center gap-4 bg-white rounded-2xl px-5 py-4 text-left shadow-sm border-2 active:scale-[0.99] transition-transform
                ${status === 'ok' ? 'border-emerald-300' : status === 'cortado' ? 'border-amber-300 opacity-70' : 'border-transparent hover:border-slate-300'}`}>
              <div className={`h-14 w-14 rounded-full flex items-center justify-center text-xl font-black shrink-0
                ${status === 'cortado' ? 'bg-amber-500 text-white' : status === 'ok' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {status === 'cortado' ? '✕' : status === 'ok' ? '✓' : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-2xl font-bold truncate ${status === 'cortado' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{it.descricao}</p>
                <p className="text-lg text-slate-400">Pedido: {kg(Number(it.quantidade))} {it.unidade}{ref > 0 ? ` · esperado ${kg(ref)} kg` : ''}</p>
              </div>
              <div className="text-right shrink-0">
                {status === 'ok' ? (
                  <>
                    <p className={`text-3xl font-black tabular-nums ${div > 0.005 ? 'text-emerald-600' : div < -0.005 ? 'text-red-500' : 'text-slate-800'}`}>{kg(af)}</p>
                    <p className="text-sm text-slate-400">kg aferido</p>
                  </>
                ) : status === 'cortado' ? (
                  <p className="text-xl font-bold text-amber-500">CORTADO</p>
                ) : (
                  <p className="text-xl text-slate-300">—</p>
                )}
              </div>
              <ChevronRight className="h-7 w-7 text-slate-300 shrink-0" />
            </button>
          );
        })}
        {!tudoPronto && itens.length > 0 && (
          <p className="text-center text-slate-400 text-base pt-2">Toque em cada item para pesar/conferir. Confirme ou corte todos para finalizar.</p>
        )}
        {itens.length === 0 && <p className="text-center text-slate-400 text-xl pt-10">Pedido sem itens.</p>}
      </div>

      {/* ═══ Modal de pesagem do item ═══ */}
      {pesandoIdx !== null && itens[pesandoIdx] && (
        <ModalPesoItem
          item={itens[pesandoIdx]}
          ref0={pesoVendidoRef(itens[pesandoIdx])}
          salvando={salvando}
          onConfirmar={async (peso) => {
            const novos = await salvarItem(itens[pesandoIdx].id, { pesoAferido: peso, separado: true, cortado: false });
            const prox = novos.findIndex((i) => !i.separado && !i.cortado);
            setPesandoIdx(prox >= 0 ? prox : null);
          }}
          onCortar={async () => {
            const it = itens[pesandoIdx];
            const novos = await salvarItem(it.id, { cortado: !it.cortado, separado: false, pesoAferido: 0 });
            const prox = novos.findIndex((i) => !i.separado && !i.cortado);
            setPesandoIdx(!it.cortado ? (prox >= 0 ? prox : null) : pesandoIdx);
          }}
          onClose={() => setPesandoIdx(null)}
        />
      )}
    </div>
  );
}

// ─────────── Modal de pesagem de um item ───────────
function ModalPesoItem({ item, ref0, salvando, onConfirmar, onCortar, onClose }: {
  item: ItemSep; ref0: number; salvando: boolean;
  onConfirmar: (peso: number) => void; onCortar: () => void; onClose: () => void;
}) {
  const { peso, estavel, conectado, host, trocarHost } = useBalanca(true);
  const [manual, setManual] = useState(!precisaPesar(item));
  const [manualVal, setManualVal] = useState('');
  const [cfg, setCfg] = useState(false);

  const pesoFoco = manual ? (parseFloat(manualVal) || 0) : peso;
  const div = pesoFoco - ref0;
  const pctDiv = ref0 > 0 ? (div / ref0) * 100 : 0;
  const semDiv = Math.abs(div) < 0.005;
  const barra = ref0 > 0 ? Math.min(100, (pesoFoco / ref0) * 100) : (pesoFoco > 0 ? 100 : 0);

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl">
        {/* topo */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500">
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-2xl font-black text-slate-800 truncate">{item.descricao}</p>
            <p className="text-base text-slate-400">Pedido: {kg(Number(item.quantidade))} {item.unidade}{ref0 > 0 ? ` · esperado ${kg(ref0)} kg` : ''}</p>
          </div>
        </div>

        <div className="px-6 py-5">
          {/* status balança */}
          <div className="flex items-center justify-between mb-3">
            <div className="relative">
              <button onClick={() => setCfg(v => !v)} className={`flex items-center gap-2 text-sm font-bold ${conectado ? 'text-emerald-600' : 'text-slate-400'}`}>
                {conectado ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                {conectado ? 'Balança conectada' : 'Balança não conectada'}
              </button>
              {cfg && (
                <div className="absolute left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-56 z-10">
                  <p className="text-xs font-bold mb-1 text-slate-600">Endereço da balança</p>
                  <input defaultValue={host} onKeyDown={e => { if (e.key === 'Enter') { trocarHost((e.target as HTMLInputElement).value); setCfg(false); } }}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="localhost" />
                  <p className="text-[10px] text-slate-400 mt-1">ws://{host}:8765 · Enter</p>
                </div>
              )}
            </div>
            <button onClick={() => setManual(m => !m)} className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg border ${manual ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-500 border-slate-300'}`}>
              <Keyboard className="h-4 w-4" /> Modo Manual
            </button>
          </div>

          {/* peso */}
          {manual ? (
            <div className="text-center py-4">
              <input autoFocus type="number" inputMode="decimal" value={manualVal} onChange={e => setManualVal(e.target.value)}
                placeholder="0,000" className="w-full text-center text-7xl font-black tabular-nums text-slate-800 border-b-4 border-emerald-400 outline-none py-2" />
              <p className="text-xl text-slate-400 mt-1">kg (digite o peso)</p>
            </div>
          ) : (
            <div className="text-center py-2">
              <div className="text-8xl font-black tabular-nums text-slate-800 leading-none">
                {kg(peso)}<span className="text-3xl text-slate-400 ml-2">kg</span>
              </div>
              <p className={`text-base font-bold mt-1 ${conectado ? (estavel ? 'text-emerald-600' : 'text-amber-500') : 'text-slate-400'}`}>
                {conectado ? (estavel ? '● peso estável' : '○ medindo…') : 'sem balança — use o Modo Manual'}
              </p>
            </div>
          )}

          {/* divergência + barra */}
          <div className="mt-3">
            <div className={`rounded-xl py-2 text-center text-xl font-black ${semDiv ? 'bg-slate-100 text-slate-500' : div > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
              {ref0 <= 0 ? 'Sem peso de referência' : semDiv ? '✓ sem divergência'
                : `${div > 0 ? '+' : ''}${kg(div)} kg (${pctDiv > 0 ? '+' : ''}${pctDiv.toFixed(1)}%)`}
            </div>
            {ref0 > 0 && (
              <div className="mt-2">
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${div > 0.005 ? 'bg-emerald-500' : div < -0.005 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${barra}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1"><span>0</span><span>{kg(ref0)} kg</span></div>
              </div>
            )}
          </div>

          {/* ações */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <button onClick={onCortar} disabled={salvando}
              className={`flex items-center justify-center gap-2 rounded-2xl py-5 text-lg font-bold ${item.cortado ? 'bg-amber-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
              <Scissors className="h-5 w-5" /> {item.cortado ? 'Cortado' : 'Cortar'}
            </button>
            <button onClick={() => onConfirmar(pesoFoco)} disabled={salvando || (!manual && !conectado && precisaPesar(item))}
              className="col-span-2 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl py-5 text-2xl font-black disabled:opacity-40 active:scale-95 transition-transform">
              <Check className="h-7 w-7" /> Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
