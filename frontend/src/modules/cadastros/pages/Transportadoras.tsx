import { toast, confirmDialog } from '../../../components/ui/feedback';
import { useState, useEffect } from 'react';
import { Truck, Pencil, Trash2, Building2, MapPin } from 'lucide-react';
import api from '../../../services/api';
import { CadastroShell, TopBar, FilterBar, Chips, TableCard, Th, StatusBadge, Modal, Secao, Campo, Loader, Vazio, inp, UFS, R$ } from '../ui';

const TIPOS_VEICULO = ['TRUCK', 'BITREM', 'CARRETA', 'BITRUCK', 'VAN', 'VAN REFRIGERADA', 'FIORINO', 'KOMBI', 'MOTO'];
const REGIOES = ['Capital', 'Grande SP', 'Interior', 'Litoral', 'Interestadual'];

export default function Transportadoras() {
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [regiao, setRegiao] = useState('');
  const [editando, setEditando] = useState<any | null>(null);
  const [criando, setCriando] = useState(false);

  const carregar = () => {
    setLoading(true);
    api.get('/transportadoras', { params: { search: search || undefined, regiao: regiao || undefined } })
      .then(r => setLista(r.data)).catch(() => setLista([])).finally(() => setLoading(false));
  };
  useEffect(() => { const t = setTimeout(carregar, 250); return () => clearTimeout(t); }, [search, regiao]);

  const excluir = async (t: any) => {
    if (!await confirmDialog(`Excluir a transportadora "${t.razaoSocial}"?`)) return;
    try { await api.delete(`/transportadoras/${t.id}`); carregar(); }
    catch (e: any) { toast(e.response?.data?.message || 'Não foi possível excluir.'); }
  };

  return (
    <CadastroShell>
      <TopBar icon={<Truck className="h-5 w-5" />} titulo="Transportadoras" novoLabel="Novo Cadastro"
        subtitulo={`${lista.length} transportador(es) — frete de busca no campo e entregas`} onNovo={() => setCriando(true)} />
      <FilterBar busca={search} onBusca={setSearch} placeholder="Buscar por nome, CPF/CNPJ ou placa...">
        <Chips value={regiao} onChange={setRegiao} options={[{ value: '', label: 'Todas regiões' }, ...REGIOES.map(r => ({ value: r, label: r }))]} />
      </FilterBar>

      <div className="flex-1 overflow-auto p-4">
        {loading ? <Loader /> : lista.length === 0 ? <Vazio icon={<Truck className="h-10 w-10" />} texto="Nenhuma transportadora cadastrada" /> : (
          <TableCard>
            <thead><tr>{['Transportador', 'CPF/CNPJ', 'Placa', 'Veículo', 'Região', 'Frete/kg', 'Status', ''].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {lista.map(t => (
                <tr key={t.id} className="border-t border-slate-800 hover:bg-sky-500/5">
                  <td className="px-3 py-2.5"><p className="font-semibold text-slate-100 truncate max-w-[220px]">{t.razaoSocial}</p>{t.nomeFantasia && <p className="text-slate-500 text-xs">{t.nomeFantasia}</p>}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-400 text-xs">{t.cnpj}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-200">{t.placaPrincipal || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-300 text-xs">{t.tipoVeiculo || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-300">{t.regiaoAtuacao || '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-300">{t.freteBaseKg ? R$(t.freteBaseKg) : '—'}</td>
                  <td className="px-3 py-2.5"><StatusBadge ativo={t.ativo} /></td>
                  <td className="px-3 py-2.5"><div className="flex gap-1.5">
                    <button onClick={() => setEditando(t)} className="text-[11px] bg-sky-500/10 text-sky-300 border border-sky-500/30 px-2 py-1 rounded font-semibold hover:bg-sky-500/20 flex items-center gap-1"><Pencil className="h-3 w-3" /> Editar</button>
                    <button onClick={() => excluir(t)} className="text-slate-500 hover:text-rose-400 px-1"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        )}
      </div>

      {(editando || criando) && <ModalTransp item={editando} onClose={() => { setEditando(null); setCriando(false); }} onSalvo={() => { setEditando(null); setCriando(false); carregar(); }} />}
    </CadastroShell>
  );
}

function ModalTransp({ item, onClose, onSalvo }: { item: any | null; onClose: () => void; onSalvo: () => void }) {
  const ed = item?.enderecoJson || {};
  const [f, setF] = useState({
    razaoSocial: item?.razaoSocial || '', nomeFantasia: item?.nomeFantasia || '', cnpj: item?.cnpj || '',
    ie: item?.ie || '', antt: item?.antt || '', telefone: item?.telefone || '', email: item?.email || '',
    placaPrincipal: item?.placaPrincipal || '', tipoVeiculo: item?.tipoVeiculo || 'TRUCK',
    regiaoAtuacao: item?.regiaoAtuacao || 'Grande SP', freteBaseKg: String(item?.freteBaseKg ?? ''),
    ativo: item?.ativo ?? true, cidade: ed.cidade || '', uf: ed.uf || 'SP',
  });
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  const [salvando, setSalvando] = useState(false); const [erro, setErro] = useState('');

  const salvar = async () => {
    if (!f.razaoSocial.trim()) return setErro('Informe o nome do transportador.');
    if (!f.cnpj.trim()) return setErro('Informe o CPF/CNPJ.');
    setSalvando(true); setErro('');
    const payload = {
      razaoSocial: f.razaoSocial.trim(), nomeFantasia: f.nomeFantasia.trim() || null, cnpj: f.cnpj.trim(),
      ie: f.ie.trim() || null, antt: f.antt.trim() || null, telefone: f.telefone.trim() || null, email: f.email.trim() || null,
      placaPrincipal: f.placaPrincipal.trim().toUpperCase() || null, tipoVeiculo: f.tipoVeiculo,
      regiaoAtuacao: f.regiaoAtuacao, freteBaseKg: f.freteBaseKg === '' ? null : Number(f.freteBaseKg), ativo: f.ativo,
      enderecoJson: { cidade: f.cidade, uf: f.uf },
    };
    try {
      if (item) await api.put(`/transportadoras/${item.id}`, payload); else await api.post('/transportadoras', payload);
      onSalvo();
    } catch (e: any) { setErro(e.response?.data?.message || 'Erro ao salvar.'); }
    finally { setSalvando(false); }
  };

  return (
    <Modal titulo={item ? 'Editar Transportadora' : 'Nova Transportadora'} onClose={onClose} onSalvar={salvar} salvando={salvando} salvarLabel={item ? 'Salvar' : 'Cadastrar'}>
      <Secao icon={<Building2 className="h-3.5 w-3.5" />} titulo="Identificação" />
      <Campo label="Nome do Transportador / Razão Social *"><input value={f.razaoSocial} onChange={e => set('razaoSocial', e.target.value)} className={inp} /></Campo>
      <div className="grid grid-cols-3 gap-3">
        <Campo label="CPF / CNPJ *"><input value={f.cnpj} onChange={e => set('cnpj', e.target.value)} className={inp} /></Campo>
        <Campo label="Inscrição Estadual"><input value={f.ie} onChange={e => set('ie', e.target.value)} className={inp} /></Campo>
        <Campo label="Registro ANTT"><input value={f.antt} onChange={e => set('antt', e.target.value)} className={inp} /></Campo>
      </div>

      <Secao icon={<Truck className="h-3.5 w-3.5" />} titulo="Veículo & frete" />
      <div className="grid grid-cols-3 gap-3">
        <Campo label="Placa do Veículo Principal"><input value={f.placaPrincipal} onChange={e => set('placaPrincipal', e.target.value.toUpperCase())} className={inp} placeholder="ABC1D23" /></Campo>
        <Campo label="Tipo de Veículo"><select value={f.tipoVeiculo} onChange={e => set('tipoVeiculo', e.target.value)} className={inp}>{TIPOS_VEICULO.map(v => <option key={v}>{v}</option>)}</select></Campo>
        <Campo label="Frete padrão por kg (R$)"><input type="number" step="0.0001" value={f.freteBaseKg} onChange={e => set('freteBaseKg', e.target.value)} className={inp} placeholder="0,00" /></Campo>
      </div>

      <Secao icon={<MapPin className="h-3.5 w-3.5" />} titulo="Atuação & contato" />
      <div className="grid grid-cols-4 gap-3">
        <Campo label="Região de Atuação"><select value={f.regiaoAtuacao} onChange={e => set('regiaoAtuacao', e.target.value)} className={inp}>{REGIOES.map(r => <option key={r}>{r}</option>)}</select></Campo>
        <Campo label="Cidade"><input value={f.cidade} onChange={e => set('cidade', e.target.value)} className={inp} /></Campo>
        <Campo label="UF"><select value={f.uf} onChange={e => set('uf', e.target.value)} className={inp}>{UFS.map(u => <option key={u}>{u}</option>)}</select></Campo>
        <Campo label="Situação">
          <button type="button" onClick={() => set('ativo', !f.ativo)} className={`w-full rounded-lg px-3 py-2 text-sm font-bold border ${f.ativo ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-rose-500/15 text-rose-300 border-rose-500/40'}`}>{f.ativo ? 'ATIVO' : 'INATIVO'}</button>
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Telefone"><input value={f.telefone} onChange={e => set('telefone', e.target.value)} className={inp} /></Campo>
        <Campo label="E-mail"><input value={f.email} onChange={e => set('email', e.target.value)} className={inp} /></Campo>
      </div>

      {erro && <p className="text-xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg">{erro}</p>}
    </Modal>
  );
}
