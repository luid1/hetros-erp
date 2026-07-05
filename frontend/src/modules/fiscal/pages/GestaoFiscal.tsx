import { useState, useEffect, useCallback } from 'react';
import {
  FileText, RefreshCw, Plus, Send, Ban, CheckCircle2,
  FileStack, Receipt, Search, X, Trash2,
} from 'lucide-react';
import { invoicesApi } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast, confirmDialog } from '../../../components/ui/feedback';

const R$ = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const primeiroDiaAno = () => `${new Date().getFullYear()}-01-01`;
const hojeISO = () => new Date().toISOString().slice(0, 10);
const dataBR = (v: any) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');

type Status = 'DRAFT' | 'ISSUED' | 'CANCELED' | 'ERRONEOUS';
const STATUS_META: Record<Status, { label: string; cls: string }> = {
  DRAFT: { label: 'Rascunho', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  ISSUED: { label: 'Emitida', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  CANCELED: { label: 'Cancelada', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  ERRONEOUS: { label: 'Rejeitada', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
};
const TAX_TYPES = ['ICMS', 'ISS', 'PIS', 'COFINS', 'IPI'] as const;

interface Invoice {
  id: string; invoiceNumber: string; series: string; status: Status;
  orderId: string; customerId: string;
  netValue: number; taxValue: number; grossValue: number;
  issuedAt: string | null; createdAt: string;
  taxes?: { type: string; rate: number; value: number }[];
}

export default function GestaoFiscal() {
  const { pode } = useAuth();
  const podeOperar = pode('/fiscal/gestao', 'EDITAR');

  const [notas, setNotas] = useState<Invoice[]>([]);
  const [resumo, setResumo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [ini, setIni] = useState(primeiroDiaAno());
  const [fim, setFim] = useState(hojeISO());
  const [status, setStatus] = useState<Status | ''>('');
  const [busca, setBusca] = useState('');
  const [modalNova, setModalNova] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    const params: any = { dataIni: ini, dataFim: fim };
    if (status) params.status = status;
    if (busca.trim()) params.search = busca.trim();
    Promise.all([invoicesApi.list(params), invoicesApi.resumo({ dataIni: ini, dataFim: fim })])
      .then(([l, r]) => { setNotas(l.data || []); setResumo(r.data); })
      .catch(() => { setNotas([]); setResumo(null); })
      .finally(() => setLoading(false));
  }, [ini, fim, status, busca]);
  useEffect(() => { carregar(); }, [carregar]);

  const acao = async (fn: Promise<any>, ok: string) => {
    try { await fn; toast(ok, 'success'); carregar(); }
    catch (e: any) { toast(e?.response?.data?.message || 'Falha na operação.', 'error'); }
  };

  const transmitir = async (n: Invoice) => {
    if (!(await confirmDialog(`Transmitir a nota ${n.invoiceNumber} para a SEFAZ?`, { okLabel: 'Transmitir' }))) return;
    acao(invoicesApi.transmitir(n.id), 'Nota emitida com sucesso.');
  };

  const cancelar = async (n: Invoice) => {
    if (!(await confirmDialog(`Cancelar a nota ${n.invoiceNumber}? Esta ação é registrada na auditoria.`, { tone: 'danger', okLabel: 'Cancelar nota' }))) return;
    acao(invoicesApi.cancelar(n.id, 'Cancelamento solicitado pelo operador.'), 'Nota cancelada.');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      <div className="bg-slate-900/80 border-b border-slate-800 px-6 pt-4 pb-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-sky-300" /> Gestão Fiscal
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Notas fiscais · impostos em centavos, trilha de auditoria imutável</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">De
              <input type="date" value={ini} onChange={e => setIni(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-100" />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">Até
              <input type="date" value={fim} onChange={e => setFim(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-100" />
            </label>
            <button onClick={carregar} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold px-3 py-1.5 rounded-lg border border-slate-700">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </button>
            {podeOperar && (
              <button onClick={() => setModalNova(true)} className="flex items-center gap-1.5 bg-sky-500/90 hover:bg-sky-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg">
                <Plus className="h-4 w-4" /> Nova nota
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={<FileStack className="h-4 w-4" />} cor="sky" label="Notas no período" valor={loading ? null : String(resumo?.totalNotas ?? 0)} />
          <Kpi icon={<CheckCircle2 className="h-4 w-4" />} cor="emerald" label="Valor emitido" valor={loading ? null : R$(resumo?.valorEmitido)} />
          <Kpi icon={<Receipt className="h-4 w-4" />} cor="amber" label="Impostos totais" valor={loading ? null : R$(resumo?.valorImpostosTotal)} />
          <Kpi icon={<FileText className="h-4 w-4" />} cor="rose" label="Valor bruto total" valor={loading ? null : R$(resumo?.valorBrutoTotal)} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            {(['', 'DRAFT', 'ISSUED', 'CANCELED', 'ERRONEOUS'] as const).map(s => (
              <button key={s || 'all'} onClick={() => setStatus(s)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${status === s ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'}`}>
                {s === '' ? 'Todas' : STATUS_META[s].label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="h-4 w-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nº da nota…"
              className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-100 w-48" />
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-9 bg-slate-700/30 rounded animate-pulse" />)}</div>
          ) : notas.length === 0 ? (
            <p className="text-sm text-slate-500 py-16 text-center">Nenhuma nota fiscal no período.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-900/40 text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">Número / Série</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Pedido</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Líquido</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Impostos</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Bruto</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Emissão</th>
                  {podeOperar && <th className="px-4 py-2.5 text-right font-semibold">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {notas.map(n => (
                  <tr key={n.id} className="border-t border-slate-800 hover:bg-slate-700/20">
                    <td className="px-4 py-2.5 font-semibold text-slate-100">{n.invoiceNumber}<span className="text-slate-500 font-normal"> · {n.series}</span></td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_META[n.status].cls}`}>{STATUS_META[n.status].label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{n.orderId.slice(0, 8)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-300">{R$(n.netValue)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-amber-300">{R$(n.taxValue)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-100">{R$(n.grossValue)}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{dataBR(n.issuedAt)}</td>
                    {podeOperar && (
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {(n.status === 'DRAFT' || n.status === 'ERRONEOUS') && (
                            <button onClick={() => transmitir(n)} title="Transmitir SEFAZ" className="p-1.5 rounded-lg text-emerald-300 hover:bg-emerald-500/15"><Send className="h-4 w-4" /></button>
                          )}
                          {n.status === 'ISSUED' && (
                            <button onClick={() => cancelar(n)} title="Cancelar nota" className="p-1.5 rounded-lg text-rose-300 hover:bg-rose-500/15"><Ban className="h-4 w-4" /></button>
                          )}
                          {n.status === 'CANCELED' && <span className="text-slate-600 text-xs px-1">—</span>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalNova && <ModalNova onClose={() => setModalNova(false)} onOk={() => { setModalNova(false); carregar(); }} />}
    </div>
  );
}

function ModalNova({ onClose, onOk }: { onClose: () => void; onOk: () => void }) {
  const [orderId, setOrderId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [series, setSeries] = useState('1');
  const [netValue, setNetValue] = useState('');
  const [taxes, setTaxes] = useState<{ type: string; rate: string }[]>([{ type: 'ICMS', rate: '18' }]);
  const [salvando, setSalvando] = useState(false);

  const net = Number(netValue) || 0;
  const totalImpostos = taxes.reduce((acc, t) => acc + net * (Number(t.rate) || 0) / 100, 0);
  const bruto = net + totalImpostos;

  const addTax = () => setTaxes([...taxes, { type: 'PIS', rate: '' }]);
  const rmTax = (i: number) => setTaxes(taxes.filter((_, idx) => idx !== i));
  const setTax = (i: number, patch: Partial<{ type: string; rate: string }>) =>
    setTaxes(taxes.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const salvar = async () => {
    if (!orderId.trim() || !customerId.trim()) return toast('Informe o pedido e o cliente.', 'error');
    if (net <= 0) return toast('Valor líquido deve ser positivo.', 'error');
    setSalvando(true);
    try {
      await invoicesApi.gerar({
        orderId: orderId.trim(), customerId: customerId.trim(), series: series.trim() || '1',
        netValue: net,
        taxes: taxes.filter(t => Number(t.rate) > 0).map(t => ({ type: t.type, rate: Number(t.rate) })),
      });
      toast('Nota gerada (rascunho).', 'success');
      onOk();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Falha ao gerar a nota.', 'error');
    } finally { setSalvando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700">
          <h3 className="font-bold text-white flex items-center gap-2"><Plus className="h-4 w-4 text-sky-300" /> Nova nota fiscal</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Pedido de origem (orderId)"><input value={orderId} onChange={e => setOrderId(e.target.value)} className={inputCls} placeholder="UUID do pedido" /></Campo>
            <Campo label="Cliente (customerId)"><input value={customerId} onChange={e => setCustomerId(e.target.value)} className={inputCls} placeholder="UUID do cliente" /></Campo>
            <Campo label="Série"><input value={series} onChange={e => setSeries(e.target.value)} className={inputCls} /></Campo>
            <Campo label="Valor líquido (R$)"><input type="number" step="0.01" value={netValue} onChange={e => setNetValue(e.target.value)} className={inputCls} placeholder="0,00" /></Campo>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Impostos</p>
              <button onClick={addTax} className="text-xs text-sky-300 font-semibold hover:text-sky-200 flex items-center gap-1"><Plus className="h-3 w-3" /> Adicionar</button>
            </div>
            <div className="space-y-2">
              {taxes.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={t.type} onChange={e => setTax(i, { type: e.target.value })} className={`${inputCls} flex-1`}>
                    {TAX_TYPES.map(tt => <option key={tt} value={tt}>{tt}</option>)}
                  </select>
                  <div className="relative w-28">
                    <input type="number" step="0.01" value={t.rate} onChange={e => setTax(i, { rate: e.target.value })} className={`${inputCls} pr-6`} placeholder="0" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
                  </div>
                  <button onClick={() => rmTax(i)} className="p-1.5 text-slate-500 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-xl border border-slate-700/60 p-3 space-y-1 text-sm">
            <div className="flex justify-between text-slate-400"><span>Líquido</span><span className="font-mono">{R$(net)}</span></div>
            <div className="flex justify-between text-amber-300"><span>Impostos</span><span className="font-mono">{R$(totalImpostos)}</span></div>
            <div className="flex justify-between text-white font-bold border-t border-slate-700/60 pt-1 mt-1"><span>Bruto</span><span className="font-mono">{R$(bruto)}</span></div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5">
            {salvando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Gerar rascunho
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-sky-500 outline-none';
function Campo({ label, children }: { label: string; children: any }) {
  return <label className="block"><span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">{label}</span>{children}</label>;
}

const CORES: Record<string, string> = {
  amber: 'bg-amber-400/10 text-amber-300',
  sky: 'bg-sky-400/10 text-sky-300',
  rose: 'bg-rose-400/10 text-rose-300',
  emerald: 'bg-emerald-400/10 text-emerald-300',
};
function Kpi({ icon, label, valor, cor }: { icon: any; label: string; valor: string | null; cor: string }) {
  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${CORES[cor]}`}>{icon}</span>
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider truncate">{label}</p>
      </div>
      {valor === null ? <div className="h-7 w-24 bg-slate-700/40 rounded animate-pulse" /> : <p className="text-2xl font-extrabold text-white tracking-tight truncate">{valor}</p>}
    </div>
  );
}
