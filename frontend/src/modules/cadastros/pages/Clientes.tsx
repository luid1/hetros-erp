import { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Search, X, Pencil, Trash2, Save, Building2, MapPin, Phone } from 'lucide-react';
import api from '../../../services/api';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

interface Endereco { rua?: string; numero?: string; bairro?: string; cidade?: string; uf?: string; cep?: string; }
interface Contato { nome?: string; cargo?: string; email?: string; telefone?: string; }
interface Cliente {
  id: string;
  tipo: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpjCpf: string;
  ie: string | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  enderecoJson: Endereco | null;
  contatoJson: Contato | null;
  limiteCredito: string;
  prazoMedio: number;
  observacoes: string | null;
  ativo: boolean;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [criando, setCriando] = useState(false);

  const carregar = () => {
    setLoading(true);
    api.get('/clientes', { params: { search: search || undefined } })
      .then(r => setClientes(r.data))
      .catch(() => setClientes([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
  }, [search]);

  const handleExcluir = async (c: Cliente) => {
    if (!confirm(`Excluir o cliente "${c.nomeFantasia || c.razaoSocial}"?`)) return;
    try {
      await api.delete(`/clientes/${c.id}`);
      carregar();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Não foi possível excluir (cliente pode ter pedidos vinculados).');
    }
  };

  const total = clientes.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-500" /> Clientes
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{total} cliente{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setCriando(true)} className="btn-primary text-xs py-2">
          <Plus className="h-3.5 w-3.5" /> Novo Cliente
        </button>
      </div>

      {/* Busca */}
      <div className="bg-gray-50 border-b border-gray-200 px-5 py-2 flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por razão social, fantasia ou CNPJ/CPF..."
            className="w-full border border-gray-300 rounded pl-8 pr-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-400" />
        </div>
        <button onClick={carregar} className="text-xs text-gray-500 hover:text-blue-600">↻ Atualizar</button>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-6 w-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                {['Cliente', 'CNPJ/CPF', 'Cidade/UF', 'Telefone', 'Limite', 'Prazo', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                  <td className="px-3 py-2">
                    <p className="font-semibold text-gray-900 truncate max-w-[240px]">{c.nomeFantasia || c.razaoSocial}</p>
                    {c.nomeFantasia && <p className="text-gray-400 truncate max-w-[240px]">{c.razaoSocial}</p>}
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-600">{c.cnpjCpf}</td>
                  <td className="px-3 py-2 text-gray-600">{c.enderecoJson?.cidade ? `${c.enderecoJson.cidade}/${c.enderecoJson.uf || ''}` : '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{c.celular || c.telefone || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono">{Number(c.limiteCredito).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-3 py-2 text-center">{c.prazoMedio}d</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                      {c.ativo ? 'ATIVO' : 'INATIVO'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <button onClick={() => setEditando(c)} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-semibold hover:bg-blue-100 flex items-center gap-1">
                        <Pencil className="h-3 w-3" /> Editar
                      </button>
                      <button onClick={() => handleExcluir(c)} className="text-[10px] text-red-600 hover:text-red-800 px-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {clientes.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm font-medium">Nenhum cliente encontrado</p>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {(editando || criando) && (
        <ModalCliente
          cliente={editando}
          onClose={() => { setEditando(null); setCriando(false); }}
          onSalvo={() => { setEditando(null); setCriando(false); carregar(); }}
        />
      )}
    </div>
  );
}

// ─── Modal Criar / Editar Cliente ─────
function ModalCliente({ cliente, onClose, onSalvo }: { cliente: Cliente | null; onClose: () => void; onSalvo: () => void }) {
  const ed = cliente?.enderecoJson || {};
  const ct = cliente?.contatoJson || {};

  const [tipo, setTipo]               = useState(cliente?.tipo || 'PJ');
  const [razaoSocial, setRazao]       = useState(cliente?.razaoSocial || '');
  const [nomeFantasia, setFantasia]   = useState(cliente?.nomeFantasia || '');
  const [cnpjCpf, setCnpjCpf]         = useState(cliente?.cnpjCpf || '');
  const [ie, setIe]                   = useState(cliente?.ie || '');
  const [email, setEmail]             = useState(cliente?.email || '');
  const [telefone, setTelefone]       = useState(cliente?.telefone || '');
  const [celular, setCelular]         = useState(cliente?.celular || '');
  const [limiteCredito, setLimite]    = useState(String(cliente?.limiteCredito ?? '0'));
  const [prazoMedio, setPrazo]        = useState(String(cliente?.prazoMedio ?? '30'));
  const [ativo, setAtivo]             = useState(cliente?.ativo ?? true);
  const [observacoes, setObs]         = useState(cliente?.observacoes || '');
  // Endereço
  const [rua, setRua]       = useState(ed.rua || '');
  const [numero, setNumero] = useState(ed.numero || '');
  const [bairro, setBairro] = useState(ed.bairro || '');
  const [cidade, setCidade] = useState(ed.cidade || '');
  const [uf, setUf]         = useState(ed.uf || 'SP');
  const [cep, setCep]       = useState(ed.cep || '');
  // Contato
  const [ctNome, setCtNome]   = useState(ct.nome || '');
  const [ctCargo, setCtCargo] = useState(ct.cargo || '');
  const [ctEmail, setCtEmail] = useState(ct.email || '');
  const [ctTel, setCtTel]     = useState(ct.telefone || '');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const handleSalvar = async () => {
    if (!razaoSocial.trim()) { setErro('Informe a razão social / nome.'); return; }
    if (!cnpjCpf.trim()) { setErro('Informe o CNPJ/CPF.'); return; }
    setSalvando(true); setErro('');

    const payload = {
      tipo,
      razaoSocial: razaoSocial.trim(),
      nomeFantasia: nomeFantasia.trim() || null,
      cnpjCpf: cnpjCpf.trim(),
      ie: ie.trim() || null,
      email: email.trim() || null,
      telefone: telefone.trim() || null,
      celular: celular.trim() || null,
      limiteCredito: parseFloat(limiteCredito) || 0,
      prazoMedio: parseInt(prazoMedio) || 30,
      ativo,
      observacoes: observacoes.trim() || null,
      enderecoJson: { rua, numero, bairro, cidade, uf, cep },
      contatoJson: { nome: ctNome, cargo: ctCargo, email: ctEmail, telefone: ctTel },
    };

    try {
      if (cliente) await api.put(`/clientes/${cliente.id}`, payload);
      else await api.post('/clientes', payload);
      onSalvo();
    } catch (e: any) {
      setErro(e.response?.data?.message || 'Erro ao salvar cliente.');
    } finally { setSalvando(false); }
  };

  const lbl = 'block text-[10px] font-bold text-gray-600 uppercase mb-1';
  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl shrink-0">
          <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            {cliente ? <><Pencil className="h-4 w-4 text-blue-600" /> Editar Cliente</> : <><Plus className="h-4 w-4 text-green-600" /> Novo Cliente</>}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Identificação */}
          <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase"><Building2 className="h-3.5 w-3.5" /> Identificação</div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={lbl}>Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className={inp}>
                <option value="PJ">PJ</option><option value="PF">PF</option>
              </select>
            </div>
            <div className="col-span-3">
              <label className={lbl}>{tipo === 'PJ' ? 'CNPJ' : 'CPF'} *</label>
              <input value={cnpjCpf} onChange={e => setCnpjCpf(e.target.value)} className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>{tipo === 'PJ' ? 'Razão Social' : 'Nome'} *</label>
            <input value={razaoSocial} onChange={e => setRazao(e.target.value)} className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Nome Fantasia</label>
              <input value={nomeFantasia} onChange={e => setFantasia(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Inscrição Estadual</label>
              <input value={ie} onChange={e => setIe(e.target.value)} className={inp} />
            </div>
          </div>

          {/* Contato */}
          <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase pt-1"><Phone className="h-3.5 w-3.5" /> Contato</div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Telefone</label><input value={telefone} onChange={e => setTelefone(e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Celular</label><input value={celular} onChange={e => setCelular(e.target.value)} className={inp} /></div>
            <div><label className={lbl}>E-mail</label><input value={email} onChange={e => setEmail(e.target.value)} className={inp} /></div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2"><label className={lbl}>Contato (nome)</label><input value={ctNome} onChange={e => setCtNome(e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Cargo</label><input value={ctCargo} onChange={e => setCtCargo(e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Tel. contato</label><input value={ctTel} onChange={e => setCtTel(e.target.value)} className={inp} /></div>
          </div>

          {/* Endereço */}
          <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase pt-1"><MapPin className="h-3.5 w-3.5" /> Endereço</div>
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-4"><label className={lbl}>Rua</label><input value={rua} onChange={e => setRua(e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Nº</label><input value={numero} onChange={e => setNumero(e.target.value)} className={inp} /></div>
            <div><label className={lbl}>CEP</label><input value={cep} onChange={e => setCep(e.target.value)} className={inp} /></div>
          </div>
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-3"><label className={lbl}>Bairro</label><input value={bairro} onChange={e => setBairro(e.target.value)} className={inp} /></div>
            <div className="col-span-2"><label className={lbl}>Cidade</label><input value={cidade} onChange={e => setCidade(e.target.value)} className={inp} /></div>
            <div>
              <label className={lbl}>UF</label>
              <select value={uf} onChange={e => setUf(e.target.value)} className={inp}>
                {UFS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Comercial */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div>
              <label className={lbl}>Limite de Crédito (R$)</label>
              <input type="number" step="0.01" min="0" value={limiteCredito} onChange={e => setLimite(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Prazo Médio (dias)</label>
              <input type="number" min="0" value={prazoMedio} onChange={e => setPrazo(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Situação</label>
              <button onClick={() => setAtivo(!ativo)} type="button"
                className={`w-full rounded-lg px-3 py-2 text-sm font-bold border ${ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                {ativo ? 'ATIVO' : 'INATIVO'}
              </button>
            </div>
          </div>
          <div>
            <label className={lbl}>Observações</label>
            <textarea value={observacoes} onChange={e => setObs(e.target.value)} rows={2} className={`${inp} resize-none`} />
          </div>

          {erro && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSalvar} disabled={salvando}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold disabled:opacity-40 flex items-center gap-1.5">
            {salvando ? 'Salvando...' : <><Save className="h-4 w-4" /> {cliente ? 'Salvar Alterações' : 'Cadastrar'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
