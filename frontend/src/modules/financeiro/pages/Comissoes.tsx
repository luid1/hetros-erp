import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Percent, RefreshCw, X, CheckCircle2, Clock, Ban, CircleDollarSign, Lock,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from '../../../components/ui/feedback';
import { comissoesApi } from '../../../services/api';

const R$ = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v: any) => `${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const hojeISO = () => new Date().toISOString().slice(0, 10);
const dataBR = (v: any) => v ? new Date(v).toLocaleDateString('pt-BR') : '—';

const STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
  PENDENTE: { label: 'Pendente', cls: 'bg-amber-400/10 text-amber-300 border-amber-400/20', icon: Clock },
  FECHADA: { label: 'Fechada', cls: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20', icon: CheckCircle2 },
  CANCELADA: { label: 'Cancelada', cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: Ban },
};

interface Comissao {
  id: string;
  descricao: string;
  status: string;
  baseCalculo: number;
  percentual: number;
  valor: number;
  competencia: string;
  vendedor?: { id: string; nome: string };
}

export default function Comissoes() {
  const { pode } = useAuth();
  const podeOperar = pode('/financeiro/comissoes', 'EDITAR');

  const [lista, setLista] = useState<Comissao[]>([]);
  const [resumo, setResumo] = useState<{ pendente: number; fechada: number; cancelada: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('PENDENTE');
  const [fechando, setFechando] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    Promise.all([
      comissoesApi.list(status ? { status } : {}),
      comissoesApi.resumo(),
    ])
      .then(([l, r]) => { setLista(l.data || []); setResumo(r.data || null); })
      .catch(() => { setLista([]); setResumo(null); })
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(() => { carregar(); }, [carregar]);

  const totalPendente = useMemo(
    () => lista.filter((c) => c.status === 'PENDENTE').reduce((s, c) => s + Number(c.valor), 0),
    [lista],
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 rounded-2xl bg-amber-400/10 text-amber-300 flex items-center justify-center">
            <Percent className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Comissões</h1>
            <p className="text-[13px] text-slate-400">Geradas na emissão da NF-e; fechadas em títulos a pagar por vendedor.</p>
          </div>
        </div>
        {podeOperar && (
          <button onClick={() => setFechando(true)} disabled={totalPendente <= 0} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold px-3 py-2 rounded-lg disabled:opacity-40">
            <Lock className="h-4 w-4" /> Fechar comissões
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <Kpi icon={<Clock className="h-4 w-4" />} label="Pendentes" valor={resumo ? R$(resumo.pendente) : null} cor="amber" />
        <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Fechadas" valor={resumo ? R$(resumo.fechada) : null} cor="emerald" />
        <Kpi icon={<Ban className="h-4 w-4" />} label="Canceladas" valor={resumo ? R$(resumo.cancelada) : null} cor="slate" />
      </div>

      <div className="flex items-center gap-2 mb-4">
        {['PENDENTE', 'FECHADA', 'CANCELADA', ''].map((s) => (
          <button key={s || 'todas'} onClick={() => setStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-lg border ${status === s ? 'bg-amber-500/15 text-amber-300 border-amber-400/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
            {s ? STATUS_META[s].label : 'Todas'}
          </button>
        ))}
        <button onClick={carregar} className="ml-auto h-9 w-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="rounded-2xl border border-slate-700/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Vendedor</th>
              <th className="text-left px-4 py-3 font-semibold">Descrição</th>
              <th className="text-right px-4 py-3 font-semibold">Base</th>
              <th className="text-right px-4 py-3 font-semibold">%</th>
              <th className="text-right px-4 py-3 font-semibold">Valor</th>
              <th className="text-left px-4 py-3 font-semibold">Competência</th>
              <th className="text-center px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Carregando…</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Nenhuma comissão neste filtro.</td></tr>
            ) : lista.map((c) => {
              const meta = STATUS_META[c.status] || STATUS_META.PENDENTE;
              const Icon = meta.icon;
              return (
                <tr key={c.id} className="border-t border-slate-800">
                  <td className="px-4 py-3 text-slate-100 font-medium">{c.vendedor?.nome || '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{c.descricao}</td>
                  <td className="px-4 py-3 text-right text-slate-400 tabular-nums">{R$(c.baseCalculo)}</td>
                  <td className="px-4 py-3 text-right text-slate-400 tabular-nums">{pct(c.percentual)}</td>
                  <td className="px-4 py-3 text-right text-slate-100 font-semibold tabular-nums">{R$(c.valor)}</td>
                  <td className="px-4 py-3 text-slate-400">{dataBR(c.competencia)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${meta.cls}`}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {fechando && <ModalFechar onClose={() => setFechando(false)} onDone={() => { setFechando(false); carregar(); }} />}
    </div>
  );
}

function ModalFechar({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [vencimento, setVencimento] = useState(hojeISO());
  const [salvando, setSalvando] = useState(false);

  const confirmar = async () => {
    setSalvando(true);
    try {
      const r = await comissoesApi.fechar({ dataVencimento: vencimento });
      toast(`${r.data?.totalTitulos ?? 0} título(s) a pagar gerado(s).`, 'success');
      onDone();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha ao fechar.', 'error');
    } finally { setSalvando(false); }
  };

  return createPortal((
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 animate-backdrop" onClick={onClose}>
      <div className="relative w-full max-w-sm bg-[#0e1729]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)] p-5 animate-modal" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-bold text-white">Fechar comissões pendentes</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-800 text-slate-400 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-[13px] text-slate-400 mb-4">
          Gera um título a pagar por vendedor (categoria Comissões no Plano de Contas), somando todas as comissões pendentes.
        </p>
        <label className="block">
          <span className="text-xs text-slate-400">Vencimento do(s) título(s)</span>
          <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400" />
        </label>
        <button onClick={confirmar} disabled={salvando} className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold py-2.5 rounded-lg disabled:opacity-40">
          <CircleDollarSign className="h-4 w-4" /> Fechar e gerar títulos
        </button>
      </div>
    </div>
  ), document.body);
}

const CORES: Record<string, string> = {
  amber: 'bg-amber-400/10 text-amber-300',
  emerald: 'bg-emerald-400/10 text-emerald-300',
  slate: 'bg-slate-500/10 text-slate-400',
};
function Kpi({ icon, label, valor, cor }: { icon: any; label: string; valor: string | null; cor: string }) {
  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${CORES[cor]}`}>{icon}</span>
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider truncate">{label}</p>
      </div>
      {valor === null
        ? <div className="h-7 w-28 bg-slate-700/40 rounded animate-pulse" />
        : <p className="text-2xl font-extrabold text-white tracking-tight truncate">{valor}</p>}
    </div>
  );
}
