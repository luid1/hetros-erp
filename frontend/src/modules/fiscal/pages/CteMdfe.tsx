import { useState, useEffect } from 'react';
import { Truck, Plus, X, FileText, CheckCircle2, Ban } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

const R$ = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

type Doc = {
  id: string; tipo: 'CTE' | 'MDFE'; numero: number; placa: string; motorista?: string;
  ufIni: string; ufFim: string; valor: number; nfes: { numero: number; valor: number }[];
  status: 'ABERTO' | 'ENCERRADO' | 'CANCELADO'; criadoEm: string;
};

const STATUS_COR: Record<string, string> = {
  ABERTO: 'bg-emerald-100 text-emerald-700',
  ENCERRADO: 'bg-gray-200 text-gray-600',
  CANCELADO: 'bg-red-100 text-red-700',
};

export default function CteMdfe() {
  const { filialAtiva } = useAuth();
  const [aba, setAba] = useState<'CTE' | 'MDFE'>('MDFE');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [modal, setModal] = useState(false);
  const [notas, setNotas] = useState<any[]>([]);
  const storeKey = `hetros_dfe_transporte_${filialAtiva?.id || 'x'}`;

  // form
  const [placa, setPlaca] = useState('');
  const [motorista, setMotorista] = useState('');
  const [ufIni, setUfIni] = useState('SP');
  const [ufFim, setUfFim] = useState('SP');
  const [valor, setValor] = useState('');
  const [selNfes, setSelNfes] = useState<Set<string>>(new Set());

  useEffect(() => {
    try { setDocs(JSON.parse(localStorage.getItem(storeKey) || '[]')); } catch { setDocs([]); }
  }, [storeKey]);
  const persist = (lista: Doc[]) => { setDocs(lista); localStorage.setItem(storeKey, JSON.stringify(lista)); };

  const abrirModal = () => {
    setPlaca(''); setMotorista(''); setUfIni('SP'); setUfFim('SP'); setValor(''); setSelNfes(new Set());
    setModal(true);
    if (filialAtiva) api.get(`/nfe/${filialAtiva.id}`, { params: { status: 'EMITIDO' } }).then(r => setNotas(r.data)).catch(() => setNotas([]));
  };

  const salvar = () => {
    if (!placa.trim()) return alert('Informe a placa do veículo.');
    const nfesSel = notas.filter(n => selNfes.has(n.id)).map(n => ({ numero: n.numero, valor: Number(n.valorNfe || 0) }));
    if (aba === 'MDFE' && nfesSel.length === 0) return alert('Vincule ao menos uma NF-e ao manifesto.');
    const proxNum = Math.max(0, ...docs.filter(d => d.tipo === aba).map(d => d.numero)) + 1;
    const novo: Doc = {
      id: crypto.randomUUID(), tipo: aba, numero: proxNum, placa: placa.toUpperCase(), motorista,
      ufIni, ufFim, valor: Number(valor) || nfesSel.reduce((s, n) => s + n.valor, 0),
      nfes: nfesSel, status: 'ABERTO', criadoEm: new Date().toISOString(),
    };
    persist([novo, ...docs]);
    setModal(false);
  };

  const mudarStatus = (id: string, status: Doc['status']) => persist(docs.map(d => d.id === id ? { ...d, status } : d));

  const lista = docs.filter(d => d.tipo === aba);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2"><Truck className="h-5 w-5 text-indigo-500" /> CT-e / MDF-e</h1>
          <p className="text-xs text-gray-400 mt-0.5">Documentos fiscais de transporte (modo teste — mock local)</p>
        </div>
        <button onClick={abrirModal} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-sm">
          <Plus className="h-4 w-4" /> {aba === 'MDFE' ? 'Simular Manifesto' : 'Novo CT-e'}
        </button>
      </div>

      {/* Abas */}
      <div className="bg-white border-b border-gray-200 px-5 flex gap-1 shrink-0">
        {(['MDFE', 'CTE'] as const).map(t => (
          <button key={t} onClick={() => setAba(t)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${aba === t ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {t === 'MDFE' ? 'MDF-e (Manifesto)' : 'CT-e (Transporte)'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {lista.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <Truck className="h-10 w-10 mx-auto mb-2 text-gray-200" />
            Nenhum {aba === 'MDFE' ? 'manifesto' : 'CT-e'} ainda. Clique em <b>{aba === 'MDFE' ? 'Simular Manifesto' : 'Novo CT-e'}</b>.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-xs text-gray-600">
                <tr>{['Nº', 'Tipo', 'Placa', 'Motorista', 'UF Início→Fim', 'NF-e', 'Valor', 'Status', 'Ações'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {lista.map(d => (
                  <tr key={d.id} className="border-t border-gray-100 hover:bg-indigo-50/40">
                    <td className="px-3 py-2 font-bold text-gray-800">{String(d.numero).padStart(6, '0')}</td>
                    <td className="px-3 py-2 text-xs">{d.tipo === 'MDFE' ? 'MDF-e' : 'CT-e'}</td>
                    <td className="px-3 py-2 font-mono">{d.placa}</td>
                    <td className="px-3 py-2">{d.motorista || '—'}</td>
                    <td className="px-3 py-2 font-mono">{d.ufIni} → {d.ufFim}</td>
                    <td className="px-3 py-2 text-xs">{d.nfes.length ? `${d.nfes.length} nota(s)` : '—'}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{R$(d.valor)}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COR[d.status]}`}>{d.status}</span></td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {d.status === 'ABERTO' && <>
                        <button onClick={() => mudarStatus(d.id, 'ENCERRADO')} className="text-gray-400 hover:text-emerald-600 p-1" title="Encerrar"><CheckCircle2 className="h-4 w-4" /></button>
                        <button onClick={() => mudarStatus(d.id, 'CANCELADO')} className="text-gray-400 hover:text-red-600 p-1" title="Cancelar"><Ban className="h-4 w-4" /></button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de emissão */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b sticky top-0 bg-white">
              <h2 className="font-bold text-gray-900">{aba === 'MDFE' ? 'Simular Manifesto (MDF-e)' : 'Novo CT-e'}</h2>
              <button onClick={() => setModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <L label="Placa do veículo"><input value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} className={inp} placeholder="ABC1D23" /></L>
                <L label="Motorista"><input value={motorista} onChange={e => setMotorista(e.target.value)} className={inp} /></L>
                <L label="UF início"><select value={ufIni} onChange={e => setUfIni(e.target.value)} className={inp}>{UFS.map(u => <option key={u}>{u}</option>)}</select></L>
                <L label="UF fim"><select value={ufFim} onChange={e => setUfFim(e.target.value)} className={inp}>{UFS.map(u => <option key={u}>{u}</option>)}</select></L>
                {aba === 'CTE' && <L label="Valor do frete (R$)" className="col-span-2"><input type="number" value={valor} onChange={e => setValor(e.target.value)} className={inp} /></L>}
              </div>

              <div>
                <h3 className="font-bold text-xs text-gray-700 mb-1 flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Vincular NF-e ao transporte</h3>
                <div className="border rounded-lg max-h-52 overflow-auto">
                  {notas.length === 0 ? <p className="text-xs text-gray-400 p-3">Nenhuma NF-e emitida para vincular.</p> :
                    notas.map(n => (
                      <label key={n.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer text-xs">
                        <input type="checkbox" checked={selNfes.has(n.id)} className="accent-indigo-600"
                          onChange={() => setSelNfes(p => { const s = new Set(p); s.has(n.id) ? s.delete(n.id) : s.add(n.id); return s; })} />
                        <span className="font-mono font-bold">{String(n.numero).padStart(6, '0')}</span>
                        <span className="flex-1 truncate">{n.cliente?.razaoSocial}</span>
                        <span className="font-mono">{R$(n.valorNfe)}</span>
                      </label>
                    ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">{selNfes.size} nota(s) selecionada(s)</p>
              </div>
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
              <button onClick={() => setModal(false)} className="px-4 py-2 rounded-lg border text-gray-600 text-sm">Cancelar</button>
              <button onClick={salvar} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm">Emitir (mock)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = 'border border-gray-300 rounded px-2 py-1.5 text-sm w-full';
function L({ label, children, className = '' }: { label: string; children: any; className?: string }) {
  return <label className={`flex flex-col gap-1 ${className}`}><span className="text-xs font-semibold text-gray-500">{label}</span>{children}</label>;
}
