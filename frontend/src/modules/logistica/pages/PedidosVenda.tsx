import { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList, Plus, Search, X, Check, Trash2, Eye,
  Package, DollarSign, Truck, FileText,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

const R$ = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const REGIOES = ['GUARULHOS', 'ZONA NORTE', 'ZONA SUL', 'ZONA OESTE', 'CENTRO', 'ARUJÁ', 'ZONA LESTE', 'ABC'];
const FORMAS_PAG = ['BOLETO', 'PIX', 'DINHEIRO', 'CARTAO', 'CHEQUE', 'DEPOSITO', 'A_PRAZO'];
const STATUS_CORES: Record<string, string> = {
  RASCUNHO: 'bg-gray-200 text-gray-700',
  CONFIRMADO: 'bg-blue-100 text-blue-800',
  EM_SEPARACAO: 'bg-yellow-100 text-yellow-800',
  SEPARADO: 'bg-purple-100 text-purple-800',
  FATURADO: 'bg-green-100 text-green-800',
  ENTREGUE: 'bg-emerald-200 text-emerald-800',
  CANCELADO: 'bg-red-100 text-red-700',
};

interface Pedido {
  id: string;
  numero: number;
  tipo: string;
  status: string;
  subtotal: string;
  valorTotal: string;
  valorFrete: string;
  dataEntrega: string | null;
  observacoes: string | null;
  createdAt: string;
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null } | null;
  filialOrigem: { id: string; codigo: string; nome: string };
  _count: { itens: number };
}

