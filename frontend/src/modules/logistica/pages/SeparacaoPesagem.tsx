import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, Scale, Check, Scissors, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight,
  Wifi, WifiOff, Settings, Truck, RotateCcw,
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

// Peso de referência em kg ("Peso Vendido Original")
function pesoVendidoRef(it: ItemSep): number {
  const u = (it.unidade || '').toUpperCase();
  const pesoUnit = Number(it.produto?.pesoLiquido || it.produto?.pesoBruto || 0);
  if (u === 'KG' || u === 'KGL') return Number(it.quantidade);
  if (pesoUnit > 0) return Number(it.quantidade) * pesoUnit;
  return 0; // peso unitário não cadastrado
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
    // posiciona no primeiro item ainda não separado
    const prox = (data.itens || []).findIndex((i: ItemSep) => !i.separado && !i.cortado);
    setAtivo(prox >= 0 ? prox : 0);
  }, [pedidoId]);

  useEffect(() => { carregar(); }, [carregar]);

  const itemAtivo = itens[ativo];
  const refAtivo = itemAtivo ? pesoVendidoRef(itemAtivo) : 0;
  const pesoStaged = itemAtivo ? staged[itemAtivo.id] : undefined;
  // peso "em foco": o capturado (staged) ou, se for item de pesar, o peso ao vivo
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

  const capturarPeso = () => {
    if (!itemAtivo) return;
    setStaged(prev => ({ ...prev, [itemAtivo.id]: peso }));
  };

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
      onFinalizado();
      onClose();
    } finally { setSalvando(false); }
  };

  // Atalhos de teclado (touch + teclado): Enter=confirmar, setas=navegar
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

  const divCor = Math.abs(divergencia) < 0.005 ? 'text-slate-300' : divergencia > 0 ? 'text-emerald-300' : 'text-red-300';
  const divBg = Math.abs(divergencia) < 0.005 ? 'bg-slate-700' : divergencia > 0 ? 'bg-emerald-900/60' : 'bg-red-900/60';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col">
      {/* ─── Topo ─── */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-950 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <Scale className="h-7 w-7 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-black truncate">{pedido?.cliente?.nomeFantasia || pedido?.cliente?.razaoSocial || '—'}</p>
            <p className="text-xs text-slate-400">Pedido nº {pedido?.numero} · Id Venda {pedido?.numero} · {itens.length} itens</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Status balança */}
          <div className="relative">
            <button onClick={() => setConfigHost(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${conectado ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'}`}>
              {conectado ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              Balança {conectado ? 'conectada' : 'offline'}
              <Settings className="h-3.5 w-3.5 opacity-60" />
            </button>
            {configHost && (
              <div className="absolute right-0 mt-1 bg-white text-slate-800 rounded-lg shadow-xl p-3 w-56 z-10">
                <p className="text-[11px] font-bold mb-1">Endereço da balança (host)</p>
                <input defaultValue={host} onKeyDown={e => { if (e.key === 'Enter') { trocarHost((e.target as HTMLInputElement).value); setConfigHost(false); } }}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs" placeholder="localhost" />
                <p className="text-[10px] text-gray-400 mt-1">ws://{host}:8765 · Enter pra salvar</p>
              </div>
            )}
          </div>
          <span className="text-xs text-slate-400">{conferidos}/{itens.length} conferidos</span>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-slate-700 text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ─── Corpo ─── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Item ativo + balança */}
        <div className="w-[42%] shrink-0 border-r border-slate-700 flex flex-col p-5 gap-4 overflow-auto">
          {itemAtivo ? (
            <>
              <div>
                <p className="text-3xl font-black leading-tight">{itemAtivo.descricao}</p>
                <p className="text-sm text-slate-400 mt-1">
                  Vendido: <b className="text-slate-200">{kg(Number(itemAtivo.quantidade))} {itemAtivo.unidade}</b>
                  {' · '}Peso esperado: <b className="text-slate-200">{kg(refAtivo)} kg</b>
                </p>
              </div>

              {/* Peso ao vivo */}
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-center shadow-lg">
                <div className="text-[88px] leading-none font-black tabular-nums">{kg(pesoFoco)}</div>
                <div className="text-lg opacity-80 mt-1">kg {pesoStaged !== undefined ? '(capturado)' : ''}</div>
                <div className={`text-sm font-bold mt-2 ${precisaPesar(itemAtivo) ? (estavel ? 'text-emerald-200' : 'text-amber-200') : 'text-emerald-100'}`}>
                  {!precisaPesar(itemAtivo) ? 'Item por unidade — pesagem opcional'
                    : conectado ? (estavel ? '● estável' : '○ medindo…') : '✕ balança offline'}
                </div>
              </div>

              {/* Divergência */}
              <div className={`rounded-xl py-3 text-center font-bold text-lg ${divBg} ${divCor}`}>
                {Math.abs(divergencia) < 0.005 ? 'Sem divergência'
                  : `${divergencia > 0 ? '+' : ''}${kg(divergencia)} kg ${divergencia > 0 ? 'acima' : 'abaixo'}`}
              </div>

              {/* Ações principais */}
              <div className="grid grid-cols-2 gap-3 mt-auto">
                <button onClick={capturarPeso} disabled={!precisaPesar(itemAtivo) || !conectado}
                  className="flex items-center justify-center gap-2 bg-white text-slate-900 rounded-xl py-4 text-base font-bold disabled:opacity-30 hover:bg-slate-100">
                  <Scale className="h-5 w-5" /> Capturar Peso
                </button>
                <button onClick={confirmarItem} disabled={salvando}
                  className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl py-4 text-base font-black disabled:opacity-40">
                  <Check className="h-5 w-5" /> Confirmar
                </button>
                <button onClick={cortarItem} disabled={salvando}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${itemAtivo.cortado ? 'bg-amber-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}>
                  <Scissors className="h-4 w-4" /> {itemAtivo.cortado ? 'Cortado ✓ (desfazer)' : 'Cortar item'}
                </button>
                <button onClick={proximoPendente}
                  className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl py-3 text-sm font-bold">
                  Pular <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">Pedido sem itens.</div>
          )}
        </div>

        {/* Lista de itens */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 sticky top-0 text-xs text-slate-300">
                <tr>
                  {['#', 'Cód', 'Descrição', 'Qtd', 'Un', 'Vendido (kg)', 'Aferido (kg)', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itens.map((it, idx) => {
                  const ref = pesoVendidoRef(it);
                  const af = Number(it.pesoAferido || 0);
                  const div = af - ref;
                  const isAtivo = idx === ativo;
                  return (
                    <tr key={it.id} onClick={() => setAtivo(idx)}
                      className={`border-b border-slate-800 cursor-pointer ${isAtivo ? 'bg-slate-700' : 'hover:bg-slate-800/60'} ${it.cortado ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono text-slate-400">{it.produto?.codigo}</td>
                      <td className={`px-3 py-2 font-semibold ${it.cortado ? 'line-through text-slate-500' : ''}`}>{it.descricao}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{kg(Number(it.quantidade))}</td>
                      <td className="px-3 py-2 text-slate-400">{it.unidade}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-300">{kg(ref)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {it.separado
                          ? <span className={div > 0.005 ? 'text-emerald-400' : div < -0.005 ? 'text-red-400' : 'text-slate-200'}>{kg(af)}</span>
                          : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {it.cortado ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-900/60 text-amber-300">CORTADO</span>
                          : it.separado ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900/60 text-emerald-300">OK</span>
                          : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-400">pendente</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Rodapé: navegação + totais + liberar */}
          <div className="border-t border-slate-700 bg-slate-950 px-4 py-3 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1">
                <button onClick={() => irPara(0)} className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700"><ChevronFirst className="h-4 w-4" /></button>
                <button onClick={() => irPara(ativo - 1)} className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => irPara(ativo + 1)} className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700"><ChevronRight className="h-4 w-4" /></button>
                <button onClick={() => irPara(itens.length - 1)} className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700"><ChevronLast className="h-4 w-4" /></button>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right"><span className="block text-[10px] uppercase text-slate-500">Total vendido</span><b className="tabular-nums">{kg(totalRef)} kg</b></div>
                <div className="text-right"><span className="block text-[10px] uppercase text-slate-500">Total aferido</span><b className="tabular-nums text-emerald-400">{kg(totalAferido)} kg</b></div>
              </div>
              <button onClick={liberar} disabled={salvando || !tudoPronto}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl px-5 py-3 text-base font-black disabled:opacity-30">
                <Truck className="h-5 w-5" /> Liberar p/ Faturamento
              </button>
            </div>
            {!tudoPronto && (
              <p className="text-[11px] text-slate-500 mt-1 text-center flex items-center justify-center gap-1">
                <RotateCcw className="h-3 w-3" /> Confirme ou corte todos os itens para liberar ({conferidos}/{itens.length}).
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
