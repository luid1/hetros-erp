import { useState, useEffect, useCallback } from 'react';
import { Truck, Snowflake, Pencil, Trash2 } from 'lucide-react';
import { toast, confirmDialog } from '../../../components/ui/feedback';
import api from '../../../services/api';
import { CadastroShell, TopBar, TableCard, Th, Modal, Campo, Loader, Vazio, inp } from '../../cadastros/ui';

const TIPOS = ['VAN', 'VAN REFRIGERADA', 'KOMBI', 'MINI-VAN', 'TRUCK', 'BITRUCK', 'CARRETA', 'MOTO'];
const num = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

interface Veiculo {
  id: string; placa: string; modelo?: string; marca?: string; tipo: string; uf?: string;
  propriedade: string; motoristaPadrao?: string; capacidadeKg?: number; capacidadeCaixasH?: number;
  refrigerado: boolean; ativo: boolean; anoFabricacao?: number;
}

const VAZIO: Partial<Veiculo> = { placa: '', modelo: '', tipo: 'VAN', propriedade: 'PROPRIO', uf: 'SP', refrigerado: false, ativo: true };

export default function FrotasVeiculos() {
  const [lista, setLista] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [edit, setEdit] = useState<Partial<Veiculo> | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    api.get('/veiculos', { params: busca ? { q: busca } : {} })
      .then(r => setLista(r.data)).catch(() => setLista([])).finally(() => setLoading(false));
  }, [busca]);
  useEffect(() => { const t = setTimeout(carregar, 250); return () => clearTimeout(t); }, [carregar]);

  const salvar = async () => {
    if (!edit?.placa?.trim()) { toast('Informe a placa.', 'error'); return; }
    setSalvando(true);
    try {
      if (edit.id) await api.put(`/veiculos/${edit.id}`, edit);
      else await api.post('/veiculos', edit);
      toast('Veículo salvo.', 'success'); setEdit(null); carregar();
    } catch (e: any) { toast(e.response?.data?.message || 'Erro ao salvar veículo.', 'error'); }
    finally { setSalvando(false); }
  };
  const excluir = async (v: Veiculo) => {
    if (!await confirmDialog(`Inativar o veículo ${v.placa}?`, { tone: 'danger', okLabel: 'Inativar' })) return;
    try { await api.delete(`/veiculos/${v.id}`); toast('Veículo inativado.'); carregar(); }
    catch (e: any) { toast(e.response?.data?.message || 'Erro ao inativar.', 'error'); }
  };

  return (
    <CadastroShell>
      <TopBar icon={<Truck className="h-5 w-5" />} titulo="Frotas & Veículos" subtitulo={`${lista.length} veículo(s)`}
        novoLabel="Novo Veículo" onNovo={() => setEdit({ ...VAZIO })}
        extra={<input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar placa/modelo/motorista..." className={`${inp} w-64`} />} />

      <div className="flex-1 overflow-auto p-4">
        {loading ? <Loader /> : lista.length === 0 ? (
          <Vazio icon={<Truck className="h-10 w-10" />} texto="Nenhum veículo. Clique em Novo Veículo para cadastrar a frota." />
        ) : (
          <TableCard>
            <thead><tr>{['Placa', 'Modelo', 'Tipo', 'Motorista padrão', 'Propriedade', 'Cap. (kg)', 'Cap. (cx H)', ''].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {lista.map(v => (
                <tr key={v.id} className={`border-t border-slate-800 hover:bg-sky-500/5 ${v.ativo ? '' : 'opacity-40'}`}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 font-mono font-bold text-slate-100">
                      {v.placa}
                      {v.refrigerado && <span title="Refrigerado"><Snowflake className="h-3.5 w-3.5 text-cyan-400" /></span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300">{v.modelo || '—'}</td>
                  <td className="px-3 py-2.5"><span className="text-[11px] bg-slate-700/60 text-slate-200 px-2 py-0.5 rounded-full">{v.tipo}</span></td>
                  <td className="px-3 py-2.5 text-slate-300">{v.motoristaPadrao || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.propriedade === 'TERCEIRO' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-600/40 text-slate-300'}`}>{v.propriedade}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-300">{v.capacidadeKg ? num(v.capacidadeKg) : '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-300">{v.capacidadeCaixasH ? num(v.capacidadeCaixasH) : '—'}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => setEdit(v)} className="text-slate-400 hover:text-sky-400 p-1" title="Editar"><Pencil className="h-4 w-4" /></button>
                    {v.ativo && <button onClick={() => excluir(v)} className="text-slate-400 hover:text-rose-400 p-1" title="Inativar"><Trash2 className="h-4 w-4" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        )}
      </div>

      {edit && (
        <Modal titulo={edit.id ? `Editar veículo ${edit.placa}` : 'Novo veículo'} onClose={() => setEdit(null)} onSalvar={salvar} salvando={salvando}>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Placa"><input value={edit.placa || ''} onChange={e => setEdit({ ...edit, placa: e.target.value.toUpperCase() })} className={inp} placeholder="ABC1D23" /></Campo>
            <Campo label="UF"><input value={edit.uf || ''} onChange={e => setEdit({ ...edit, uf: e.target.value.toUpperCase().slice(0, 2) })} className={inp} placeholder="SP" /></Campo>
            <Campo label="Modelo" className="col-span-2"><input value={edit.modelo || ''} onChange={e => setEdit({ ...edit, modelo: e.target.value })} className={inp} placeholder="Iveco Daily 35S14" /></Campo>
            <Campo label="Tipo">
              <select value={edit.tipo} onChange={e => setEdit({ ...edit, tipo: e.target.value })} className={inp}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select>
            </Campo>
            <Campo label="Propriedade">
              <select value={edit.propriedade} onChange={e => setEdit({ ...edit, propriedade: e.target.value })} className={inp}>
                <option value="PROPRIO">Próprio</option><option value="TERCEIRO">Terceiro</option>
              </select>
            </Campo>
            <Campo label="Motorista padrão" className="col-span-2"><input value={edit.motoristaPadrao || ''} onChange={e => setEdit({ ...edit, motoristaPadrao: e.target.value })} className={inp} placeholder="Nome do motorista" /></Campo>
            <Campo label="Capacidade (kg)"><input type="number" value={edit.capacidadeKg ?? ''} onChange={e => setEdit({ ...edit, capacidadeKg: e.target.value === '' ? undefined : Number(e.target.value) })} className={inp} placeholder="3500" /></Campo>
            <Campo label="Capacidade (caixas H)"><input type="number" value={edit.capacidadeCaixasH ?? ''} onChange={e => setEdit({ ...edit, capacidadeCaixasH: e.target.value === '' ? undefined : Number(e.target.value) })} className={inp} placeholder="180" /></Campo>
            <Campo label="Ano"><input type="number" value={edit.anoFabricacao ?? ''} onChange={e => setEdit({ ...edit, anoFabricacao: e.target.value === '' ? undefined : Number(e.target.value) })} className={inp} placeholder="2022" /></Campo>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" checked={!!edit.refrigerado} onChange={e => setEdit({ ...edit, refrigerado: e.target.checked })} className="accent-cyan-500 h-4 w-4" />
                <Snowflake className="h-4 w-4 text-cyan-400" /> Refrigerado
              </label>
            </div>
          </div>
        </Modal>
      )}
    </CadastroShell>
  );
}