export default function PedidosVenda() {
  const { filialAtiva } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [detalhe, setDetalhe] = useState<Pedido | null>(null);

  const carregarPedidos = () => {
    if (!filialAtiva) return;
    setLoading(true);
    api.get('/pedidos', { params: { filialId: filialAtiva.id, status: statusFilter || undefined, search: search || undefined } })
      .then(r => setPedidos(r.data))
      .catch(() => setPedidos([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregarPedidos(); }, [filialAtiva?.id, statusFilter]);

  const pedidosFiltrados = useMemo(() => {
    if (!search) return pedidos;
    const q = search.toLowerCase();
    return pedidos.filter(p =>
      (p.cliente?.razaoSocial || '').toLowerCase().includes(q) ||
      (p.cliente?.nomeFantasia || '').toLowerCase().includes(q) ||
      String(p.numero).includes(q)
    );
  }, [pedidos, search]);

  const handleConfirmar = async (id: string) => {
    await api.patch(`/pedidos/${id}/confirmar`);
    carregarPedidos();
  };

  const handleCancelar = async (id: string) => {
    if (!confirm('Cancelar este pedido?')) return;
    await api.patch(`/pedidos/${id}/cancelar`);
    carregarPedidos();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-sky-500" /> Pedidos de Venda
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{filialAtiva?.nome || '—'} · {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModalAberto(true)} className="btn-primary text-xs py-2">
          <Plus className="h-3.5 w-3.5" /> Novo Pedido
        </button>
      </div>

      {/* ── Filtros ── */}
      <div className="bg-gray-50 border-b border-gray-200 px-5 py-2 flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente ou nº pedido..."
            className="w-full border border-gray-300 rounded pl-8 pr-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="flex gap-1">
          {['', 'RASCUNHO', 'CONFIRMADO', 'SEPARADO', 'FATURADO', 'CANCELADO'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${statusFilter === s ? 'bg-sky-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {s || 'Todos'}
            </button>
          ))}
        </div>
        <button onClick={carregarPedidos} className="text-xs text-gray-500 hover:text-blue-600">↻ Atualizar</button>
      </div>

      {/* ── Tabela ── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-6 w-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                {['Nº', 'Cliente', 'Tipo', 'Itens', 'Subtotal', 'Frete', 'Total', 'Entrega', 'Status', 'Criado em', 'Ações'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                  <td className="px-3 py-2 font-bold text-blue-700">{p.numero}</td>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-gray-900 truncate max-w-[180px]">{p.cliente?.nomeFantasia || p.cliente?.razaoSocial || '—'}</p>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{p.tipo}</td>
                  <td className="px-3 py-2 text-center">{p._count?.itens || 0}</td>
                  <td className="px-3 py-2 text-right font-mono">{R$(Number(p.subtotal))}</td>
                  <td className="px-3 py-2 text-right font-mono text-blue-600">{R$(Number(p.valorFrete))}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold">{R$(Number(p.valorTotal))}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.dataEntrega ? new Date(p.dataEntrega).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CORES[p.status] || 'bg-gray-100'}`}>{p.status}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {p.status === 'RASCUNHO' && (
                        <>
                          <button onClick={() => handleConfirmar(p.id)} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-semibold hover:bg-blue-100">
                            <Check className="h-3 w-3 inline" /> Confirmar
                          </button>
                          <button onClick={() => handleCancelar(p.id)} className="text-[10px] text-red-600 hover:text-red-800">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {pedidosFiltrados.length === 0 && (
                <tr><td colSpan={11} className="px-6 py-12 text-center text-gray-400">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm font-medium">Nenhum pedido encontrado</p>
                  <p className="text-xs mt-1">Clique em "Novo Pedido" para lançar</p>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal Novo Pedido ── */}
      {modalAberto && (
        <ModalNovoPedido
          onClose={() => setModalAberto(false)}
          onCriado={() => { setModalAberto(false); carregarPedidos(); }}
        />
      )}
    </div>
  );
}

// ─── Modal Novo Pedido (com todos os campos) ─────
function ModalNovoPedido({ onClose, onCriado }: { onClose: () => void; onCriado: () => void }) {
  const { filialAtiva } = useAuth();
  const [clientes, setClientes]   = useState<any[]>([]);
  const [busca, setBusca]         = useState('');
  const [loadCli, setLoadCli]     = useState(false);
  const [clienteSel, setClienteSel] = useState<any>(null);

  // Campos do pedido
  const [dataEntrega, setDataEntrega]   = useState(new Date().toISOString().split('T')[0]);
  const [pesoKg, setPesoKg]             = useState('');
  const [volumes, setVolumes]           = useState('1');
  const [valorFrete, setValorFrete]     = useState('0');
  const [percentual, setPercentual]     = useState('0');
  const [formaPagamento, setFormaPag]   = useState('BOLETO');
  const [tipoFat, setTipoFat]          = useState('NFe');
  const [periodo, setPeriodo]           = useState('MANHA');
  const [regiao, setRegiao]             = useState('');
  const [obs, setObs]                   = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState('');

  useEffect(() => {
    setLoadCli(true);
    const t = setTimeout(() => {
      api.get('/clientes', { params: { search: busca || undefined } })
        .then(r => setClientes(r.data))
        .catch(() => setClientes([]))
        .finally(() => setLoadCli(false));
    }, 200);
    return () => clearTimeout(t);
  }, [busca]);

  const handleSalvar = async () => {
    if (!clienteSel) { setErro('Selecione um cliente.'); return; }
    if (!pesoKg || parseFloat(pesoKg) <= 0) { setErro('Informe o peso (Kg).'); return; }
    if (!filialAtiva) return;

    setSalvando(true); setErro('');
    try {
      await api.post('/pedidos', {
        filialOrigemId: filialAtiva.id,
        clienteId: clienteSel.id,
        tipo: 'VENDA',
        dataEntrega,
        observacoes: obs,
        tipoFrete: 'CIF',
        valorFrete: parseFloat(valorFrete) || 0,
      });
      onCriado();
    } catch (e: any) {
      setErro(e.response?.data?.message || 'Erro ao criar pedido.');
    } finally { setSalvando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl shrink-0">
          <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Plus className="h-4 w-4 text-green-600" /> Novo Pedido de Venda
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Cliente */}
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-1">Cliente *</label>
            {clienteSel ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <div>
                  <p className="font-bold text-green-900 text-sm">{clienteSel.nomeFantasia || clienteSel.razaoSocial}</p>
                  <p className="text-xs text-green-600">{clienteSel.cnpjCpf}</p>
                </div>
                <button onClick={() => setClienteSel(null)} className="text-xs text-green-700 hover:text-red-600 font-semibold">✕ Trocar</button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente..."
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-400" autoFocus />
                </div>
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                  {loadCli ? (
                    <div className="flex justify-center py-4"><div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
                  ) : clientes.slice(0, 30).map(c => (
                    <button key={c.id} onClick={() => setClienteSel(c)}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 border-b border-gray-100 text-xs flex justify-between group">
                      <span className="font-medium text-gray-900">{c.nomeFantasia || c.razaoSocial}</span>
                      <span className="text-blue-600 opacity-0 group-hover:opacity-100">Selecionar →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Linha: Data + Período + Tipo Fat */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Data Entrega *</label>
              <input type="date" value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Período</label>
              <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="MANHA">MANHÃ</option><option value="TARDE">TARDE</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Tipo Faturamento</label>
              <select value={tipoFat} onChange={e => setTipoFat(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="NFe">NF-e</option><option value="Repo.">Repo.</option><option value="NFC-e">NFC-e</option>
              </select>
            </div>
          </div>

          {/* Linha: Peso + Volumes + Região */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                <Package className="h-3 w-3 inline" /> Peso (Kg) *
              </label>
              <input type="number" step="0.1" min="0" value={pesoKg} onChange={e => setPesoKg(e.target.value)} placeholder="0,0"
                className={`w-full border rounded-lg px-3 py-2 text-sm font-bold ${!pesoKg ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Volumes</label>
              <input type="number" min="0" value={volumes} onChange={e => setVolumes(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Região</label>
              <select value={regiao} onChange={e => setRegiao(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {REGIOES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Linha: Frete + % + Forma Pagamento */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                <Truck className="h-3 w-3 inline" /> Valor Frete (R$)
              </label>
              <input type="number" step="0.01" min="0" value={valorFrete} onChange={e => setValorFrete(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                <DollarSign className="h-3 w-3 inline" /> Percentual (%)
              </label>
              <input type="number" step="0.1" min="0" value={percentual} onChange={e => setPercentual(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                <FileText className="h-3 w-3 inline" /> Forma de Pagamento
              </label>
              <select value={formaPagamento} onChange={e => setFormaPag(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {FORMAS_PAG.map(f => <option key={f} value={f}>{f === 'A_PRAZO' ? 'A Prazo' : f === 'CARTAO' ? 'Cartão' : f === 'DEPOSITO' ? 'Depósito' : f}</option>)}
              </select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Observações</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} placeholder="Notas internas, PESAR, NOIVA, etc..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
          </div>

          {erro && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSalvar} disabled={salvando || !clienteSel}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold disabled:opacity-40 flex items-center gap-1.5">
            {salvando ? 'Salvando...' : <><Plus className="h-4 w-4" /> Lançar Pedido</>}
          </button>
        </div>
      </div>
    </div>
  );
}
