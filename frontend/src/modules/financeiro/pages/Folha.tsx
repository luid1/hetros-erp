import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Wallet, RefreshCw, Plus, X, Trash2, Lock, Unlock, Users, Sparkles, ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { toast, confirmDialog } from '../../../components/ui/feedback';
import { folhaApi } from '../../../services/api';

type StatusFolha = 'ABERTA' | 'FECHADA' | 'CANCELADA';
type TipoItem = 'PROVENTO' | 'DESCONTO';

interface ItemFolha {
  id: string;
  funcionarioId: string;
  funcionarioNome?: string;
  descricao: string;
  tipo: TipoItem;
  valor: number;
}
interface Folha {
  id: string;
  competencia: string;
  descricao?: string | null;
  status: StatusFolha;
  dataPagamento?: string | null;
  totalProventos: number;
  totalDescontos: number;
  totalLiquido: number;
  itens?: ItemFolha[];
}

const brl = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const inputCls = 'mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400';
const BADGE: Record<StatusFolha, string> = {
  ABERTA: 'bg-sky-500/15 text-sky-300',
  FECHADA: 'bg-emerald-500/15 text-emerald-300',
  CANCELADA: 'bg-slate-500/15 text-slate-400',
};

export default function Folha() {
  const { pode } = useAuth();
  const podeConfigurar = pode('/financeiro/folha', 'EDITAR');
  const podeOperar = pode('/financeiro/folha', 'CRIAR');

  const [lista, setLista] = useState<Folha[]>([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);

  const carregar = useCallback(() => {
    setLoading(true);
    folhaApi.list()
      .then((r) => setLista(r.data))
      .catch(() => setLista([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  if (detalheId) {
    return <DetalheFolha id={detalheId} podeConfigurar={podeConfigurar} podeOperar={podeOperar} onBack={() => { setDetalheId(null); carregar(); }} />;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border border-white/10 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Folha de Pagamento</h1>
            <p className="text-sm text-slate-400">Feche a competência para gerar as contas a pagar dos salários.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={carregar} className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center" title="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {podeConfigurar && (
            <button onClick={() => setCriando(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold px-3 py-2 rounded-lg">
              <Plus className="h-4 w-4" /> Nova folha
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#0e1729]/70 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando…</div>
        ) : lista.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Nenhuma folha criada.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-white/10">
                <th className="px-4 py-3 font-medium">Competência</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium text-right">Proventos</th>
                <th className="px-4 py-3 font-medium text-right">Descontos</th>
                <th className="px-4 py-3 font-medium text-right">Líquido</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((f) => (
                <tr key={f.id} onClick={() => setDetalheId(f.id)} className="border-b border-white/5 hover:bg-white/[0.04] cursor-pointer">
                  <td className="px-4 py-3 text-slate-100 font-medium">{f.competencia}</td>
                  <td className="px-4 py-3 text-slate-300">{f.descricao || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-300">{brl(f.totalProventos)}</td>
                  <td className="px-4 py-3 text-right font-mono text-rose-300">{brl(f.totalDescontos)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-100 font-semibold">{brl(f.totalLiquido)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${BADGE[f.status]}`}>{f.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {criando && <ModalNovaFolha onClose={() => setCriando(false)} onDone={(id) => { setCriando(false); carregar(); setDetalheId(id); }} />}
    </div>
  );
}

function ModalNovaFolha({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const hoje = new Date();
  const [competencia, setCompetencia] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`);
  const [descricao, setDescricao] = useState('');
  const [dataPagamento, setDataPagamento] = useState('');
  const [salvando, setSalvando] = useState(false);

  const confirmar = async () => {
    if (!/^\d{4}-\d{2}$/.test(competencia)) { toast('Competência no formato AAAA-MM.', 'error'); return; }
    setSalvando(true);
    try {
      const r = await folhaApi.criar({
        competencia,
        descricao: descricao || undefined,
        dataPagamento: dataPagamento ? new Date(dataPagamento).toISOString() : undefined,
      });
      toast('Folha criada.', 'success');
      onDone(r.data.id);
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha ao criar.', 'error');
    } finally { setSalvando(false); }
  };

  return createPortal((
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 animate-backdrop p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm bg-[#0e1729]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)] p-5 animate-modal" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-bold text-white">Nova folha</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-800 text-slate-400 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-slate-400">Competência (AAAA-MM)</span>
            <input value={competencia} onChange={e => setCompetencia(e.target.value)} placeholder="2026-07" className={inputCls} />
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Descrição</span>
            <input value={descricao} onChange={e => setDescricao(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Data de pagamento (vencimento)</span>
            <input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} className={inputCls} />
          </label>
        </div>
        <button onClick={confirmar} disabled={salvando} className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2.5 rounded-lg disabled:opacity-40">
          <Plus className="h-4 w-4" /> Criar
        </button>
      </div>
    </div>
  ), document.body);
}

function DetalheFolha({ id, podeConfigurar, podeOperar, onBack }: { id: string; podeConfigurar: boolean; podeOperar: boolean; onBack: () => void }) {
  const [folha, setFolha] = useState<Folha | null>(null);
  const [loading, setLoading] = useState(true);
  const [addItem, setAddItem] = useState(false);
  const [processando, setProcessando] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    folhaApi.get(id)
      .then((r) => setFolha(r.data))
      .catch(() => setFolha(null))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { carregar(); }, [carregar]);

  const aberta = folha?.status === 'ABERTA';

  const gerarPadrao = async () => {
    setProcessando(true);
    try {
      await folhaApi.gerarPadrao(id);
      toast('Salários dos ativos adicionados.', 'success');
      carregar();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha.', 'error');
    } finally { setProcessando(false); }
  };

  const removerItem = async (itemId: string) => {
    try {
      await folhaApi.removerItem(id, itemId);
      carregar();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha ao remover.', 'error');
    }
  };

  const fechar = async () => {
    const ok = await confirmDialog('Fechar a folha? Serão geradas contas a pagar (líquido) por funcionário.');
    if (!ok) return;
    setProcessando(true);
    try {
      await folhaApi.fechar(id, {});
      toast('Folha fechada — contas a pagar geradas.', 'success');
      carregar();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha ao fechar.', 'error');
    } finally { setProcessando(false); }
  };

  const reabrir = async () => {
    const ok = await confirmDialog('Reabrir a folha? As contas a pagar geradas serão canceladas.');
    if (!ok) return;
    setProcessando(true);
    try {
      await folhaApi.reabrir(id);
      toast('Folha reaberta — contas a pagar canceladas.', 'success');
      carregar();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha ao reabrir.', 'error');
    } finally { setProcessando(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      {loading || !folha ? (
        <div className="p-8 text-center text-slate-400 text-sm">Carregando…</div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white">Folha {folha.competencia}</h1>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${BADGE[folha.status]}`}>{folha.status}</span>
              </div>
              <p className="text-sm text-slate-400">{folha.descricao}</p>
            </div>
            <div className="flex items-center gap-2">
              {aberta && podeConfigurar && (
                <>
                  <button onClick={gerarPadrao} disabled={processando} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold px-3 py-2 rounded-lg disabled:opacity-40">
                    <Sparkles className="h-4 w-4" /> Gerar salários
                  </button>
                  <button onClick={() => setAddItem(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold px-3 py-2 rounded-lg">
                    <Plus className="h-4 w-4" /> Item
                  </button>
                </>
              )}
              {aberta && podeOperar && (
                <button onClick={fechar} disabled={processando} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold px-3 py-2 rounded-lg disabled:opacity-40">
                  <Lock className="h-4 w-4" /> Fechar folha
                </button>
              )}
              {folha.status === 'FECHADA' && podeOperar && (
                <button onClick={reabrir} disabled={processando} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold px-3 py-2 rounded-lg disabled:opacity-40">
                  <Unlock className="h-4 w-4" /> Reabrir
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#0e1729]/70 border border-white/10 rounded-2xl p-4">
              <p className="text-xs text-slate-400">Proventos</p>
              <p className="text-xl font-bold text-emerald-300 mt-1">{brl(folha.totalProventos)}</p>
            </div>
            <div className="bg-[#0e1729]/70 border border-white/10 rounded-2xl p-4">
              <p className="text-xs text-slate-400">Descontos</p>
              <p className="text-xl font-bold text-rose-300 mt-1">{brl(folha.totalDescontos)}</p>
            </div>
            <div className="bg-[#0e1729]/70 border border-white/10 rounded-2xl p-4">
              <p className="text-xs text-slate-400">Líquido a pagar</p>
              <p className="text-xl font-bold text-white mt-1">{brl(folha.totalLiquido)}</p>
            </div>
          </div>

          <div className="bg-[#0e1729]/70 border border-white/10 rounded-2xl overflow-hidden">
            {(folha.itens || []).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Nenhum item. Use "Gerar salários" ou adicione manualmente.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-white/10">
                    <th className="px-4 py-3 font-medium">Funcionário</th>
                    <th className="px-4 py-3 font-medium">Descrição</th>
                    <th className="px-4 py-3 font-medium text-center">Tipo</th>
                    <th className="px-4 py-3 font-medium text-right">Valor</th>
                    {aberta && podeConfigurar && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {folha.itens!.map((it) => (
                    <tr key={it.id} className="border-b border-white/5">
                      <td className="px-4 py-3 text-slate-100">{it.funcionarioNome || it.funcionarioId}</td>
                      <td className="px-4 py-3 text-slate-300">{it.descricao}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs ${it.tipo === 'PROVENTO' ? 'text-emerald-300' : 'text-rose-300'}`}>{it.tipo}</span>
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${it.tipo === 'PROVENTO' ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {it.tipo === 'DESCONTO' ? '- ' : ''}{brl(it.valor)}
                      </td>
                      {aberta && podeConfigurar && (
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => removerItem(it.id)} className="h-8 w-8 rounded-lg hover:bg-slate-800 text-rose-400 flex items-center justify-center" title="Remover">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {addItem && <ModalItem folhaId={id} onClose={() => setAddItem(false)} onDone={() => { setAddItem(false); carregar(); }} />}
        </>
      )}
    </div>
  );
}

function ModalItem({ folhaId, onClose, onDone }: { folhaId: string; onClose: () => void; onDone: () => void }) {
  const [funcionarios, setFuncionarios] = useState<{ id: string; nome: string }[]>([]);
  const [funcionarioId, setFuncionarioId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<TipoItem>('PROVENTO');
  const [valor, setValor] = useState('0');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    import('../../../services/api').then(({ pessoasApi }) => {
      pessoasApi.list({ status: 'ATIVO' }).then((r) => {
        setFuncionarios(r.data);
        if (r.data?.[0]) setFuncionarioId(r.data[0].id);
      }).catch(() => {});
    });
  }, []);

  const confirmar = async () => {
    if (!funcionarioId) { toast('Selecione o funcionário.', 'error'); return; }
    if (!descricao.trim()) { toast('Informe a descrição.', 'error'); return; }
    setSalvando(true);
    try {
      await folhaApi.adicionarItem(folhaId, {
        funcionarioId,
        descricao: descricao.trim(),
        tipo,
        valor: parseFloat(String(valor).replace(',', '.')) || 0,
      });
      toast('Item adicionado.', 'success');
      onDone();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha ao adicionar.', 'error');
    } finally { setSalvando(false); }
  };

  return createPortal((
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 animate-backdrop p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm bg-[#0e1729]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)] p-5 animate-modal" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-emerald-300" /><h2 className="font-bold text-white">Novo item</h2></div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-800 text-slate-400 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-slate-400">Funcionário</span>
            <select value={funcionarioId} onChange={e => setFuncionarioId(e.target.value)} className={inputCls}>
              {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Descrição</span>
            <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex.: Horas extras, INSS" className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-400">Tipo</span>
              <select value={tipo} onChange={e => setTipo(e.target.value as TipoItem)} className={inputCls}>
                <option value="PROVENTO">Provento (+)</option>
                <option value="DESCONTO">Desconto (-)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Valor</span>
              <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className={`${inputCls} text-right font-mono`} />
            </label>
          </div>
        </div>
        <button onClick={confirmar} disabled={salvando} className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2.5 rounded-lg disabled:opacity-40">
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>
    </div>
  ), document.body);
}
