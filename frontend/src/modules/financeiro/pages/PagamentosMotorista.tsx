import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Truck, RefreshCw, Plus, X, Check, Ban, DownloadCloud,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { toast, confirmDialog } from '../../../components/ui/feedback';
import { pagamentosMotoristaApi } from '../../../services/api';

type StatusPag = 'PENDENTE' | 'A_PAGAR' | 'CANCELADO';
interface Pagamento {
  id: string;
  descricao: string;
  motoristaNome?: string | null;
  valor: number;
  dataReferencia: string;
  status: StatusPag;
  routeId?: string | null;
}

const brl = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (v?: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');
const inputCls = 'mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400';
const BADGE: Record<StatusPag, string> = {
  PENDENTE: 'bg-amber-500/15 text-amber-300',
  A_PAGAR: 'bg-emerald-500/15 text-emerald-300',
  CANCELADO: 'bg-slate-500/15 text-slate-400',
};

export default function PagamentosMotorista() {
  const { pode } = useAuth();
  const podeOperar = pode('/financeiro/pagamentos-motorista', 'CRIAR');

  const [lista, setLista] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<StatusPag | ''>('');
  const [sincronizando, setSincronizando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [aprovando, setAprovando] = useState<Pagamento | null>(null);

  const carregar = useCallback(() => {
    setLoading(true);
    pagamentosMotoristaApi.list(filtro ? { status: filtro } : {})
      .then((r) => setLista(r.data))
      .catch(() => setLista([]))
      .finally(() => setLoading(false));
  }, [filtro]);
  useEffect(() => { carregar(); }, [carregar]);

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const r = await pagamentosMotoristaApi.sincronizar();
      toast(`${r.data?.criados ?? 0} pagamento(s) pendente(s) criado(s).`, 'success');
      carregar();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha ao sincronizar.', 'error');
    } finally { setSincronizando(false); }
  };

  const cancelar = async (p: Pagamento) => {
    const ok = await confirmDialog(`Cancelar o pagamento "${p.descricao}"? A conta a pagar (se gerada) será cancelada.`);
    if (!ok) return;
    try {
      await pagamentosMotoristaApi.cancelar(p.id);
      toast('Pagamento cancelado.', 'success');
      carregar();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha ao cancelar.', 'error');
    }
  };

  const pendentes = lista.filter((p) => p.status === 'PENDENTE');
  const totalPendente = pendentes.reduce((acc, p) => acc + Number(p.valor || 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 border border-white/10 flex items-center justify-center">
            <Truck className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Diárias / Frete de Motorista</h1>
            <p className="text-sm text-slate-400">Rotas concluídas geram pagamentos pendentes; aprovar cria a conta a pagar.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={carregar} className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center" title="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {podeOperar && (
            <>
              <button onClick={sincronizar} disabled={sincronizando} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold px-3 py-2 rounded-lg disabled:opacity-40">
                <DownloadCloud className={`h-4 w-4 ${sincronizando ? 'animate-pulse' : ''}`} /> Sincronizar rotas
              </button>
              <button onClick={() => setCriando(true)} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold px-3 py-2 rounded-lg">
                <Plus className="h-4 w-4" /> Novo pagamento
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0e1729]/70 border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-slate-400">Pendentes</p>
          <p className="text-2xl font-bold text-amber-300 mt-1">{pendentes.length}</p>
        </div>
        <div className="bg-[#0e1729]/70 border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-slate-400">Total pendente (valor lançado)</p>
          <p className="text-2xl font-bold text-white mt-1">{brl(totalPendente)}</p>
        </div>
        <div className="bg-[#0e1729]/70 border border-white/10 rounded-2xl p-4 flex items-center">
          <select value={filtro} onChange={e => setFiltro(e.target.value as StatusPag | '')} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100">
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="A_PAGAR">A pagar</option>
            <option value="CANCELADO">Cancelados</option>
          </select>
        </div>
      </div>

      <div className="bg-[#0e1729]/70 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando…</div>
        ) : lista.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Nenhum pagamento encontrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-white/10">
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Motorista</th>
                <th className="px-4 py-3 font-medium">Referência</th>
                <th className="px-4 py-3 font-medium text-right">Valor</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-slate-100">{p.descricao}</td>
                  <td className="px-4 py-3 text-slate-300">{p.motoristaNome || '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{dataBR(p.dataReferencia)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-100">{brl(p.valor)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${BADGE[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {p.status === 'PENDENTE' && podeOperar && (
                        <>
                          <button onClick={() => setAprovando(p)} className="h-8 px-2 rounded-lg hover:bg-emerald-500/20 text-emerald-300 flex items-center gap-1 text-xs font-semibold" title="Aprovar">
                            <Check className="h-4 w-4" /> Aprovar
                          </button>
                          <button onClick={() => cancelar(p)} className="h-8 w-8 rounded-lg hover:bg-slate-800 text-rose-400 flex items-center justify-center" title="Cancelar">
                            <Ban className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {p.status === 'A_PAGAR' && podeOperar && (
                        <button onClick={() => cancelar(p)} className="h-8 w-8 rounded-lg hover:bg-slate-800 text-rose-400 flex items-center justify-center" title="Cancelar (estorna a conta)">
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {criando && <ModalNovoPagamento onClose={() => setCriando(false)} onDone={() => { setCriando(false); carregar(); }} />}
      {aprovando && <ModalAprovar pag={aprovando} onClose={() => setAprovando(null)} onDone={() => { setAprovando(null); carregar(); }} />}
    </div>
  );
}

function ModalNovoPagamento({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [descricao, setDescricao] = useState('');
  const [motoristaNome, setMotoristaNome] = useState('');
  const [valor, setValor] = useState('0');
  const [dataReferencia, setDataReferencia] = useState(new Date().toISOString().slice(0, 10));
  const [salvando, setSalvando] = useState(false);

  const confirmar = async () => {
    if (!descricao.trim()) { toast('Informe a descrição.', 'error'); return; }
    setSalvando(true);
    try {
      await pagamentosMotoristaApi.criar({
        descricao: descricao.trim(),
        motoristaNome: motoristaNome || undefined,
        valor: parseFloat(String(valor).replace(',', '.')) || 0,
        dataReferencia: new Date(dataReferencia).toISOString(),
      });
      toast('Pagamento criado.', 'success');
      onDone();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha ao criar.', 'error');
    } finally { setSalvando(false); }
  };

  return createPortal((
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 animate-backdrop p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm bg-[#0e1729]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)] p-5 animate-modal" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-bold text-white">Novo pagamento</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-800 text-slate-400 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-slate-400">Descrição</span>
            <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex.: Diária de viagem" className={inputCls} />
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Motorista</span>
            <input value={motoristaNome} onChange={e => setMotoristaNome(e.target.value)} className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-400">Valor</span>
              <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className={`${inputCls} text-right font-mono`} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Referência</span>
              <input type="date" value={dataReferencia} onChange={e => setDataReferencia(e.target.value)} className={inputCls} />
            </label>
          </div>
        </div>
        <button onClick={confirmar} disabled={salvando} className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold py-2.5 rounded-lg disabled:opacity-40">
          <Plus className="h-4 w-4" /> Criar
        </button>
      </div>
    </div>
  ), document.body);
}

function ModalAprovar({ pag, onClose, onDone }: { pag: Pagamento; onClose: () => void; onDone: () => void }) {
  const [valor, setValor] = useState(String(pag.valor || '0'));
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().slice(0, 10));
  const [salvando, setSalvando] = useState(false);

  const confirmar = async () => {
    const v = parseFloat(String(valor).replace(',', '.')) || 0;
    if (v <= 0) { toast('Informe um valor maior que zero.', 'error'); return; }
    setSalvando(true);
    try {
      await pagamentosMotoristaApi.aprovar(pag.id, {
        valor: v,
        dataVencimento: new Date(dataVencimento).toISOString(),
      });
      toast('Pagamento aprovado — conta a pagar gerada.', 'success');
      onDone();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha ao aprovar.', 'error');
    } finally { setSalvando(false); }
  };

  return createPortal((
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 animate-backdrop p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm bg-[#0e1729]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)] p-5 animate-modal" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-bold text-white">Aprovar pagamento</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-800 text-slate-400 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-slate-400 mb-3">{pag.descricao}</p>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-slate-400">Valor a pagar</span>
            <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className={`${inputCls} text-right font-mono`} />
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Vencimento</span>
            <input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} className={inputCls} />
          </label>
        </div>
        <button onClick={confirmar} disabled={salvando} className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2.5 rounded-lg disabled:opacity-40">
          <Check className="h-4 w-4" /> Aprovar e gerar conta
        </button>
      </div>
    </div>
  ), document.body);
}
