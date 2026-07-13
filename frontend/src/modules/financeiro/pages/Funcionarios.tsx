import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Users, RefreshCw, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { toast, confirmDialog } from '../../../components/ui/feedback';
import { pessoasApi } from '../../../services/api';

type StatusFunc = 'ATIVO' | 'AFASTADO' | 'DESLIGADO';
interface Funcionario {
  id: string;
  nome: string;
  cpf?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  salarioBase: number;
  status: StatusFunc;
  chavePix?: string | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  dataAdmissao?: string | null;
  observacoes?: string | null;
}

const brl = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const inputCls = 'mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400';

const BADGE: Record<StatusFunc, string> = {
  ATIVO: 'bg-emerald-500/15 text-emerald-300',
  AFASTADO: 'bg-amber-500/15 text-amber-300',
  DESLIGADO: 'bg-slate-500/15 text-slate-400',
};

export default function Funcionarios() {
  const { pode } = useAuth();
  const podeConfigurar = pode('/financeiro/funcionarios', 'EDITAR');

  const [lista, setLista] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<Funcionario | null>(null);

  const carregar = useCallback(() => {
    setLoading(true);
    pessoasApi.list()
      .then((r) => setLista(r.data))
      .catch(() => setLista([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const remover = async (f: Funcionario) => {
    const ok = await confirmDialog(`Remover/desligar "${f.nome}"?`);
    if (!ok) return;
    try {
      await pessoasApi.remover(f.id);
      toast('Funcionário atualizado.', 'success');
      carregar();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha ao remover.', 'error');
    }
  };

  const ativos = lista.filter((f) => f.status === 'ATIVO');
  const folhaEstim = ativos.reduce((acc, f) => acc + Number(f.salarioBase || 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-500/30 to-cyan-500/20 border border-white/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-sky-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Funcionários</h1>
            <p className="text-sm text-slate-400">Cadastro de colaboradores usado pela folha de pagamento.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={carregar} className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center" title="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {podeConfigurar && (
            <button onClick={() => setCriando(true)} className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold px-3 py-2 rounded-lg">
              <Plus className="h-4 w-4" /> Novo funcionário
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0e1729]/70 border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-slate-400">Ativos</p>
          <p className="text-2xl font-bold text-white mt-1">{ativos.length}</p>
        </div>
        <div className="bg-[#0e1729]/70 border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-slate-400">Folha estimada (salário-base)</p>
          <p className="text-2xl font-bold text-emerald-300 mt-1">{brl(folhaEstim)}</p>
        </div>
        <div className="bg-[#0e1729]/70 border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-slate-400">Total cadastrado</p>
          <p className="text-2xl font-bold text-white mt-1">{lista.length}</p>
        </div>
      </div>

      <div className="bg-[#0e1729]/70 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando…</div>
        ) : lista.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Nenhum funcionário cadastrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-white/10">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Cargo</th>
                <th className="px-4 py-3 font-medium">Departamento</th>
                <th className="px-4 py-3 font-medium text-right">Salário-base</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((f) => (
                <tr key={f.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="text-slate-100 font-medium">{f.nome}</div>
                    {f.cpf && <div className="text-xs text-slate-500">{f.cpf}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{f.cargo || '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{f.departamento || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-100">{brl(f.salarioBase)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${BADGE[f.status]}`}>{f.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {podeConfigurar && (
                        <>
                          <button onClick={() => setEditando(f)} className="h-8 w-8 rounded-lg hover:bg-slate-800 text-slate-400 flex items-center justify-center" title="Editar">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => remover(f)} className="h-8 w-8 rounded-lg hover:bg-slate-800 text-rose-400 flex items-center justify-center" title="Remover/desligar">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {criando && <ModalFuncionario onClose={() => setCriando(false)} onDone={() => { setCriando(false); carregar(); }} />}
      {editando && <ModalFuncionario func={editando} onClose={() => setEditando(null)} onDone={() => { setEditando(null); carregar(); }} />}
    </div>
  );
}

function ModalFuncionario({ func, onClose, onDone }: { func?: Funcionario; onClose: () => void; onDone: () => void }) {
  const edicao = !!func;
  const [nome, setNome] = useState(func?.nome || '');
  const [cpf, setCpf] = useState(func?.cpf || '');
  const [cargo, setCargo] = useState(func?.cargo || '');
  const [departamento, setDepartamento] = useState(func?.departamento || '');
  const [salarioBase, setSalarioBase] = useState(String(func?.salarioBase ?? '0'));
  const [status, setStatus] = useState<StatusFunc>(func?.status || 'ATIVO');
  const [chavePix, setChavePix] = useState(func?.chavePix || '');
  const [banco, setBanco] = useState(func?.banco || '');
  const [agencia, setAgencia] = useState(func?.agencia || '');
  const [conta, setConta] = useState(func?.conta || '');
  const [dataAdmissao, setDataAdmissao] = useState(func?.dataAdmissao ? func.dataAdmissao.slice(0, 10) : '');
  const [observacoes, setObservacoes] = useState(func?.observacoes || '');
  const [salvando, setSalvando] = useState(false);

  const confirmar = async () => {
    if (!nome.trim()) { toast('Informe o nome.', 'error'); return; }
    const payload: any = {
      nome: nome.trim(),
      cpf: cpf || undefined,
      cargo: cargo || undefined,
      departamento: departamento || undefined,
      salarioBase: parseFloat(String(salarioBase).replace(',', '.')) || 0,
      status,
      chavePix: chavePix || undefined,
      banco: banco || undefined,
      agencia: agencia || undefined,
      conta: conta || undefined,
      dataAdmissao: dataAdmissao ? new Date(dataAdmissao).toISOString() : undefined,
      observacoes: observacoes || undefined,
    };
    setSalvando(true);
    try {
      if (edicao) await pessoasApi.atualizar(func!.id, payload);
      else await pessoasApi.criar(payload);
      toast(edicao ? 'Funcionário atualizado.' : 'Funcionário criado.', 'success');
      onDone();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha ao salvar.', 'error');
    } finally { setSalvando(false); }
  };

  return createPortal((
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 animate-backdrop p-4" onClick={onClose}>
      <div className="relative w-full max-w-md bg-[#0e1729]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)] p-5 animate-modal max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-bold text-white">{edicao ? 'Editar funcionário' : 'Novo funcionário'}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-800 text-slate-400 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-slate-400">Nome</span>
            <input value={nome} onChange={e => setNome(e.target.value)} className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-400">CPF</span>
              <input value={cpf} onChange={e => setCpf(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Admissão</span>
              <input type="date" value={dataAdmissao} onChange={e => setDataAdmissao(e.target.value)} className={inputCls} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-400">Cargo</span>
              <input value={cargo} onChange={e => setCargo(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Departamento</span>
              <input value={departamento} onChange={e => setDepartamento(e.target.value)} className={inputCls} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-400">Salário-base</span>
              <input type="number" step="0.01" value={salarioBase} onChange={e => setSalarioBase(e.target.value)} className={`${inputCls} text-right font-mono`} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Status</span>
              <select value={status} onChange={e => setStatus(e.target.value as StatusFunc)} className={inputCls}>
                <option value="ATIVO">Ativo</option>
                <option value="AFASTADO">Afastado</option>
                <option value="DESLIGADO">Desligado</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-slate-400">Chave PIX</span>
            <input value={chavePix} onChange={e => setChavePix(e.target.value)} className={inputCls} />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-slate-400">Banco</span>
              <input value={banco} onChange={e => setBanco(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Agência</span>
              <input value={agencia} onChange={e => setAgencia(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Conta</span>
              <input value={conta} onChange={e => setConta(e.target.value)} className={inputCls} />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-slate-400">Observações</span>
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} className={inputCls} />
          </label>
        </div>
        <button onClick={confirmar} disabled={salvando} className="mt-4 w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold py-2.5 rounded-lg disabled:opacity-40">
          <Plus className="h-4 w-4" /> {edicao ? 'Salvar' : 'Criar'}
        </button>
      </div>
    </div>
  ), document.body);
}
