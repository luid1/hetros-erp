import { toast, confirmDialog, promptDialog } from '../../../components/ui/feedback';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ClipboardList, Plus, Search, X, Check, Trash2, Pencil,
  Package, Truck, FileText, ShoppingCart, AlertTriangle, Save, CreditCard, MapPin, Lock, Unlock,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

const R$ = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
// Senha para liberar descontos no pedido (trocar aqui conforme política da empresa)
const SENHA_DESCONTO = 'hetros2026';
const REGIOES = ['GUARULHOS', 'ZONA NORTE', 'ZONA SUL', 'ZONA OESTE', 'CENTRO', 'ARUJÁ', 'ZONA LESTE', 'ABC'];
// Unidades de separação/venda — a Separação usa isso (KG pesa na balança; CX/UN conferem)
const UNIDADES = ['KG', 'CX', 'UN'];
const FORMAS_PAG = [
  { v: 'DINHEIRO', label: 'Dinheiro', parcelavel: false },
  { v: 'PIX', label: 'PIX', parcelavel: false },
  { v: 'CARTAO_DEBITO', label: 'Cartão de Débito', parcelavel: false },
  { v: 'CARTAO_CREDITO', label: 'Cartão de Crédito', parcelavel: true },
  { v: 'BOLETO', label: 'Boleto', parcelavel: true },
  { v: 'A_PRAZO', label: 'Faturado / A Prazo', parcelavel: true },
];
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
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
  bloqueioCredito?: boolean;
  motivoBloqueio?: string | null;
  cliente: { id: string; razaoSocial: string; nomeFantasia: string | null } | null;
  _count: { itens: number };
  createdAt: string;
}

