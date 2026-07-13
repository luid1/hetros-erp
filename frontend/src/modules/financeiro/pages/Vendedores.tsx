import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Users, RefreshCw, Plus, X, Search, Trash2, Pencil, Percent } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { toast, confirmDialog } from '../../../components/ui/feedback';
import { vendedoresApi } from '../../../services/api';

interface Vendedor {
  id: string;
  nome: string;
  documento?: string | null;
  email?: string | null;
  telefone?: string | null;
  percentualPadrao: number;
  fornecedorId?: string | null;
  ativo: boolean;
}

const pct = (v: any) => `${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

export default function Vendedores() {
  const { pode } = useAuth();
  const podeConfigurar = pode('/financeiro/vendedores', 'EDITAR');

  const [lista, setLista] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [incluirInativos, setIncluirInativos] = useState(false);
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<Vendedor | null>(null);

  const carregar = useCallback(() => {
    setLoading(true);
    vendedoresApi.list(incluirInativos)
      .then((r) => setLista(r.data || []))
      .catch(() => setLista([]))
      .finally(() => setLoading(false));
  }, [incluirInativos]);
  useEffect(() => { carregar(); }, [carregar]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((v) => v.nome.toLowerCase().includes(q) || (v.documento || '').includes(q));
  }, [lista, busca]);

  const remover = async (v: Vendedor) => {
    if (!(await confirmDialog(`Inativar o vendedor ${v.nome}?`))) return;
    try {
      await vendedoresApi.remover(v.id);
      toast('Vendedor inativado.', 'success');
      carregar();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha ao inativar.', 'error');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 rounded-2xl bg-amber-400/10 text-amber-300 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Vendedores</h1>
            <p className="text-[13px] text-slate-400">Representantes que recebem comissão sobre as vendas emitidas.</p>
          </div>
        </div>
        {podeConfigurar && (
          <button onClick={() => setCriando(true)} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold px-3 py-2 rounded-lg">
            <Plus className="h-4 w-4" /> Novo vendedor
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou documento…"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400" />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
          <input type="checkbox" checked={incluirInativos} onChange={(e) => setIncluirInativos(e.target.checked)} />
          Incluir inativos
        </label>
        <button onClick={carregar} className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="rounded-2xl border border-slate-700/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Nome</th>
              <th className="text-left px-4 py-3 font-semibold">Documento</th>
              <th className="text-left px-4 py-3 font-semibold">Contato</th>
              <th className="text-right px-4 py-3 font-semibold">% Padrão</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Carregando…</td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Nenhum vendedor cadastrado.</td></tr>
            ) : filtradas.map((v) => (
              <tr key={v.id} className={`border-t border-slate-800 ${v.ativo ? '' : 'opacity-50'}`}>
                <td className="px-4 py-3 text-slate-100 font-medium">{v.nome}</td>
                <td className="px-4 py-3 text-slate-400 font-mono">{v.documento || '—'}</td>
                <td className="px-4 py-3 text-slate-400">{v.email || v.telefone || '—'}</td>
                <td className="px-4 py-3 text-right text-slate-200 tabular-nums">{pct(v.percentualPadrao)}</td>
                <td className="px-4 py-3 text-right">
                  {podeConfigurar && (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditando(v)} className="h-8 w-8 rounded-lg hover:bg-slate-800 text-slate-400 flex items-center justify-center"><Pencil className="h-3.5 w-3.5" /></button>
                      {v.ativo && <button onClick={() => remover(v)} className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-rose-400 flex items-center justify-center"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {criando && <ModalVendedor onClose={() => setCriando(false)} onDone={() => { setCriando(false); carregar(); }} />}
      {editando && <ModalVendedor vendedor={editando} onClose={() => setEditando(null)} onDone={() => { setEditando(null); carregar(); }} />}
    </div>
  );
}

function ModalVendedor({ vendedor, onClose, onDone }: { vendedor?: Vendedor; onClose: () => void; onDone: () => void }) {
  const edicao = !!vendedor;
  const [nome, setNome] = useState(vendedor?.nome || '');
  const [documento, setDocumento] = useState(vendedor?.documento || '');
  const [email, setEmail] = useState(vendedor?.email || '');
  const [telefone, setTelefone] = useState(vendedor?.telefone || '');
  const [percentual, setPercentual] = useState(String(vendedor?.percentualPadrao ?? '0'));
  const [ativo, setAtivo] = useState(vendedor?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);

  const confirmar = async () => {
    if (!nome.trim()) { toast('Informe o nome.', 'error'); return; }
    const p = parseFloat(String(percentual).replace(',', '.')) || 0;
    if (p < 0 || p > 100) { toast('% padrão deve estar entre 0 e 100.', 'error'); return; }
    setSalvando(true);
    try {
      const payload = {
        nome: nome.trim(),
        documento: documento || undefined,
        email: email || undefined,
        telefone: telefone || undefined,
        percentualPadrao: p,
      };
      if (edicao) await vendedoresApi.atualizar(vendedor!.id, { ...payload, ativo });
      else await vendedoresApi.criar(payload);
      toast(edicao ? 'Vendedor atualizado.' : 'Vendedor criado.', 'success');
      onDone();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha ao salvar.', 'error');
    } finally { setSalvando(false); }
  };

  return createPortal((
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 animate-backdrop" onClick={onClose}>
      <div className="relative w-full max-w-sm bg-[#0e1729]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)] p-5 animate-modal" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-bold text-white">{edicao ? 'Editar vendedor' : 'Novo vendedor'}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-800 text-slate-400 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-slate-400">Nome</span>
            <input value={nome} onChange={e => setNome(e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-400">Documento</span>
              <input value={documento} onChange={e => setDocumento(e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400 flex items-center gap-1"><Percent className="h-3 w-3" /> % Padrão</span>
              <input type="number" step="0.01" min="0" max="100" value={percentual} onChange={e => setPercentual(e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 text-right font-mono focus:outline-none focus:border-amber-400" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-slate-400">E-mail</span>
            <input value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400" />
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Telefone</span>
            <input value={telefone} onChange={e => setTelefone(e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400" />
          </label>
          {edicao && (
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} />
              Ativo
            </label>
          )}
        </div>
        <button onClick={confirmar} disabled={salvando} className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold py-2.5 rounded-lg disabled:opacity-40">
          <Plus className="h-4 w-4" /> {edicao ? 'Salvar' : 'Criar'}
        </button>
      </div>
    </div>
  ), document.body);
}
