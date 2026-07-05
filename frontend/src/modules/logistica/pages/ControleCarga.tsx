import { toast, confirmDialog } from '../../../components/ui/feedback';
import { useState, useMemo, useEffect } from 'react';
import {
  Printer, Truck, CheckSquare,
  ChevronDown, RotateCcw, Trash2,
  PlusCircle, ShieldCheck, Eraser, Clock, Check,
  X, Search, UserPlus, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

// ─── Tipos ───────────────────────────────────────
interface PedidoCarga {
  id: string;
  numero: number;
  data: string;
  liberadoEm: string | null;
  nomeFantasia: string;
  referencia: string;
  volumes: number;
  pesoKg: string;
  empresa: string;
  tipoFaturamento: string;
  autorizacao: string;
  status: string;
  statusCarga: 'IMPRESSO' | 'IMPRESSAO_PENDENTE' | 'PEDIDO_ALTERADO' | 'AURCARGA_OK' | 'FINALIZADO';
  aurCargaOk: boolean;
  regiao: string;
  cep: string;
  bairro: string;
  subRegiao: string;
  onda: number;
  periodo: 'MANHA' | 'TARDE';
  rota: string;
  recebimento: string;
  motorista: string;
  andamento: number;
  valorTotal: number;
  idMltvenda: string;
  idVenda: string;
}


const R$ = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─── Segmentos ───────────────────────────────────
const SEGMENTOS = [
  '0-Todos', '1-Escolas', '2-Restaurantes', '3-Hospitais',
  '4-Hotéis', '5-Indústria', '6-Mercados', '7-Padarias',
];

// ─── Mapeia um pedido do backend para a linha da grade de carga ──
function mapPedidoToCarga(p: any, dataCargaFallback: string): PedidoCarga {
  const faturado = p.status === 'FATURADO';
  const separado = p.status === 'SEPARADO' || p.status === 'EM_SEPARACAO';
  return {
    id: p.id,
    numero: p.numero,
    data: p.dataEntrega ? String(p.dataEntrega).split('T')[0] : dataCargaFallback,
    liberadoEm: p.createdAt ? new Date(p.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
    nomeFantasia: p.cliente?.nomeFantasia || p.cliente?.razaoSocial || '—',
    referencia: String(p.numero).padStart(5, '0'),
    volumes: p._count?.itens || 0,
    pesoKg: Number(p.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    empresa: 'Hetr.',
    tipoFaturamento: p.tipo === 'VENDA' ? 'NFe' : p.tipo,
    autorizacao: '',
    status: faturado ? 'FIN' : '',
    statusCarga: faturado ? 'AURCARGA_OK' : separado ? 'IMPRESSO' : 'IMPRESSAO_PENDENTE',
    aurCargaOk: faturado,
    regiao: '',
    cep: '',
    bairro: '',
    subRegiao: '',
    onda: 1,
    periodo: 'MANHA',
    rota: '',
    recebimento: '',
    motorista: '',
    andamento: 0,
    valorTotal: Number(p.valorTotal || 0),
    idMltvenda: '',
    idVenda: String(p.numero),
  };
}

// Status de pedido que aparecem na grade de carga (RASCUNHO/CANCELADO ficam de fora)
const STATUS_CARGA_VALIDOS = ['CONFIRMADO', 'EM_SEPARACAO', 'SEPARADO', 'FATURADO'];

// ─── Mapeia uma linha de /carga/grade para a grade (roteirizado = VERDE) ──
function mapGradeToCarga(g: any): PedidoCarga {
  const faturado = g.statusPedido === 'FATURADO';
  return {
    id: g.id,
    numero: g.numero,
    data: g.data,
    liberadoEm: '',
    nomeFantasia: g.nomeFantasia,
    referencia: g.referencia,
    volumes: g.volumes,
    pesoKg: Number(g.pesoKg || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    empresa: g.empresa || 'Hetr.',
    tipoFaturamento: g.tipoFaturamento,
    autorizacao: '',
    status: faturado ? 'FIN' : g.roteirizado ? 'ROTA' : '',
    // roteirizado OU faturado => verde (AURCARGA_OK); senão pendente (vermelho)
    statusCarga: (g.roteirizado || faturado) ? 'AURCARGA_OK' : 'IMPRESSAO_PENDENTE',
    aurCargaOk: !!g.roteirizado || faturado,
    regiao: g.regiao || '',
    cep: g.cep || '',
    bairro: g.bairro || '',
    subRegiao: g.subRegiao || '',
    onda: g.onda || 1,
    periodo: g.periodo === 'TARDE' ? 'TARDE' : 'MANHA',
    rota: g.rota || '',
    recebimento: '',
    motorista: g.motorista || '',
    andamento: g.andamento || 0,
    valorTotal: Number(g.valorTotal || 0),
    idMltvenda: '',
    idVenda: String(g.numero),
  };
}

// ─── (array de pedidos mock removido — a grade agora vem da API) ──
const _MOCK_PEDIDOS_UNUSED: PedidoCarga[] = [
  { id:'1',  numero:29, data:'2026-06-26', liberadoEm:'10:25', nomeFantasia:'ALMENUTRICAO',         referencia:'REPO', volumes:30,  pesoKg:'35,6',  empresa:'Hetr.', tipoFaturamento:'NFe e...', autorizacao:'', status:'', statusCarga:'IMPRESSAO_PENDENTE', aurCargaOk:false, regiao:'GUARULHOS',   cep:'07021050', bairro:'VILA PEDR.',  subRegiao:'SANTA RIT.',  onda:1, periodo:'MANHA', rota:'',       recebimento:'06:00-0.', motorista:'CLIENTES D.', andamento:0, valorTotal:1200, idMltvenda:'', idVenda:'29' },
  { id:'2',  numero:29, data:'2026-06-26', liberadoEm:'12:03', nomeFantasia:'BOTECO...',             referencia:'REPO', volumes:1,   pesoKg:'1,00',  empresa:'Hetr.', tipoFaturamento:'Repo.',    autorizacao:'', status:'', statusCarga:'IMPRESSAO_PENDENTE', aurCargaOk:false, regiao:'ZONA OESTE',  cep:'05417001', bairro:'PINHEIROS',   subRegiao:'PINHEIROS',   onda:1, periodo:'MANHA', rota:'',       recebimento:'07:30-1.', motorista:'REDE TUY',    andamento:1, valorTotal:450,  idMltvenda:'', idVenda:'29' },
  { id:'3',  numero:29, data:'2026-06-26', liberadoEm:'12:04', nomeFantasia:'BOTECO...',             referencia:'20856',volumes:22,  pesoKg:'21,7',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'IMPRESSAO_PENDENTE', aurCargaOk:false, regiao:'ZONA OESTE',  cep:'05417001', bairro:'PINHEIROS',   subRegiao:'PINHEIROS',   onda:1, periodo:'MANHA', rota:'',       recebimento:'07:30-1.', motorista:'REDE TUY',    andamento:1, valorTotal:2100, idMltvenda:'', idVenda:'29' },
  { id:'4',  numero:29, data:'2026-06-26', liberadoEm:'08:11', nomeFantasia:'CEI BURITI',            referencia:'00472',volumes:472, pesoKg:'137.',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'IMPRESSAO_PENDENTE', aurCargaOk:false, regiao:'ZONA NORTE',  cep:'02849020', bairro:'JARDIM GU.',  subRegiao:'BRASILAND.',  onda:1, periodo:'MANHA', rota:'',       recebimento:'07:00-1.', motorista:'ROJO - DOL.', andamento:1, valorTotal:4500, idMltvenda:'', idVenda:'29' },
  { id:'5',  numero:29, data:'2026-06-26', liberadoEm:'08:11', nomeFantasia:'CEI BURITI',            referencia:'00472',volumes:472, pesoKg:'137.',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'IMPRESSAO_PENDENTE', aurCargaOk:false, regiao:'ZONA NORTE',  cep:'02849030', bairro:'JARDIM GU.',  subRegiao:'BRASILAND.',  onda:1, periodo:'MANHA', rota:'',       recebimento:'07:00-1.', motorista:'ROJO - DOL.', andamento:1, valorTotal:3200, idMltvenda:'', idVenda:'29' },
  { id:'6',  numero:29, data:'2026-06-26', liberadoEm:'10:47', nomeFantasia:'CICLO ROTA...',         referencia:'00083',volumes:83,  pesoKg:'77,0',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'IMPRESSO',           aurCargaOk:false, regiao:'ZONA OESTE',  cep:'05083010', bairro:'ALTO DA L.',  subRegiao:'LAPA, PER.',  onda:1, periodo:'MANHA', rota:'',       recebimento:'07:00-1.', motorista:'ROJO - DOL.', andamento:1, valorTotal:980,  idMltvenda:'', idVenda:'29' },
  { id:'7',  numero:29, data:'2026-06-26', liberadoEm:'10:47', nomeFantasia:'CICLO ROTA...',         referencia:'00083',volumes:83,  pesoKg:'77,0',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'IMPRESSO',           aurCargaOk:false, regiao:'ZONA OESTE',  cep:'05083010', bairro:'ALTO DA L.',  subRegiao:'LAPA, PER.',  onda:1, periodo:'MANHA', rota:'',       recebimento:'07:00-1.', motorista:'ROJO - DOL.', andamento:1, valorTotal:1100, idMltvenda:'', idVenda:'29' },
  { id:'8',  numero:29, data:'2026-06-26', liberadoEm:'13:11', nomeFantasia:'COLONIAL...',           referencia:'00062',volumes:62,  pesoKg:'50,7',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'IMPRESSO',           aurCargaOk:false, regiao:'ZONA SUL',    cep:'04608002', bairro:'CAMPO BE.',   subRegiao:'BROOKLIN',    onda:1, periodo:'MANHA', rota:'',       recebimento:'05:40-0.', motorista:'CLIENTES D.', andamento:0, valorTotal:760,  idMltvenda:'', idVenda:'29' },
  { id:'9',  numero:29, data:'2026-06-26', liberadoEm:'07:25', nomeFantasia:'COMUNID...',            referencia:'00087',volumes:87,  pesoKg:'97,3',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'IMPRESSO',           aurCargaOk:false, regiao:'ZONA SUL',    cep:'04545001', bairro:'VILA OLIM.',  subRegiao:'BROOKLIN',    onda:1, periodo:'MANHA', rota:'',       recebimento:'07:00-0.', motorista:'CLIENTES D.', andamento:0, valorTotal:1340, idMltvenda:'', idVenda:'29' },
  { id:'10', numero:26, data:'2026-06-26', liberadoEm:'14:45', nomeFantasia:'CONSUM... ROSA...',     referencia:'',     volumes:1,   pesoKg:'14,0',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'FIN', statusCarga:'AURCARGA_OK',     aurCargaOk:true,  regiao:'ZONA OESTE',  cep:'05316900', bairro:'VILA LEOP.',  subRegiao:'VILA LEOP.',  onda:1, periodo:'TARDE', rota:'',       recebimento:'10:00-.',  motorista:'CLIENTES D.', andamento:0, valorTotal:320,  idMltvenda:'', idVenda:'26' },
  { id:'11', numero:29, data:'2026-06-26', liberadoEm:'10:39', nomeFantasia:'CRFF PIZZ...',          referencia:'00090',volumes:90,  pesoKg:'82,3',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'IMPRESSAO_PENDENTE', aurCargaOk:false, regiao:'GUARULHOS',   cep:'07190100', bairro:'AEROPORTO',   subRegiao:'HELIO SMID.', onda:1, periodo:'MANHA', rota:'',       recebimento:'07:30-1.', motorista:'CRFF PIZZA.', andamento:0, valorTotal:2800, idMltvenda:'', idVenda:'29' },
  { id:'12', numero:29, data:'2026-06-26', liberadoEm:'15:37', nomeFantasia:'DOLCISSI...',           referencia:'00152',volumes:152, pesoKg:'160.',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'IMPRESSO',           aurCargaOk:false, regiao:'ZONA SUL',    cep:'04039034', bairro:'VILA CLEM.',  subRegiao:'VILA MARIA',  onda:1, periodo:'TARDE', rota:'',       recebimento:'07:00-1.', motorista:'ROJO - DOL.', andamento:1, valorTotal:3600, idMltvenda:'', idVenda:'29' },
  { id:'13', numero:29, data:'2026-06-26', liberadoEm:'07:46', nomeFantasia:'ESCOLA E... REPO...',   referencia:'00001',volumes:1,   pesoKg:'1,70',  empresa:'Hetr.', tipoFaturamento:'Repo.',    autorizacao:'', status:'', statusCarga:'IMPRESSO',           aurCargaOk:false, regiao:'ZONA SUL',    cep:'05097000', bairro:'BELA ALIA.',  subRegiao:'',            onda:1, periodo:'MANHA', rota:'',       recebimento:'07:00-1.', motorista:'ROJO - DOL.', andamento:1, valorTotal:120,  idMltvenda:'', idVenda:'29' },
  { id:'14', numero:29, data:'2026-06-26', liberadoEm:'14:45', nomeFantasia:'ESCOLA E...',           referencia:'00064',volumes:64,  pesoKg:'39,1',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'IMPRESSO',           aurCargaOk:false, regiao:'ZONA OESTE',  cep:'05097000', bairro:'BELA ALIA.',  subRegiao:'LAPA, PER.',  onda:1, periodo:'TARDE', rota:'',       recebimento:'07:00-1.', motorista:'ROJO - DOL.', andamento:1, valorTotal:890,  idMltvenda:'', idVenda:'29' },
  { id:'15', numero:29, data:'2026-06-26', liberadoEm:'08:11', nomeFantasia:'ESCOLA R... REPO...',   referencia:'00140',volumes:140, pesoKg:'60,0',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'PEDIDO_ALTERADO',    aurCargaOk:false, regiao:'ZONA OESTE',  cep:'05089010', bairro:'VILA LEOP.',  subRegiao:'LAPA, PER.',  onda:1, periodo:'MANHA', rota:'',       recebimento:'07:00-1.', motorista:'ROJO - DOL.', andamento:1, valorTotal:1560, idMltvenda:'', idVenda:'29' },
  { id:'16', numero:29, data:'2026-06-26', liberadoEm:'14:50', nomeFantasia:'ESCOLA R...',           referencia:'00116',volumes:116, pesoKg:'51,1',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'PEDIDO_ALTERADO',    aurCargaOk:false, regiao:'ZONA OESTE',  cep:'05085000', bairro:'BELA ALIA.',  subRegiao:'LAPA, PER.',  onda:1, periodo:'TARDE', rota:'',       recebimento:'07:00-1.', motorista:'ROJO - DOL.', andamento:1, valorTotal:1230, idMltvenda:'', idVenda:'29' },
  { id:'17', numero:29, data:'2026-06-26', liberadoEm:'14:14', nomeFantasia:'ESCOLA S...',           referencia:'00049',volumes:49,  pesoKg:'47,2',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'IMPRESSO',           aurCargaOk:false, regiao:'ZONA OESTE',  cep:'05352020', bairro:'CIDADE SA.',  subRegiao:'VILA LEOP',   onda:1, periodo:'TARDE', rota:'',       recebimento:'',         motorista:'ROJO - DOL.', andamento:0, valorTotal:670,  idMltvenda:'', idVenda:'29' },
  { id:'18', numero:29, data:'2026-06-26', liberadoEm:'09:28', nomeFantasia:'ESPORTE...',            referencia:'00168',volumes:168, pesoKg:'199.',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'IMPRESSO',           aurCargaOk:false, regiao:'CENTRO',      cep:'01455902', bairro:'JARDIM EU.',  subRegiao:'CERQUEIR.',   onda:1, periodo:'MANHA', rota:'',       recebimento:'07:00-0.', motorista:'ESPORTE C.',  andamento:0, valorTotal:4200, idMltvenda:'', idVenda:'29' },
  { id:'19', numero:29, data:'2026-06-26', liberadoEm:'13:47', nomeFantasia:'FATTORIA...',           referencia:'00039',volumes:39,  pesoKg:'39,8',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'IMPRESSO',           aurCargaOk:false, regiao:'CENTRO',      cep:'01413000', bairro:'CERQUEIR.',   subRegiao:'CERQUEIR.',   onda:1, periodo:'TARDE', rota:'',       recebimento:'07:00-0.', motorista:'RASCAL',      andamento:0, valorTotal:870,  idMltvenda:'', idVenda:'29' },
  { id:'20', numero:29, data:'2026-06-26', liberadoEm:'11:34', nomeFantasia:'GRAND H...',            referencia:'00075',volumes:75,  pesoKg:'75,0',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'IMPRESSO',           aurCargaOk:false, regiao:'ZONA SUL',    cep:'04583110', bairro:'VILA CORD.',  subRegiao:'BROOKLIN',    onda:1, periodo:'MANHA', rota:'',       recebimento:'07:00-0.', motorista:'GRAND HYA.',  andamento:0, valorTotal:2100, idMltvenda:'', idVenda:'29' },
  { id:'21', numero:29, data:'2026-06-26', liberadoEm:'07:46', nomeFantasia:'HOSPITAL...',           referencia:'00539',volumes:539, pesoKg:'205.',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'IMPRESSO',           aurCargaOk:false, regiao:'ARUJÁ',       cep:'07402000', bairro:'CENTRO',      subRegiao:'DIOMAR FE.',  onda:1, periodo:'MANHA', rota:'',       recebimento:'',         motorista:'TODAS COZ.',  andamento:0, valorTotal:8900, idMltvenda:'', idVenda:'29' },
  { id:'22', numero:29, data:'2026-06-26', liberadoEm:'07:46', nomeFantasia:'HOSPITAL...',           referencia:'00539',volumes:539, pesoKg:'205.',  empresa:'Hetr.', tipoFaturamento:'NFe',      autorizacao:'', status:'', statusCarga:'IMPRESSO',           aurCargaOk:false, regiao:'ARUJÁ',       cep:'07402015', bairro:'CENTRO',      subRegiao:'MARIA DE L.', onda:1, periodo:'MANHA', rota:'06:30-0.', recebimento:'',       motorista:'HOSPITAL I.', andamento:0, valorTotal:7800, idMltvenda:'', idVenda:'29' },
];

// ─── Cor da linha conforme statusCarga ───────────
function rowBg(p: PedidoCarga, sel: boolean) {
  if (sel) return 'bg-blue-700 text-white';
  switch (p.statusCarga) {
    case 'IMPRESSAO_PENDENTE': return 'bg-red-600 text-white';
    case 'PEDIDO_ALTERADO':    return 'bg-gray-900 text-white';
    case 'AURCARGA_OK':        return 'bg-green-600 text-white';
    case 'FINALIZADO':         return 'bg-blue-900 text-white';
    default:                   return 'bg-white text-gray-900 hover:bg-gray-50';
  }
}

// ─── Componente ──────────────────────────────────
export default function ControleCarga() {
  const { filialAtiva } = useAuth();
  const hojeStr = new Date().toISOString().split('T')[0];

  // ── Estado dos filtros ──
  const [segmento, setSegmento]                     = useState('0-Todos');
  const [dataCarga, setDataCarga]                   = useState(hojeStr);
  const [dataEntrega, setDataEntrega]               = useState(hojeStr);
  const [mostrarFinalizados, setMostrarFinalizados] = useState(true);
  const [mostrarGrade, setMostrarGrade]             = useState(true);
  const [rotaPendente, setRotaPendente]             = useState(true);
  const [somenteEscolas, setSomenteEscolas]         = useState(false);
  const [permitirDesconto, setPermitirDesconto]     = useState(false);

  // ── Estado da grade ──
  const [pedidos, setPedidos]         = useState<PedidoCarga[]>([]);
  const [carregando, setCarregando]   = useState(false);
  const [rotasProgramadas, setRotasProgramadas] = useState<any[]>([]); // romaneios reais (Entregas Programadas)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [abaRota, setAbaRota]         = useState<'rotas' | 'horario'>('rotas');
  const [rotaExpandida, setRotaExpandida] = useState<string | null>(null);
  const [buscaRota, setBuscaRota]     = useState('');

  // ── Carrega a grade do dia (via carga/grade — sabe quem já está roteirizado) ──
  const carregar = () => {
    if (!filialAtiva) return;
    setCarregando(true);
    api.get(`/carga/${filialAtiva.id}/grade`, { params: { data: dataCarga } })
      .then(r => setPedidos((r.data as any[]).map(mapGradeToCarga)))
      .catch(() => setPedidos([]))
      .finally(() => setCarregando(false));
    carregarRotas();
    setSelecionados(new Set());
  };

  // ── Carrega as rotas (romaneios) já montadas para o dia ──
  const carregarRotas = () => {
    if (!filialAtiva) return;
    api.get(`/carga/${filialAtiva.id}/rotas`, { params: { data: dataCarga } })
      .then(r => setRotasProgramadas(r.data))
      .catch(() => setRotasProgramadas([]));
  };

  useEffect(() => { carregar(); }, [filialAtiva?.id, dataCarga]);

  // ── Filtrar pedidos conforme checkboxes ──
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      if (somenteEscolas && !p.nomeFantasia.toUpperCase().includes('ESCOLA')) return false;
      if (!mostrarFinalizados && p.statusCarga === 'FINALIZADO') return false;
      if (segmento !== '0-Todos') {
        const seg = segmento.split('-')[1].toUpperCase();
        if (seg === 'ESCOLAS' && !p.nomeFantasia.toUpperCase().includes('ESCOLA')) return false;
        if (seg === 'RESTAURANTES' && !['FATTORIA', 'RASCAL', 'BOTECO'].some(r => p.nomeFantasia.toUpperCase().includes(r))) return false;
        if (seg === 'HOSPITAIS' && !p.nomeFantasia.toUpperCase().includes('HOSPITAL')) return false;
      }
      return true;
    });
  }, [pedidos, somenteEscolas, mostrarFinalizados, segmento]);

  // ── Filtrar rotas programadas por busca ──
  const rotasFiltradas = useMemo(() => {
    if (!buscaRota) return rotasProgramadas;
    const q = buscaRota.toLowerCase();
    return rotasProgramadas.filter(r => (r.motorista || '').toLowerCase().includes(q) || String(r.numero).includes(q));
  }, [rotasProgramadas, buscaRota]);

  // ── Seleção de linhas ──
  const toggleSelect = (id: string) => {
    setSelecionados(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    setSelecionados(selecionados.size === pedidosFiltrados.length ? new Set() : new Set(pedidosFiltrados.map(p => p.id)));
  };

  // ── Pedidos selecionados para painel Entregas ──
  const entregasSelecionadas = useMemo(() => {
    return pedidosFiltrados.filter(p => selecionados.has(p.id));
  }, [pedidosFiltrados, selecionados]);

  // ── Ações ──
  const handleAutorizar = () => {
    setPedidos(prev => prev.map(p =>
      selecionados.has(p.id) ? { ...p, aurCargaOk: true, statusCarga: 'AURCARGA_OK' as const } : p
    ));
    setSelecionados(new Set());
  };

  const handleRemoverLinha = () => {
    setPedidos(prev => prev.filter(p => !selecionados.has(p.id)));
    setSelecionados(new Set());
  };

  const handleLimpar = () => {
    setPedidos([]);
    setSelecionados(new Set());
  };

  const handleRotear = () => {
    setModalNovaEntrega(true);
  };

  // ── Imprime a Capa de Rota de um romaneio ──
  const imprimirCapaRota = async (romaneioId: string) => {
    try {
      const { data: c } = await api.get(`/carga/romaneio/${romaneioId}/capa`);
      const dt = (d: any) => d ? new Date(d).toLocaleDateString('pt-BR') : '';
      const linhas = c.unidades.map((u: any) => `
        <tr>
          <td>${u.unidade}</td><td></td><td></td>
          <td style="text-align:center">${u.endereco}</td>
          <td style="text-align:center">${u.bairro}</td>
          <td></td><td></td><td></td><td></td><td></td>
        </tr>`).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Capa de Rota ${c.idEntrega}</title>
<style>
body{font-family:Arial;font-size:11px;margin:14px;color:#000}
.box{border:2px solid #000}
.hd{display:flex;align-items:center;border-bottom:2px solid #000;padding:6px}
.hd h1{flex:1;text-align:center;font-size:22px;margin:0;letter-spacing:1px}
.logo{font-weight:bold;color:#2e7d32;font-size:18px}
.info{padding:4px 8px;border-bottom:1px solid #000;font-size:11px}
.info div{display:inline-block;margin-right:24px}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #000;padding:2px 4px;font-size:10px}
th{background:#eee;text-align:center}
.foot{display:flex;justify-content:space-between;font-weight:bold;padding:4px 8px;border-top:1px solid #000}
@media print{button{display:none}}
</style></head><body>
<button onclick="window.print()" style="margin-bottom:8px;padding:6px 12px">🖨️ Imprimir</button>
<div class="box">
  <div class="hd"><span class="logo" style="display:inline-flex;align-items:center;gap:6px"><img src="/logo-hetros-icone.png" style="height:22px;width:22px;object-fit:contain" />HETROS</span><h1>CAPA DE ROTA</h1><span>Pág. 1</span></div>
  <div class="info">
    <div><b>Id Entrega:</b> ${c.idEntrega}</div><div><b>CD:</b> ${c.cd}</div>
    <div><b>Veículo:</b> ${c.placaVeiculo || ''} ${c.modeloVeiculo ? '- ' + c.modeloVeiculo : ''}</div>
    <div><b>Dt.Movimento:</b> ${dt(c.dataMovimento)}</div>
    <div><b>Fone Condutor:</b> ${c.foneCondutor || ''}</div>
  </div>
  <div class="info">
    <div><b>Condutor:</b> ${c.codigoCondutor ? c.codigoCondutor + ' - ' : ''}${c.motorista || ''}</div>
    <div><b>Dt.Entrega:</b> ${dt(c.dataEntrega)}</div>
    <div><b>Rota:</b> ${c.regiaoRota || ''}</div>
  </div>
  <table>
    <thead><tr>
      <th>UNIDADE</th><th>Hora De</th><th>Hora Até</th><th>ENDEREÇO</th><th>BAIRRO</th>
      <th>ROTA</th><th>Hora Entrada</th><th>Hora Saída</th><th>Caixas Saída</th><th>Caixas Retorno</th>
    </tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="foot"><span>QTDE DE ENTREGAS: ${c.qtdEntregas}</span><span>Autorização de Carga: ${c.autorizacaoCarga || ''}</span></div>
</div>
</body></html>`;
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    } catch {
      toast('Não foi possível gerar a Capa de Rota.');
    }
  };

  // ── Imprime o Espelho (picking) de um pedido ──
  const imprimirEspelho = async (pedidoId: string) => {
    try {
      const { data: p } = await api.get(`/pedidos/${pedidoId}`);
      const end: any = p.cliente?.enderecoJson || {};
      const itensHtml = (p.itens || []).map((it: any) => `
        <tr>
          <td>${it.produto?.codigo || ''}</td>
          <td>${it.descricao}</td>
          <td style="text-align:right">${Number(it.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</td>
          <td>${it.unidade}</td>
          <td></td>
        </tr>`).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Espelho Pedido ${p.numero}</title>
<style>
body{font-family:Arial;font-size:12px;margin:18px;color:#000}
.center{text-align:center}
h2{margin:2px 0}
table{width:100%;border-collapse:collapse;margin-top:10px}
th,td{padding:3px 6px;font-size:11px;border-bottom:1px solid #ccc;text-align:left}
th{border-bottom:2px solid #000}
.cab{border-bottom:2px solid #000;padding-bottom:6px}
.linha{display:flex;justify-content:space-between;border-top:2px solid #000;border-bottom:1px solid #000;padding:3px 0;font-weight:bold;margin-top:6px}
@media print{button{display:none}}
</style></head><body>
<button onclick="window.print()" style="margin-bottom:8px;padding:6px 12px">🖨️ Imprimir</button>
<div class="cab center">
  <div class="logo" style="font-weight:bold;font-size:16px;display:flex;align-items:center;justify-content:center;gap:8px"><img src="/logo-hetros.png" style="height:34px;object-fit:contain" /></div>
  <div>AV DOUTOR GASTAO VIDIGAL, SN - PAV HFC BOX 19 · 05316-900 - VILA LEOPOLDINA · SAO PAULO-SP</div>
</div>
<h2 class="center">${(p.cliente?.nomeFantasia || p.cliente?.razaoSocial || '').toUpperCase()}</h2>
<p class="center">${[end.rua, end.numero].filter(Boolean).join(', ')} · ${end.bairro || ''} · ${end.cidade || ''}-${end.uf || ''}</p>
<div class="linha">
  <span>Pedido: ${String(p.numero).padStart(8, '0')}</span>
  <span>Venda: ${p.dataEntrega ? new Date(p.dataEntrega).toLocaleDateString('pt-BR') : ''}</span>
  <span>Itens: ${String((p.itens || []).length).padStart(3, '0')}</span>
</div>
<table>
  <thead><tr><th>Produto</th><th>Descrição</th><th>Qtde</th><th>UN</th><th>Obs</th></tr></thead>
  <tbody>${itensHtml}</tbody>
</table>
</body></html>`;
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    } catch {
      toast('Não foi possível gerar o Espelho do pedido.');
    }
  };

  const handleImprimirSel = () => {
    const ids = Array.from(selecionados);
    const sel = pedidos.filter(p => ids.includes(p.id));
    const html = `<!DOCTYPE html><html><head><title>Bilhetes de Entrega</title>
<style>body{font-family:Arial;font-size:11px;} table{width:100%;border-collapse:collapse;margin:10px 0;} th,td{border:1px solid #999;padding:3px 5px;text-align:left;} th{background:#eee;} @media print{button{display:none;}}</style></head><body>
<h2>Bilhetes de Entrega — ${dataCarga}</h2>
<p>${filialAtiva?.nome || 'Hetros'} — ${sel.length} pedido(s)</p>
<table><thead><tr><th>Nome</th><th>Volumes</th><th>Peso</th><th>Região</th><th>Bairro</th><th>Motorista</th><th>Período</th></tr></thead><tbody>
${sel.map(p => `<tr><td>${p.nomeFantasia}</td><td>${p.volumes}</td><td>${p.pesoKg}</td><td>${p.regiao}</td><td>${p.bairro}</td><td>${p.motorista}</td><td>${p.periodo}</td></tr>`).join('')}
</tbody></table>
<script>window.print();</script></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  // ── Modal Nova Entrega ──
  const [modalNovaEntrega, setModalNovaEntrega] = useState(false);

  const handleRotaCriada = () => {
    setModalNovaEntrega(false);
    carregar(); // recarrega grade + rotas
  };

  // ── KPIs do painel inferior direito (rotas reais) ──
  const kpis = useMemo(() => ({
    qtdRotas: rotasProgramadas.length,
    pesoCargaKg: rotasProgramadas.reduce((s, r) => s + Number(r.pesoKg || 0), 0),
    qtdEntregas: rotasProgramadas.reduce((s, r) => s + Number(r.qtdEntregas || 0), 0),
    slaPercent: 0,
  }), [rotasProgramadas]);

  // Pedidos que JÁ estão numa rota do dia → não podem ser roteirizados de novo (evita duplicar)
  const pedidosJaRoteirizados = useMemo(
    () => new Set<string>(rotasProgramadas.flatMap((r: any) => (r.entregas || []).map((e: any) => e.pedidoId))),
    [rotasProgramadas],
  );

  return (
    <div className="flex flex-col h-full bg-gray-100 text-[11px] select-none overflow-hidden">

      {/* ═══════════ BARRA DE FILTROS ═══════════ */}
      <div className="bg-gray-200 border-b border-gray-400 px-2 py-1.5 flex flex-wrap items-center gap-2 shrink-0">

        {/* Segmento */}
        <label className="flex items-center gap-1 text-gray-700 font-semibold">
          Segmento:
          <select value={segmento} onChange={e => setSegmento(e.target.value)} className="border border-gray-400 bg-white text-[11px] px-1.5 py-0.5 rounded font-normal w-28">
            {SEGMENTOS.map(s => <option key={s}>{s}</option>)}
          </select>
        </label>

        <span className="w-px h-5 bg-gray-400" />

        {/* Checkboxes */}
        <label className="flex items-center gap-1 cursor-pointer text-gray-700 font-medium">
          <input type="checkbox" checked={mostrarFinalizados} onChange={e => setMostrarFinalizados(e.target.checked)} className="accent-blue-600 h-3.5 w-3.5" />
          Mostrar Pedidos Finalizados
        </label>
        <label className="flex items-center gap-1 cursor-pointer text-gray-700 font-medium">
          <input type="checkbox" checked={mostrarGrade} onChange={e => setMostrarGrade(e.target.checked)} className="accent-blue-600 h-3.5 w-3.5" />
          Mostrar grade de produtos
        </label>
        <label className="flex items-center gap-1 cursor-pointer text-gray-700 font-medium">
          <input type="checkbox" checked={rotaPendente} onChange={e => setRotaPendente(e.target.checked)} className="accent-green-600 h-3.5 w-3.5" />
          <Check className="h-3 w-3 text-green-600" />
          Rota Pendente
        </label>
        <label className="flex items-center gap-1 cursor-pointer text-gray-700">
          <input type="checkbox" checked={somenteEscolas} onChange={e => setSomenteEscolas(e.target.checked)} className="accent-blue-600 h-3.5 w-3.5" />
          Somente Escolas
        </label>

        <span className="w-px h-5 bg-gray-400" />

        {/* Botões de ação da toolbar */}
        <button onClick={handleRotear} disabled={selecionados.size === 0} className="flex items-center gap-1 bg-white border border-blue-500 hover:bg-blue-50 px-2.5 py-1 rounded text-blue-700 font-bold disabled:opacity-40 disabled:border-gray-300 disabled:text-gray-400">
          <RotateCcw className="h-3.5 w-3.5" /> Rotear
        </button>
        <button onClick={handleImprimirSel} disabled={selecionados.size === 0} className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-gray-50 px-2.5 py-1 rounded text-gray-700 font-medium disabled:opacity-40">
          <Printer className="h-3.5 w-3.5" /> Imprimir Selecionados
        </button>
        <label className="flex items-center gap-1 cursor-pointer text-gray-700">
          <input type="checkbox" checked={permitirDesconto} onChange={e => setPermitirDesconto(e.target.checked)} className="accent-blue-600 h-3.5 w-3.5" />
          Permitir Desconto no Frete
        </label>
      </div>

      {/* ═══════════ DATA + LEGENDA ═══════════ */}
      <div className="bg-gray-200 border-b border-gray-400 px-2 py-1 flex items-center gap-4 shrink-0 text-gray-700">

        <label className="flex items-center gap-1 font-semibold">
          Carga:
          <input type="date" value={dataCarga} onChange={e => setDataCarga(e.target.value)} className="border border-gray-400 bg-white text-[11px] px-1.5 py-0.5 rounded w-32 font-mono cursor-pointer" />
        </label>

        <label className="flex items-center gap-1 font-semibold">
          Entrega:
          <input type="date" value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} className="border border-gray-400 bg-white text-[11px] px-1.5 py-0.5 rounded w-32 font-mono cursor-pointer" />
        </label>

        {/* Legenda de cores */}
        <div className="flex items-center gap-4 ml-4 text-[10px]">
          <span className="flex items-center gap-1"><span className="h-3 w-7 inline-block bg-gray-300 border border-gray-400 rounded-sm" /> Impresso</span>
          <span className="flex items-center gap-1"><span className="h-3 w-7 inline-block bg-red-600 border border-red-700 rounded-sm" /> Impressão Pendente</span>
          <span className="flex items-center gap-1"><span className="h-3 w-7 inline-block bg-gray-900 border border-gray-700 rounded-sm" /> Pedido Alterado</span>
          <span className="flex items-center gap-1"><span className="h-3 w-7 inline-block bg-green-600 border border-green-700 rounded-sm" /> AurCarga Ok</span>
        </div>
      </div>

      {/* ═══════════ ÁREA PRINCIPAL: GRADE + ROTAS ═══════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Grade de pedidos (esquerda ~75%) ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse" style={{ minWidth: 1100 }}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-300 border-b-2 border-gray-500 text-[10px]">
                  <th className="w-6 px-0.5 py-1 border-r border-gray-400">
                    <input type="checkbox" checked={selecionados.size === pedidosFiltrados.length && pedidosFiltrados.length > 0} onChange={toggleAll} className="accent-blue-600 h-3 w-3 cursor-pointer" />
                  </th>
                  {['Da.','En.','Nome Fantasia','Referê.','Libe.Sep.','Vols','Peso','Emp.','Tipo de Fatur.','Autor.de','Status','Região','CEP','Bairro','Sub-Região','Onda','Período','Rota','Recebi.','Motorista','Andamento'].map(h => (
                    <th key={h} className="px-1 py-1 text-left font-semibold text-gray-800 border-r border-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={22} className="px-4 py-10 text-center text-gray-400 italic bg-white">
                      {carregando
                        ? 'Carregando pedidos da data de carga...'
                        : `Nenhum pedido confirmado para ${new Date(dataCarga + 'T00:00:00').toLocaleDateString('pt-BR')}. Confirme pedidos em "Pedidos de Venda" com esta data de entrega.`}
                    </td>
                  </tr>
                )}
                {pedidosFiltrados.map(p => {
                  const sel = selecionados.has(p.id);
                  return (
                    <tr key={p.id} className={`border-b border-gray-300/50 cursor-pointer transition-colors ${rowBg(p, sel)}`} onClick={() => toggleSelect(p.id)}>
                      <td className="px-0.5 text-center border-r border-gray-400/30" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={sel} onChange={() => toggleSelect(p.id)} className="accent-blue-400 h-3 w-3 cursor-pointer" />
                      </td>
                      <td className="px-1 border-r border-gray-400/20 whitespace-nowrap">{new Date(p.data).getDate()}.</td>
                      <td className="px-1 border-r border-gray-400/20 whitespace-nowrap">1.</td>
                      <td className="px-1 border-r border-gray-400/20 max-w-[120px] truncate font-medium">{p.nomeFantasia}</td>
                      <td className="px-1 border-r border-gray-400/20 whitespace-nowrap">{p.referencia}</td>
                      <td className="px-1 border-r border-gray-400/20 whitespace-nowrap">{p.liberadoEm}</td>
                      <td className="px-1 border-r border-gray-400/20 text-right whitespace-nowrap">{p.volumes}</td>
                      <td className="px-1 border-r border-gray-400/20 text-right whitespace-nowrap">{p.pesoKg}</td>
                      <td className="px-1 border-r border-gray-400/20 whitespace-nowrap">{p.empresa}</td>
                      <td className="px-1 border-r border-gray-400/20 whitespace-nowrap">
                        <span className={`${sel ? '' : p.tipoFaturamento.includes('NFe') ? 'bg-yellow-200 text-yellow-900 px-0.5 rounded' : ''}`}>{p.tipoFaturamento}</span>
                      </td>
                      <td className="px-1 border-r border-gray-400/20 whitespace-nowrap">{p.autorizacao}</td>
                      <td className="px-1 border-r border-gray-400/20 whitespace-nowrap font-bold">{p.status}</td>
                      <td className="px-1 border-r border-gray-400/20 max-w-[90px] truncate font-semibold">{p.regiao}</td>
                      <td className="px-1 border-r border-gray-400/20 font-mono whitespace-nowrap">{p.cep}</td>
                      <td className="px-1 border-r border-gray-400/20 max-w-[80px] truncate">{p.bairro}</td>
                      <td className="px-1 border-r border-gray-400/20 max-w-[90px] truncate">{p.subRegiao}</td>
                      <td className="px-1 border-r border-gray-400/20 text-center">{p.onda}</td>
                      <td className="px-1 border-r border-gray-400/20 whitespace-nowrap">
                        <span className={sel ? '' : p.periodo === 'MANHA' ? 'text-blue-800 font-bold' : 'text-orange-700 font-bold'}>
                          {p.periodo === 'MANHA' ? 'MANHÃ' : 'TARDE'}
                        </span>
                      </td>
                      <td className="px-1 border-r border-gray-400/20 whitespace-nowrap">{p.rota}</td>
                      <td className="px-1 border-r border-gray-400/20 whitespace-nowrap">{p.recebimento}</td>
                      <td className="px-1 border-r border-gray-400/20 max-w-[100px] truncate">{p.motorista}</td>
                      <td className="px-1 text-center whitespace-nowrap">{p.andamento}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Rodapé da grade */}
          <div className="bg-gray-200 border-t border-gray-400 px-2 py-0.5 flex items-center gap-4 shrink-0 text-gray-600">
            <span>Registros na... <strong className="text-gray-900">{pedidosFiltrados.length}</strong></span>
            <span>12...</span>
            <span>10,39...</span>
          </div>
        </div>

        {/* ── Painel de Rotas (direita ~280px) ── */}
        <div className="w-72 shrink-0 border-l-2 border-gray-400 flex flex-col bg-gray-50">

          {/* Abas */}
          <div className="flex border-b border-gray-400 bg-gray-200 shrink-0">
            <button onClick={() => setAbaRota('rotas')} className={`flex-1 py-1.5 text-[11px] font-semibold border-r border-gray-400 transition-colors ${abaRota === 'rotas' ? 'bg-white text-blue-700 border-b-2 border-b-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}>
              Rotas
            </button>
            <button onClick={() => setAbaRota('horario')} className={`flex-1 py-1.5 text-[11px] font-semibold transition-colors ${abaRota === 'horario' ? 'bg-white text-blue-700 border-b-2 border-b-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}>
              Carga por Horário
            </button>
          </div>

          {/* Ordenar por Motorista */}
          <div className="px-2 py-1 border-b border-gray-300 shrink-0 flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 flex-1">
              <span className="text-gray-500 text-[10px]">Pesquisar:</span>
              <input value={buscaRota} onChange={e => setBuscaRota(e.target.value)} className="flex-1 border border-gray-400 text-[11px] px-1.5 py-0.5 rounded bg-white" placeholder="motorista..." />
            </div>
            <span className="text-[9px] text-gray-400">Ordenar por Motorista</span>
          </div>

          {/* Árvore de rotas */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-200 border-b border-gray-300 font-bold text-gray-800 text-[11px]">
              <ChevronDown className="h-3 w-3 text-gray-500" />
              <Truck className="h-3 w-3 text-blue-600" />
              Entregas Programadas
            </div>

            {rotasFiltradas.length === 0 && (
              <div className="px-3 py-6 text-center text-gray-400 text-[10px] italic">
                Nenhuma rota montada para o dia.<br />Use <strong>Nova Entrega</strong> para roteirizar.
              </div>
            )}
            {rotasFiltradas.map(r => (
              <div key={r.id} className={`border-b border-gray-200 cursor-pointer transition-colors ${rotaExpandida === r.id ? 'bg-blue-100' : 'hover:bg-gray-100'}`} onClick={() => setRotaExpandida(rotaExpandida === r.id ? null : r.id)}>
                <div className="flex items-center gap-1 px-2 py-1.5 text-[11px]">
                  <span className="text-gray-400 w-3">{rotaExpandida === r.id ? '▾' : '▸'}</span>
                  <Truck className={`h-3 w-3 shrink-0 ${r.refrigerado ? 'text-cyan-600' : 'text-gray-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-bold text-gray-800 truncate" style={{ maxWidth: 120 }}>{r.motorista}</span>
                      <span className={`text-[9px] font-bold px-1 rounded ${r.refrigerado ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-200 text-gray-600'}`}>
                        {(r.tipoVeiculo || 'VAN').slice(0, 14)}
                      </span>
                    </div>
                    <div className="text-gray-500 mt-0.5">
                      {Number(r.pesoKg || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}Kg · {r.qtdEntregas} entr. · #{r.numero}
                    </div>
                  </div>
                </div>
                {rotaExpandida === r.id && (
                  <div className="bg-blue-50 px-3 py-1.5 text-[10px] text-gray-600 space-y-1 border-t border-blue-200">
                    <div className="flex justify-between"><span>Valor total</span><strong className="text-green-700">{R$(Number(r.valorTotal || 0))}</strong></div>
                    <div className="border-t border-blue-200 pt-1 space-y-0.5">
                      {(r.entregas || []).map((e: any) => (
                        <div key={e.pedidoId} className="flex justify-between gap-1">
                          <span className="truncate">{e.ordem}. {e.cliente}</span>
                          <span className="font-mono shrink-0">{R$(e.valor)}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={(ev) => { ev.stopPropagation(); imprimirCapaRota(r.id); }}
                      className="w-full mt-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-1 font-bold flex items-center justify-center gap-1">
                      <Printer className="h-3 w-3" /> Imprimir Capa de Rota
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ PAINEL INFERIOR: ENTREGAS + KPIs ═══════════ */}
      <div className="shrink-0 border-t-2 border-gray-400" style={{ height: 200 }}>
        <div className="bg-gray-200 border-b border-gray-400 px-2 py-0.5 font-bold text-gray-800 text-[11px]">
          Entregas
        </div>
        <div className="flex" style={{ height: 'calc(100% - 22px)' }}>

          {/* Tabela de entregas selecionadas */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead className="bg-gray-300 sticky top-0">
                <tr>
                  {['Data Entrega','Rota','Nome Fantasia','Id Mltvenda','Id Venda','Volumes','Peso Total','Empresa','Tipo Faturamento','Vlr Tot Pedido','Autorização de Carga','Espelho'].map(h => (
                    <th key={h} className="px-2 py-1 text-left font-semibold text-gray-700 border-r border-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entregasSelecionadas.length > 0 ? entregasSelecionadas.map(p => (
                  <tr key={p.id} className="bg-white border-b border-gray-200 hover:bg-blue-50">
                    <td className="px-2 py-1 border-r border-gray-300 whitespace-nowrap">{new Date(p.data).toLocaleDateString('pt-BR')}</td>
                    <td className="px-2 py-1 border-r border-gray-300">{p.rota}</td>
                    <td className="px-2 py-1 border-r border-gray-300 font-medium">{p.nomeFantasia}</td>
                    <td className="px-2 py-1 border-r border-gray-300">{p.idMltvenda}</td>
                    <td className="px-2 py-1 border-r border-gray-300">{p.idVenda}</td>
                    <td className="px-2 py-1 border-r border-gray-300 text-right">{p.volumes}</td>
                    <td className="px-2 py-1 border-r border-gray-300 text-right">{p.pesoKg}</td>
                    <td className="px-2 py-1 border-r border-gray-300">{p.empresa}</td>
                    <td className="px-2 py-1 border-r border-gray-300">{p.tipoFaturamento}</td>
                    <td className="px-2 py-1 border-r border-gray-300 text-right font-mono">{p.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-1 border-r border-gray-300">{p.aurCargaOk ? '✔' : ''}</td>
                    <td className="px-2 py-1">
                      <button onClick={() => imprimirEspelho(p.id)} className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5 font-semibold">
                        <Printer className="h-3 w-3" /> Espelho
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={12} className="px-4 py-6 text-center text-gray-400 italic">Selecione pedidos na grade acima para ver e imprimir o espelho</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* KPIs (canto inferior direito) — clean/glass */}
          <div className="w-72 shrink-0 border-l border-white/[0.06] bg-white/[0.02] flex flex-col p-3 gap-2">
            <div className="flex items-center gap-2 text-slate-500">
              <Truck className="h-4 w-4" strokeWidth={1.75} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">Resumo das rotas</span>
            </div>
            <div className="grid grid-cols-2 gap-2 flex-1">
              <KpiMini label="Qtd Rotas" valor={String(kpis.qtdRotas)} />
              <KpiMini label="Peso Carga" valor={`${kpis.pesoCargaKg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} sufixo="kg" />
              <KpiMini label="Qtd Entregas" valor={String(kpis.qtdEntregas)} />
              <KpiMini label="SLA" valor={`${kpis.slaPercent.toFixed(0)}`} sufixo="%" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ BOTÕES DE AÇÃO (RODAPÉ) ═══════════ */}
      <div className="shrink-0 bg-gray-200 border-t border-gray-400 px-2 py-1 flex items-center gap-2">
        <button onClick={handleRemoverLinha} disabled={selecionados.size === 0} className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-red-50 hover:text-red-700 px-3 py-1 rounded text-gray-700 font-medium disabled:opacity-40">
          <Trash2 className="h-3.5 w-3.5" /> Remover Linha
        </button>
        <button onClick={handleImprimirSel} disabled={selecionados.size === 0} className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-gray-50 px-3 py-1 rounded text-gray-700 font-medium disabled:opacity-40">
          <Printer className="h-3.5 w-3.5" /> Imprimir Bilhete
        </button>
        <button onClick={() => setModalNovaEntrega(true)} className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-green-50 hover:text-green-700 px-3 py-1 rounded text-gray-700 font-medium">
          <PlusCircle className="h-3.5 w-3.5" /> Nova Entrega
        </button>
        <button onClick={handleAutorizar} disabled={selecionados.size === 0} className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-blue-50 hover:text-blue-700 px-3 py-1 rounded text-gray-700 font-medium disabled:opacity-40">
          <ShieldCheck className="h-3.5 w-3.5" /> Incluir na Autorização
        </button>
        <button onClick={handleLimpar} className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-gray-50 px-3 py-1 rounded text-gray-700 font-medium">
          <Eraser className="h-3.5 w-3.5" /> Limpar a Grade
        </button>

        {/* Contadores do rodapé */}
        <div className="ml-auto flex items-center gap-3 text-gray-600">
          <span>Entregas: <strong>{entregasSelecionadas.length}</strong></span>
          <span className="font-mono">{kpis.pesoCargaKg.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</span>
          <span className="font-mono">{entregasSelecionadas.reduce((s, p) => s + p.valorTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          {selecionados.size > 0 && (
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded font-bold text-[10px]">
              {selecionados.size} selecionado{selecionados.size !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ═══════════ MODAL NOVA ENTREGA ═══════════ */}
      {modalNovaEntrega && (
        <ModalNovaEntrega
          dataCarga={dataCarga}
          filialId={filialAtiva?.id}
          pedidosJaRoteirizados={pedidosJaRoteirizados}
          onClose={() => setModalNovaEntrega(false)}
          onCriado={handleRotaCriada}
        />
      )}
    </div>
  );
}

// ─── Tipo para pedido a roteirizar ───

// ─── Modal Roteirizar (busca pedidos CONFIRMADOS e atribui a motorista) ───
function ModalNovaEntrega({ dataCarga, filialId, pedidosJaRoteirizados, onClose, onCriado }: {
  dataCarga: string;
  filialId?: string;
  pedidosJaRoteirizados: Set<string>;
  onClose: () => void;
  onCriado: () => void;
}) {
  const { filialAtiva } = useAuth();

  // Pedidos disponíveis (CONFIRMADOS sem rota)
  const [pedidosDisp, setPedidosDisp] = useState<any[]>([]);
  const [loadingPed, setLoadingPed]   = useState(true);
  const [busca, setBusca]             = useState('');

  // Pedidos selecionados para roteirizar
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [salvando, setSalvando]         = useState(false);
  const [erro, setErro]                 = useState('');
  const [freteRota, setFreteRota]       = useState(''); // frete da rota (vai p/ Frete por Motorista)

  // Veículo escolhido (traz motorista padrão + capacidade) — é a atribuição da rota
  const [veiculos, setVeiculos]   = useState<any[]>([]);
  const [veicSelId, setVeicSelId] = useState('');
  useEffect(() => { api.get('/veiculos').then(r => setVeiculos((r.data || []).filter((v: any) => v.ativo))).catch(() => setVeiculos([])); }, []);
  const veic = veiculos.find(v => v.id === veicSelId) || null;

  // Carrega os pedidos do DIA da carga que ainda podem entrar numa rota
  // (CONFIRMADO, EM_SEPARACAO ou SEPARADO — exclui rascunho, faturado e cancelado)
  useEffect(() => {
    if (!filialAtiva) return;
    setLoadingPed(true);
    api.get('/pedidos', { params: { filialId: filialAtiva.id, status: 'CONFIRMADO,EM_SEPARACAO,SEPARADO', dataInicio: dataCarga, dataFim: dataCarga } })
      .then(r => setPedidosDisp(r.data))
      .catch(() => setPedidosDisp([]))
      .finally(() => setLoadingPed(false));
  }, [filialAtiva?.id, dataCarga]);

  // Filtro por busca — E remove os pedidos que já estão numa rota (não duplica)
  const pedidosFiltrados = useMemo(() => {
    const disp = pedidosDisp.filter((p: any) => !pedidosJaRoteirizados.has(p.id));
    if (!busca) return disp;
    const q = busca.toLowerCase();
    return disp.filter((p: any) =>
      (p.cliente?.razaoSocial || '').toLowerCase().includes(q) ||
      (p.cliente?.nomeFantasia || '').toLowerCase().includes(q) ||
      String(p.numero).includes(q)
    );
  }, [pedidosDisp, busca, pedidosJaRoteirizados]);

  const toggleSel = (id: string) => {
    if (!veic) { setErro('Escolha o veículo primeiro (lado direito).'); return; }
    setErro('');
    setSelecionados(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    setSelecionados(selecionados.size === pedidosFiltrados.length ? new Set() : new Set(pedidosFiltrados.map((p: any) => p.id)));
  };

  const pedidosSel = pedidosFiltrados.filter((p: any) => selecionados.has(p.id));
  // Valor total da entrega = soma do valor de todos os pedidos selecionados
  const valorTotalEntrega = pedidosSel.reduce((s: number, p: any) => s + Number(p.valorTotal || 0), 0);
  const R$ = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const pesoSel   = pedidosSel.reduce((s: number, p: any) => s + Number(p.pesoTotal || 0), 0);
  const caixasSel = pedidosSel.reduce((s: number, p: any) => s + Number(p.volumes || 0), 0);
  const pesoPct   = veic?.capacidadeKg ? (pesoSel / Number(veic.capacidadeKg)) * 100 : 0;
  const caixasPct = veic?.capacidadeCaixasH ? (caixasSel / Number(veic.capacidadeCaixasH)) * 100 : 0;
  const ocupPct   = Math.max(pesoPct, caixasPct);

  // Só permite clicar nos pedidos depois de escolher o veículo (traz motorista + capacidade)
  const veiculoEscolhido = !!veic;
  const periodoRota = pedidosSel[0]?.periodo || 'MANHA';

  // Roteirizar: PERSISTE a rota (cria o Romaneio / Capa de Rota) no backend
  const handleRoteirizar = async () => {
    if (!veic) { setErro('Escolha o veículo (lado direito).'); return; }
    if (selecionados.size === 0) { setErro('Selecione pelo menos um pedido.'); return; }
    if (!filialId) return;
    // Trava de capacidade: se passar de 100% do veículo escolhido, pede confirmação
    if (ocupPct > 100) {
      const qual = pesoPct >= caixasPct ? `${pesoPct.toFixed(0)}% do peso` : `${caixasPct.toFixed(0)}% das caixas`;
      const ok = await confirmDialog(
        `O veículo ${veic.placa} ficaria com ${qual} (acima de 100% da capacidade). Roteirizar mesmo assim?`,
        { tone: 'danger', okLabel: 'Roteirizar assim mesmo' },
      );
      if (!ok) return;
    }
    setSalvando(true); setErro('');
    try {
      await api.post('/carga/romaneio', {
        filialId,
        motorista: veic.motoristaPadrao || 'A definir',
        codigoCondutor: veic.placa,
        placaVeiculo: veic.placa,
        modeloVeiculo: veic.modelo,
        tipoVeiculo: veic.tipo,
        refrigerado: veic.refrigerado,
        periodo: periodoRota,
        dataMovimento: new Date().toISOString(),
        dataEntrega: dataCarga,
        valorFrete: Number(freteRota) || 0,
        pedidoIds: Array.from(selecionados),
      });
      onCriado();
    } catch (e: any) {
      setErro(e.response?.data?.message || 'Erro ao salvar a rota.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-2 animate-fade-in">
      <div className="bg-white border border-gray-300 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50 rounded-t-xl shrink-0">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-600" />
            <h2 className="font-bold text-gray-900 text-sm">Nova Entrega — Roteirizar</h2>
            <span className="text-xs text-gray-400">
              {veiculoEscolhido
                ? `Clique nos pedidos do dia para incluir na rota do ${veic?.placa}`
                : '1º escolha o veículo (à direita) · depois clique nos pedidos do dia'}
            </span>
            {selecionados.size > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {selecionados.size} selecionado{selecionados.size !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Corpo: 2 colunas */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Col esquerda: Pedidos confirmados ── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Busca */}
            <div className="p-3 border-b border-gray-200 bg-white shrink-0 flex gap-2 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Filtrar pedidos por cliente ou número..."
                  className="w-full border border-gray-300 rounded pl-8 pr-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-400" />
              </div>
              <span className="text-xs text-gray-400 shrink-0">{pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''} disponíve{pedidosFiltrados.length !== 1 ? 'is' : 'l'}</span>
            </div>

            {/* Tabela de pedidos */}
            <div className="flex-1 overflow-auto">
              {loadingPed ? (
                <div className="flex justify-center py-12"><div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
              ) : pedidosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <ClipboardList className="h-10 w-10 text-gray-200 mb-2" />
                  <p className="text-sm font-medium">Nenhum pedido confirmado</p>
                  <p className="text-xs mt-1">Lance pedidos em <strong>Pedidos de Venda</strong> e confirme para roteirizar</p>
                </div>
              ) : (
                <table className="w-full text-[11px] border-collapse">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="w-8 px-2 py-1.5 border-b border-gray-200">
                        <input type="checkbox" checked={selecionados.size === pedidosFiltrados.length && pedidosFiltrados.length > 0}
                          onChange={toggleAll} className="accent-blue-600 h-3 w-3 cursor-pointer" />
                      </th>
                      {['Nº', 'Cliente', 'Data Entrega', 'Peso (kg)', 'Valor', 'Status'].map(h => (
                        <th key={h} className="px-2 py-1.5 text-left font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosFiltrados.map((p: any) => {
                      const sel = selecionados.has(p.id);
                      return (
                        <tr key={p.id} onClick={() => toggleSel(p.id)}
                          className={`border-b border-gray-100 cursor-pointer transition-colors ${sel ? 'bg-blue-100 ring-1 ring-inset ring-blue-400' : 'hover:bg-gray-50'}`}>
                          <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={sel} onChange={() => toggleSel(p.id)} className="accent-blue-600 h-3 w-3 cursor-pointer" />
                          </td>
                          <td className="px-2 py-1.5 font-bold text-blue-700">{p.numero}</td>
                          <td className="px-2 py-1.5">
                            <p className="font-semibold text-gray-900 truncate max-w-[200px]">{p.cliente?.nomeFantasia || p.cliente?.razaoSocial || '—'}</p>
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{p.dataEntrega ? new Date(p.dataEntrega).toLocaleDateString('pt-BR') : '—'}</td>
                          <td className="px-2 py-1.5 text-right font-mono font-semibold text-gray-800">{Number(p.pesoTotal || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{Number(p.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="px-2 py-1.5">
                            <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-[9px] font-bold">{p.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── Col direita: Veículos da frota (traz motorista + capacidade) ── */}
          <div className="w-64 shrink-0 border-l border-gray-200 flex flex-col bg-gray-50">
            <div className="bg-gray-200 px-3 py-2 border-b border-gray-300 shrink-0">
              <p className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-1">
                <Truck className="h-3 w-3" /> Escolher Veículo
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {veiculos.length === 0 && (
                <p className="text-[10px] text-gray-400 italic px-3 py-3">Nenhum veículo ativo. Cadastre em Frotas &amp; Veículos.</p>
              )}
              {veiculos.map(v => {
                const sel = veicSelId === v.id;
                return (
                  <button key={v.id} onClick={() => setVeicSelId(sel ? '' : v.id)}
                    className={`w-full text-left px-2 py-1.5 border-b border-gray-200 flex items-center gap-1.5 ${sel ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}>
                    <div className={`h-2.5 w-2.5 rounded-full border-2 shrink-0 ${sel ? 'border-white' : 'border-gray-400'}`}>
                      {sel && <div className="h-1 w-1 bg-white rounded-full m-px" />}
                    </div>
                    <Truck className={`h-3 w-3 shrink-0 ${sel ? 'text-white' : v.refrigerado ? 'text-cyan-500' : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] font-bold truncate ${sel ? 'text-white' : 'text-gray-900'}`}>{v.placa} · {v.motoristaPadrao || 'sem motorista'}</p>
                      <span className={`text-[9px] ${sel ? 'text-blue-100' : 'text-gray-400'}`}>
                        {(v.tipo || 'VEÍCULO')} · {Number(v.capacidadeKg || 0).toFixed(0)}kg · {v.capacidadeCaixasH || 0}cx
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Resumo da entrega */}
            <div className="bg-gray-900 text-white border-t border-gray-300 px-3 py-2 shrink-0 space-y-1">
              {veic ? (
                <div className="flex items-center gap-1 text-[11px]">
                  <Truck className={`h-3.5 w-3.5 ${veic.refrigerado ? 'text-cyan-400' : 'text-blue-400'}`} />
                  <strong className="truncate">{veic.placa} · {veic.motoristaPadrao || 'sem motorista'}</strong>
                </div>
              ) : (
                <p className="text-gray-400 italic text-[11px]">Nenhum veículo selecionado</p>
              )}

              {/* Barras de capacidade (peso × caixas H) do veículo escolhido */}
              {veic && (
                <div className="pt-1 border-t border-gray-700 space-y-1.5">
                  <CapBar label={`Peso ${pesoSel.toFixed(0)}/${Number(veic.capacidadeKg || 0).toFixed(0)} kg`} pct={pesoPct} />
                  <CapBar label={`Caixas ${caixasSel}/${veic.capacidadeCaixasH || 0}`} pct={caixasPct} />
                  <p className={`text-[10px] font-bold text-center ${ocupPct > 100 ? 'text-rose-400' : ocupPct >= 90 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    🚚 {ocupPct.toFixed(0)}% ocupado{ocupPct > 100 ? ' · ACIMA DA CAPACIDADE' : ''}
                  </p>
                </div>
              )}

              <div className="flex justify-between text-[10px] text-gray-300">
                <span>Pedidos na rota · Peso</span><strong className="text-white font-mono">{selecionados.size} · {pesoSel.toFixed(0)} kg</strong>
              </div>

              {/* Frete da rota — já vai pro Frete por Motorista */}
              <div className="pt-1 border-t border-gray-700">
                <label className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-300 shrink-0">Frete da rota (R$)</span>
                  <input type="number" step="0.01" min="0" value={freteRota} onChange={e => setFreteRota(e.target.value)}
                    placeholder="0,00"
                    className="w-24 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-[11px] text-right font-mono text-emerald-300 focus:outline-none focus:border-sky-500" />
                </label>
                <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
                  <span>% sobre a nota</span>
                  <span className="font-mono">{valorTotalEntrega > 0 && Number(freteRota) > 0 ? ((Number(freteRota) / valorTotalEntrega) * 100).toFixed(2) + '%' : '—'}</span>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-1 flex justify-between items-baseline">
                <span className="text-[10px] text-gray-300 uppercase font-semibold">Valor total</span>
                <strong className="text-lg font-black text-green-400 font-mono">{R$(valorTotalEntrega)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 bg-gray-50 rounded-b-xl shrink-0">
          <div className="flex items-center gap-4">
            {veic && <span className="text-xs text-gray-500">🚛 <strong>{veic.placa}</strong> — {veic.motoristaPadrao || 'sem motorista'} · {veic.tipo}</span>}
            <span className="text-xs text-gray-500">
              Valor da entrega: <strong className="text-green-700 font-mono text-sm">{R$(valorTotalEntrega)}</strong>
            </span>
          </div>
          {erro && <span className="text-xs text-red-600 font-semibold">{erro}</span>}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 font-medium">Cancelar</button>
            <button onClick={handleRoteirizar} disabled={salvando || selecionados.size === 0 || !veiculoEscolhido}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 shadow-sm">
              <RotateCcw className="h-3.5 w-3.5" /> Roteirizar {selecionados.size} Pedido{selecionados.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// KPI minimalista do resumo de rotas
function KpiMini({ label, valor, sufixo }: { label: string; valor: string; sufixo?: string }) {
  return (
    <div className="glass rounded-xl px-3 py-2 flex flex-col justify-center">
      <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-[0.1em] truncate">{label}</span>
      <span className="text-xl font-extrabold text-white tabular-nums leading-tight">
        {valor}{sufixo && <span className="text-xs font-semibold text-slate-500 ml-0.5">{sufixo}</span>}
      </span>
    </div>
  );
}

// Barra de capacidade (verde <90% · âmbar 90–100% · vermelho >100%)
function CapBar({ label, pct }: { label: string; pct: number }) {
  const cor = pct > 100 ? 'bg-rose-500' : pct >= 90 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div>
      <div className="flex justify-between text-[9px] text-gray-300 mb-0.5">
        <span>{label}</span>
        <span className={`font-bold ${pct > 100 ? 'text-rose-400' : 'text-gray-200'}`}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
        <div className={`h-full ${cor} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}