export default function PedidosVenda() {
  const { filialAtiva } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dataFiltro, setDataFiltro] = useState(hojeISO());
  const [modalAberto, setModalAberto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [aComprar, setAComprar] = useState<any[]>([]);

  const carregarPedidos = useCallback(() => {
    if (!filialAtiva) return;
    setLoading(true);
    api.get('/pedidos', { params: {
      filialId: filialAtiva.id,
      status: statusFilter || undefined,
      search: search || undefined,
      dataInicio: dataFiltro || undefined,
      dataFim: dataFiltro || undefined,
    } })
      .then(r => setPedidos(r.data))
      .catch(() => setPedidos([]))
      .finally(() => setLoading(false));
  }, [filialAtiva?.id, statusFilter, search, dataFiltro]);

  const carregarAComprar = useCallback(() => {
    if (!filialAtiva) return;
    api.get(`/estoque/${filialAtiva.id}/a-comprar`).then(r => setAComprar(r.data)).catch(() => setAComprar([]));
  }, [filialAtiva?.id]);

  useEffect(() => { carregarPedidos(); }, [filialAtiva?.id, statusFilter, dataFiltro]);
  useEffect(() => { carregarAComprar(); }, [filialAtiva?.id]);

  const pedidosFiltrados = useMemo(() => {
    if (!search) return pedidos;
    const q = search.toLowerCase();
    return pedidos.filter(p =>
      (p.cliente?.razaoSocial || '').toLowerCase().includes(q) ||
      (p.cliente?.nomeFantasia || '').toLowerCase().includes(q) ||
      String(p.numero).includes(q));
  }, [pedidos, search]);

  const handleConfirmar = async (id: string) => {
    try {
      const r = await api.patch(`/pedidos/${id}/confirmar`);
      const avisos = r.data?.avisosEstoque || [];
      if (avisos.length > 0) {
        const linhas = avisos.map((a: any) => `• ${a.descricao}: faltam ${a.faltam} (estoque ficou negativo)`).join('\n');
        toast(`✅ Pedido APROVADO.\n\n⚠️ ATENÇÃO — estoque negativo, PRECISA COMPRAR:\n${linhas}`);
      }
      carregarPedidos();
      carregarAComprar();
    } catch (e: any) {
      toast(e.response?.data?.message || 'Não foi possível aprovar o pedido.');
    }
  };

  const handleCancelar = async (id: string) => {
    if (!await confirmDialog('Cancelar este pedido?')) return;
    await api.patch(`/pedidos/${id}/cancelar`);
    carregarPedidos();
  };

  const abrirNovo = () => { setEditId(null); setModalAberto(true); };
  const abrirEdicao = (id: string) => { setEditId(id); setModalAberto(true); };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-sky-500" /> Pedidos de Venda
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {filialAtiva?.nome || '—'} · {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''}
            {dataFiltro ? ` · entrega ${new Date(dataFiltro + 'T00:00:00').toLocaleDateString('pt-BR')}` : ' · todas as datas'}
          </p>
        </div>
        <button onClick={abrirNovo} className="btn-primary text-xs py-2">
          <Plus className="h-3.5 w-3.5" /> Novo Pedido
        </button>
      </div>

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
              {s === 'CONFIRMADO' ? 'APROVADO' : (s || 'Todos')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-gray-500">Entrega:</span>
          <input type="date" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-400" />
          <button onClick={() => setDataFiltro(hojeISO())}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${dataFiltro === hojeISO() ? 'bg-sky-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            Hoje
          </button>
          <button onClick={() => setDataFiltro('')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${!dataFiltro ? 'bg-sky-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            Todos
          </button>
          <button onClick={carregarPedidos} className="text-xs text-gray-500 hover:text-blue-600 ml-1">↻ Atualizar</button>
        </div>
      </div>

      {/* ── Caixinha de aviso: produtos a comprar (estoque negativo / abaixo do mínimo) ── */}
      {aComprar.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 shrink-0">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-800">
                {aComprar.some(p => p.negativo) ? 'Estoque NEGATIVO — precisa comprar' : 'Estoque baixo — repor'}
                <span className="ml-1 font-normal text-amber-600">({aComprar.length} produto{aComprar.length !== 1 ? 's' : ''})</span>
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {aComprar.slice(0, 12).map(p => (
                  <span key={p.produtoId}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${p.negativo ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                    {p.descricao} · disp. {p.disponivel} {p.unidade}
                    {p.negativo && <strong className="ml-1">comprar {p.sugestaoCompra}</strong>}
                  </span>
                ))}
                {aComprar.length > 12 && <span className="text-[10px] text-amber-600">+{aComprar.length - 12} outros</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-6 w-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                {['Nº', 'Cliente', 'Itens', 'Subtotal', 'Frete', 'Total', 'Entrega', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                  <td className="px-3 py-2 font-bold text-blue-700">{p.numero}</td>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-gray-900 truncate max-w-[200px]">{p.cliente?.nomeFantasia || p.cliente?.razaoSocial || '—'}</p>
                    {p.bloqueioCredito && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-red-600 font-bold mt-0.5">
                        <AlertTriangle className="h-3 w-3" /> Crédito bloqueado
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">{p._count?.itens || 0}</td>
                  <td className="px-3 py-2 text-right font-mono">{R$(Number(p.subtotal))}</td>
                  <td className="px-3 py-2 text-right font-mono text-blue-600">{R$(Number(p.valorFrete))}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold">{R$(Number(p.valorTotal))}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.dataEntrega ? new Date(p.dataEntrega).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CORES[p.status] || 'bg-gray-100'}`}>
                      {p.status === 'CONFIRMADO' ? 'APROVADO' : p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      {p.status === 'RASCUNHO' && (
                        <>
                          <button onClick={() => abrirEdicao(p.id)} className="text-[10px] bg-gray-50 text-gray-700 border border-gray-200 px-2 py-0.5 rounded font-semibold hover:bg-gray-100">
                            <Pencil className="h-3 w-3 inline" /> Editar
                          </button>
                          <button onClick={() => handleConfirmar(p.id)} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-semibold hover:bg-blue-100">
                            <Check className="h-3 w-3 inline" /> Aprovar
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
                <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm font-medium">Nenhum pedido encontrado</p>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modalAberto && (
        <ModalPedido
          pedidoId={editId}
          onClose={() => setModalAberto(false)}
          onSalvo={() => { setModalAberto(false); carregarPedidos(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ITEM do grid (estado local)
// ─────────────────────────────────────────────────────────
interface ItemLocal {
  produtoId: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  precoUnitario: number;
  descontoTipo: 'VALOR' | 'PERCENT';
  descontoValor: number; // R$ ou %, conforme descontoTipo
  estoqueDisponivel: number;
}

function descontoReais(it: ItemLocal): number {
  const bruto = it.quantidade * it.precoUnitario;
  return it.descontoTipo === 'PERCENT' ? bruto * (it.descontoValor / 100) : it.descontoValor;
}
function subtotalItem(it: ItemLocal): number {
  return Math.max(0, it.quantidade * it.precoUnitario - descontoReais(it));
}

// ─────────────────────────────────────────────────────────
// MODAL Novo / Editar Pedido
// ─────────────────────────────────────────────────────────
function ModalPedido({ pedidoId, onClose, onSalvo }: { pedidoId: string | null; onClose: () => void; onSalvo: () => void }) {
  const { filialAtiva } = useAuth();
  const editando = !!pedidoId;

  // A. Cabeçalho
  const [numero, setNumero] = useState<number | null>(null);
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().slice(0, 16));
  const [dataEntrega, setDataEntrega] = useState(new Date().toISOString().split('T')[0]);
  const [periodo, setPeriodo] = useState('MANHA');
  const [regiao, setRegiao] = useState('');
  const [volumes, setVolumes] = useState('1');
  const [statusPedido, setStatusPedido] = useState('RASCUNHO');

  // Cliente
  const [clientes, setClientes] = useState<any[]>([]);
  const [buscaCli, setBuscaCli] = useState('');
  const [loadCli, setLoadCli] = useState(false);
  const [clienteSel, setClienteSel] = useState<any>(null);
  const [bloqueio, setBloqueio] = useState<string | null>(null);

  // B. Itens
  const [itens, setItens] = useState<ItemLocal[]>([]);

  // C. Pagamento / entrega
  const [formaPagamento, setFormaPag] = useState('BOLETO');
  const [numeroParcelas, setParcelas] = useState('1');
  const [tipoFrete, setTipoFrete] = useState('CIF');
  const [valorFrete, setValorFrete] = useState('0');
  const [endEntrega, setEndEntrega] = useState({ rua: '', numero: '', bairro: '', cidade: '', uf: 'SP', cep: '' });

  // D. Totais / obs
  const [descontoGeral, setDescontoGeral] = useState('0');
  const [obs, setObs] = useState('');
  const [obsNf, setObsNf] = useState('');

  // Desconto bloqueado — só libera com senha
  const [descontoLiberado, setDescontoLiberado] = useState(false);
  const liberarDesconto = async () => {
    if (descontoLiberado) { setDescontoLiberado(false); return; }
    const s = await promptDialog('Senha para liberar descontos:');
    if (s === null) return;
    if (s === SENHA_DESCONTO) setDescontoLiberado(true);
    else toast('Senha incorreta. Descontos continuam bloqueados.', 'error');
  };

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const formaSel = FORMAS_PAG.find(f => f.v === formaPagamento);

  // ── Carrega pedido para edição ──
  useEffect(() => {
    if (!pedidoId) return;
    api.get(`/pedidos/${pedidoId}`).then(r => {
      const p = r.data;
      setNumero(p.numero);
      setStatusPedido(p.status);
      if (p.dataEmissao) setDataEmissao(new Date(p.dataEmissao).toISOString().slice(0, 16));
      if (p.dataEntrega) setDataEntrega(new Date(p.dataEntrega).toISOString().split('T')[0]);
      setPeriodo(p.periodo || 'MANHA');
      setRegiao(p.regiao || '');
      setVolumes(String(p.volumes ?? 1));
      setClienteSel(p.cliente || null);
      setFormaPag(p.formaPagamento || 'BOLETO');
      setParcelas(String(p.numeroParcelas ?? 1));
      setTipoFrete(p.tipoFrete || 'CIF');
      setValorFrete(String(p.valorFrete ?? 0));
      setDescontoGeral(String(p.descontoTotal ?? 0));
      setObs(p.observacoes || '');
      setObsNf(p.observacoesNf || '');
      if (p.enderecoEntregaJson) setEndEntrega({ ...endEntrega, ...p.enderecoEntregaJson });
      setItens((p.itens || []).map((it: any) => ({
        produtoId: it.produtoId,
        codigo: it.produto?.codigo || '',
        descricao: it.descricao,
        unidade: it.unidade,
        quantidade: Number(it.quantidade),
        precoUnitario: Number(it.precoUnitario),
        descontoTipo: it.descontoTipo === 'PERCENT' ? 'PERCENT' : 'VALOR',
        descontoValor: it.descontoTipo === 'PERCENT' ? Number(it.descontoPercent) : Number(it.desconto),
        estoqueDisponivel: 9999,
      })));
    }).catch(() => setErro('Não foi possível carregar o pedido.'));
  }, [pedidoId]);

  // ── Busca de clientes ──
  useEffect(() => {
    if (clienteSel) return;
    setLoadCli(true);
    const t = setTimeout(() => {
      api.get('/clientes', { params: { search: buscaCli || undefined } })
        .then(r => setClientes(r.data)).catch(() => setClientes([])).finally(() => setLoadCli(false));
    }, 200);
    return () => clearTimeout(t);
  }, [buscaCli, clienteSel]);

  // ── Ao selecionar cliente: prefill endereço + checa crédito ──
  const selecionarCliente = (c: any) => {
    setClienteSel(c);
    if (c.enderecoJson) setEndEntrega({ ...endEntrega, ...c.enderecoJson });
    const limite = Number(c.limiteCredito || 0);
    setBloqueio(limite > 0 ? null : null); // aviso real vem do backend ao salvar
  };

  // ── Totais reativos ──
  const totalBruto = useMemo(() => itens.reduce((s, it) => s + subtotalItem(it), 0), [itens]);
  const totalLiquido = useMemo(
    () => Math.max(0, totalBruto - (parseFloat(descontoGeral) || 0) + (parseFloat(valorFrete) || 0)),
    [totalBruto, descontoGeral, valorFrete]);

  // ── Itens ──
  const addProduto = (prod: any) => {
    setItens(prev => {
      const existe = prev.find(i => i.produtoId === prod.id);
      if (existe) return prev.map(i => i.produtoId === prod.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      return [...prev, {
        produtoId: prod.id, codigo: prod.codigo, descricao: prod.descricao, unidade: prod.unidade,
        quantidade: 1, precoUnitario: prod.precoVenda, descontoTipo: 'VALOR', descontoValor: 0,
        estoqueDisponivel: prod.estoqueDisponivel,
      }];
    });
  };
  const updItem = (idx: number, patch: Partial<ItemLocal>) =>
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const rmItem = (idx: number) => setItens(prev => prev.filter((_, i) => i !== idx));

  // ── Salvar ──
  const handleSalvar = async () => {
    if (!clienteSel) { setErro('Selecione um cliente.'); return; }
    if (itens.length === 0) { setErro('Adicione pelo menos um item.'); return; }
    if (!filialAtiva) return;
    setSalvando(true); setErro('');

    const payload = {
      filialOrigemId: filialAtiva.id,
      clienteId: clienteSel.id,
      tipo: 'VENDA',
      dataEmissao,
      dataEntrega,
      periodo,
      regiao,
      volumes: parseInt(volumes) || 0,
      formaPagamento,
      condicaoPagamento: (parseInt(numeroParcelas) || 1) > 1 ? `${numeroParcelas}X` : 'A_VISTA',
      numeroParcelas: parseInt(numeroParcelas) || 1,
      tipoFrete,
      valorFrete: parseFloat(valorFrete) || 0,
      descontoTotal: parseFloat(descontoGeral) || 0,
      observacoes: obs,
      observacoesNf: obsNf,
      enderecoEntregaJson: endEntrega,
      itens: itens.map(it => ({
        produtoId: it.produtoId,
        descricao: it.descricao,
        quantidade: it.quantidade,
        unidade: it.unidade,
        precoUnitario: it.precoUnitario,
        descontoTipo: it.descontoTipo,
        descontoPercent: it.descontoTipo === 'PERCENT' ? it.descontoValor : 0,
        desconto: it.descontoTipo === 'VALOR' ? it.descontoValor : 0,
      })),
    };

    try {
      const r = editando
        ? await api.put(`/pedidos/${pedidoId}`, payload)
        : await api.post('/pedidos', payload);
      if (r.data?.bloqueioCredito) {
        toast(`⚠️ Pedido salvo, mas BLOQUEADO por crédito:\n${r.data.motivoBloqueio}\nNão poderá ser aprovado até regularizar.`);
      }
      onSalvo();
    } catch (e: any) {
      setErro(e.response?.data?.message || 'Erro ao salvar pedido.');
    } finally { setSalvando(false); }
  };

  const lbl = 'block text-[10px] font-bold text-gray-600 uppercase mb-1';
  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl shrink-0">
          <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-green-600" />
            {editando ? `Editar Pedido nº ${numero ?? ''}` : 'Novo Pedido de Venda'}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CORES[statusPedido]}`}>
              {statusPedido === 'CONFIRMADO' ? 'APROVADO' : statusPedido}
            </span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* ── A. Cabeçalho ── */}
          <section>
            <h3 className="text-[11px] font-bold text-gray-400 uppercase mb-2">A · Dados Gerais</h3>
            <div>
              <label className={lbl}>Cliente *</label>
              {clienteSel ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <div>
                    <p className="font-bold text-green-900 text-sm">{clienteSel.nomeFantasia || clienteSel.razaoSocial}</p>
                    <p className="text-xs text-green-600">{clienteSel.cnpjCpf} · Limite {R$(Number(clienteSel.limiteCredito || 0))}</p>
                  </div>
                  <button onClick={() => { setClienteSel(null); setBloqueio(null); }} className="text-xs text-green-700 hover:text-red-600 font-semibold">✕ Trocar</button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input value={buscaCli} onChange={e => setBuscaCli(e.target.value)} placeholder="Buscar por nome ou CNPJ/CPF..." className={`${inp} pl-9`} autoFocus />
                  </div>
                  <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto">
                    {loadCli ? (
                      <div className="flex justify-center py-4"><div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
                    ) : clientes.slice(0, 30).map(c => (
                      <button key={c.id} onClick={() => selecionarCliente(c)} className="w-full text-left px-3 py-1.5 hover:bg-blue-50 border-b border-gray-100 text-xs flex justify-between group">
                        <span className="font-medium text-gray-900">{c.nomeFantasia || c.razaoSocial}</span>
                        <span className="text-gray-400">{c.cnpjCpf}</span>
                      </button>
                    ))}
                    {!loadCli && clientes.length === 0 && (
                      <p className="px-3 py-3 text-xs text-gray-400 text-center">Nenhum cliente. Cadastre em <strong>Cadastros → Clientes</strong>.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-3 mt-3">
              <div>
                <label className={lbl}>Emissão</label>
                <input type="datetime-local" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Entrega *</label>
                <input type="date" value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Período</label>
                <select value={periodo} onChange={e => setPeriodo(e.target.value)} className={inp}>
                  <option value="MANHA">MANHÃ</option><option value="TARDE">TARDE</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Região</label>
                <select value={regiao} onChange={e => setRegiao(e.target.value)} className={inp}>
                  <option value="">—</option>{REGIOES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* ── B. Itens ── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase">B · Itens do Pedido</h3>
              <button onClick={liberarDesconto} type="button"
                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border ${descontoLiberado ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                {descontoLiberado ? <><Unlock className="h-3 w-3" /> Descontos liberados</> : <><Lock className="h-3 w-3" /> Liberar descontos (senha)</>}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mb-2">Preço unitário é definido pela área de custo (somente leitura).</p>
            <BuscaProduto filialId={filialAtiva?.id} onSelecionar={addProduto} />
            <div className="border border-gray-200 rounded-lg overflow-hidden mt-2">
              <table className="w-full text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    {['Cód', 'Produto', 'Qtd', 'Un', 'Preço Un.', 'Desc.', 'Subtotal', ''].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((it, idx) => {
                    const excede = it.quantidade > it.estoqueDisponivel;
                    return (
                      <tr key={it.produtoId} className="border-t border-gray-100">
                        <td className="px-2 py-1 font-mono text-gray-500">{it.codigo}</td>
                        <td className="px-2 py-1">
                          <p className="font-medium text-gray-900 truncate max-w-[200px]">{it.descricao}</p>
                          {excede && <span className="text-[10px] text-red-600 font-bold flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" /> Acima do estoque ({it.estoqueDisponivel})</span>}
                        </td>
                        <td className="px-2 py-1">
                          <input type="number" min="0" step="1" value={it.quantidade}
                            onChange={e => updItem(idx, { quantidade: parseFloat(e.target.value) || 0 })}
                            className={`w-16 border rounded px-1.5 py-1 text-right ${excede ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                        </td>
                        <td className="px-2 py-1">
                          <select value={UNIDADES.includes(it.unidade) ? it.unidade : 'KG'}
                            onChange={e => updItem(idx, { unidade: e.target.value })}
                            className="border border-gray-300 rounded px-1 py-1 text-xs bg-white font-semibold text-gray-700">
                            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          {/* Preço definido pela área de custo — somente leitura */}
                          <span className="inline-block w-20 text-right font-mono text-gray-700">{R$(it.precoUnitario)}</span>
                        </td>
                        <td className="px-2 py-1">
                          <div className="flex items-center gap-1">
                            <input type="number" min="0" step="0.01" value={it.descontoValor} disabled={!descontoLiberado}
                              onChange={e => updItem(idx, { descontoValor: parseFloat(e.target.value) || 0 })}
                              className={`w-14 border rounded px-1.5 py-1 text-right ${descontoLiberado ? 'border-gray-300' : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'}`} />
                            <button onClick={() => descontoLiberado && updItem(idx, { descontoTipo: it.descontoTipo === 'VALOR' ? 'PERCENT' : 'VALOR' })}
                              disabled={!descontoLiberado}
                              className="text-[10px] font-bold bg-gray-100 border border-gray-300 rounded px-1 py-1 w-7 hover:bg-gray-200 disabled:opacity-40">
                              {it.descontoTipo === 'VALOR' ? 'R$' : '%'}
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-1 text-right font-mono font-semibold">{R$(subtotalItem(it))}</td>
                        <td className="px-2 py-1">
                          <button onClick={() => rmItem(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </tr>
                    );
                  })}
                  {itens.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400 text-xs">
                      <Package className="h-6 w-6 mx-auto mb-1 text-gray-200" /> Busque um produto acima para adicionar
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── C. Pagamento e Entrega ── */}
          <section>
            <h3 className="text-[11px] font-bold text-gray-400 uppercase mb-2">C · Pagamento e Entrega</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}><CreditCard className="h-3 w-3 inline" /> Forma de Pagamento</label>
                <select value={formaPagamento} onChange={e => { setFormaPag(e.target.value); if (!FORMAS_PAG.find(f => f.v === e.target.value)?.parcelavel) setParcelas('1'); }} className={inp}>
                  {FORMAS_PAG.map(f => <option key={f.v} value={f.v}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Parcelas</label>
                <select value={numeroParcelas} onChange={e => setParcelas(e.target.value)} disabled={!formaSel?.parcelavel} className={`${inp} disabled:bg-gray-100 disabled:text-gray-400`}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x`}</option>)}
                </select>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
              <Truck className="h-3 w-3" /> O frete é definido na logística (Controle de Carga), não no pedido.
            </p>
            <div className="mt-3">
              <label className={lbl}><MapPin className="h-3 w-3 inline" /> Endereço de Entrega</label>
              <div className="grid grid-cols-6 gap-2">
                <input value={endEntrega.rua} onChange={e => setEndEntrega({ ...endEntrega, rua: e.target.value })} placeholder="Rua" className={`${inp} col-span-3`} />
                <input value={endEntrega.numero} onChange={e => setEndEntrega({ ...endEntrega, numero: e.target.value })} placeholder="Nº" className={inp} />
                <input value={endEntrega.bairro} onChange={e => setEndEntrega({ ...endEntrega, bairro: e.target.value })} placeholder="Bairro" className={`${inp} col-span-2`} />
                <input value={endEntrega.cidade} onChange={e => setEndEntrega({ ...endEntrega, cidade: e.target.value })} placeholder="Cidade" className={`${inp} col-span-3`} />
                <input value={endEntrega.uf} onChange={e => setEndEntrega({ ...endEntrega, uf: e.target.value })} placeholder="UF" maxLength={2} className={inp} />
                <input value={endEntrega.cep} onChange={e => setEndEntrega({ ...endEntrega, cep: e.target.value })} placeholder="CEP" className={`${inp} col-span-2`} />
              </div>
            </div>
          </section>

          {/* ── D. Observações ── */}
          <section className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Volumes</label>
              <input type="number" min="0" value={volumes} onChange={e => setVolumes(e.target.value)} className={inp} />
              <label className={`${lbl} mt-3`}><FileText className="h-3 w-3 inline" /> Observações Internas</label>
              <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} placeholder="Notas internas (PESAR, NOIVA, etc.)" className={`${inp} resize-none`} />
            </div>
            <div>
              <label className={lbl}>Observações da Nota Fiscal</label>
              <textarea value={obsNf} onChange={e => setObsNf(e.target.value)} rows={5} placeholder="Texto que sairá na NF-e" className={`${inp} resize-none`} />
            </div>
          </section>

          {erro && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
        </div>

        {/* ── Rodapé fixo: Totais ── */}
        <div className="border-t border-gray-200 bg-gray-50 rounded-b-xl shrink-0 px-5 py-3">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-center gap-5 text-xs text-gray-600">
              <div><span className="block text-[10px] uppercase text-gray-400">Total dos Itens</span><strong className="font-mono text-sm">{R$(totalBruto)}</strong></div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-gray-400 flex items-center gap-1">
                  Desc. Geral (R$) {!descontoLiberado && <Lock className="h-2.5 w-2.5" />}
                </span>
                <input type="number" min="0" step="0.01" value={descontoGeral} disabled={!descontoLiberado}
                  onChange={e => setDescontoGeral(e.target.value)}
                  className={`w-24 border rounded px-2 py-1 text-right text-sm ${descontoLiberado ? 'border-gray-300' : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'}`} />
              </div>
              <div className="border-l border-gray-300 pl-5">
                <span className="block text-[10px] uppercase text-gray-400">Total Líquido</span>
                <strong className="font-mono text-xl text-green-700">{R$(totalLiquido)}</strong>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSalvar} disabled={salvando || !clienteSel || itens.length === 0}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold disabled:opacity-40 flex items-center gap-1.5">
                {salvando ? 'Salvando...' : <><Save className="h-4 w-4" /> {editando ? 'Salvar Alterações' : 'Lançar Pedido'}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Autocomplete de produto ───
function BuscaProduto({ filialId, onSelecionar }: { filialId?: string; onSelecionar: (p: any) => void }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<any[]>([]);
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) { setRes([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      api.get('/produtos/search', { params: { q, filialId } })
        .then(r => { setRes(r.data); setAberto(true); })
        .catch(() => setRes([]))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [q, filialId]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
      <input value={q} onChange={e => setQ(e.target.value)} onFocus={() => res.length && setAberto(true)}
        placeholder="Buscar produto por nome, código ou código de barras..."
        className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-400" />
      {aberto && q && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-3"><div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
          ) : res.length === 0 ? (
            <p className="px-3 py-3 text-xs text-gray-400 text-center">Nenhum produto encontrado.</p>
          ) : res.map(p => (
            <button key={p.id} onClick={() => { onSelecionar(p); setQ(''); setAberto(false); }}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{p.descricao}</p>
                <p className="text-[10px] text-gray-400">{p.codigo} · {p.unidade} · estoque {p.estoqueDisponivel}</p>
              </div>
              <span className="text-xs font-mono text-green-700 shrink-0">{R$(p.precoVenda)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
