import { useState, useMemo, useEffect } from 'react';
import {
  RefreshCw, Printer, Truck, CheckSquare,
  ChevronDown, RotateCcw, Trash2,
  PlusCircle, ShieldCheck, Eraser, Clock, Check,
  X, Search, UserPlus,
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

interface RotaMotorista {
  id: string;
  numero: number;
  motorista: string;
  tipoVeiculo: string;
  refrigerado: boolean;
  pesoKg: number;
  qtdEntregas: number;
  periodo: string;
  slaPercent: number;
}

// ─── Segmentos ───────────────────────────────────
const SEGMENTOS = [
  '0-Todos', '1-Escolas', '2-Restaurantes', '3-Hospitais',
  '4-Hotéis', '5-Indústria', '6-Mercados', '7-Padarias',
];

// ─── Dados mock da grade (replicando o NewOxxy exato) ──
const MOCK_PEDIDOS: PedidoCarga[] = [
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

const MOCK_ROTAS: RotaMotorista[] = [
  { id:'r1',  numero:3519, motorista:'ANDRE LUIZ CELESTINO',    tipoVeiculo:'VAN',             refrigerado:false, pesoKg:591.11,  qtdEntregas:4,  periodo:'MANHA', slaPercent:0 },
  { id:'r2',  numero:3515, motorista:'ELINALDO TAVARES DE',     tipoVeiculo:'KOMBI',           refrigerado:false, pesoKg:1155.53, qtdEntregas:7,  periodo:'MANHA', slaPercent:0 },
  { id:'r3',  numero:3189, motorista:'ELTON DE OLIVEIRA CO',    tipoVeiculo:'VAN REFRIGERADA', refrigerado:true,  pesoKg:819.7,   qtdEntregas:5,  periodo:'MANHA', slaPercent:0 },
  { id:'r4',  numero:3518, motorista:'GENIVAL BEZERRA DOS',     tipoVeiculo:'KOMBI',           refrigerado:false, pesoKg:300.16,  qtdEntregas:3,  periodo:'MANHA', slaPercent:0 },
  { id:'r5',  numero:3518, motorista:'GENIVAL BEZERRA DOS',     tipoVeiculo:'KOMBI',           refrigerado:false, pesoKg:508.91,  qtdEntregas:4,  periodo:'MANHA', slaPercent:0 },
  { id:'r6',  numero:3195, motorista:'HENRIQUE SILVA DOS A',    tipoVeiculo:'MINI-VAN',        refrigerado:false, pesoKg:272.73,  qtdEntregas:3,  periodo:'MANHA', slaPercent:0 },
  { id:'r7',  numero:3195, motorista:'JEFERSON DE ALMEIDA',     tipoVeiculo:'MINI-VAN',        refrigerado:false, pesoKg:287.75,  qtdEntregas:2,  periodo:'MANHA', slaPercent:0 },
  { id:'r8',  numero:3186, motorista:'MILTON SANTOS',           tipoVeiculo:'VAN',             refrigerado:false, pesoKg:947.8,   qtdEntregas:6,  periodo:'MANHA', slaPercent:0 },
  { id:'r9',  numero:3187, motorista:'MILTON SANTOS',           tipoVeiculo:'VAN',             refrigerado:false, pesoKg:858.4,   qtdEntregas:5,  periodo:'MANHA', slaPercent:0 },
  { id:'r10', numero:3520, motorista:'MILTON SANTOS',           tipoVeiculo:'VAN',             refrigerado:false, pesoKg:1424.48, qtdEntregas:8,  periodo:'TARDE', slaPercent:0 },
  { id:'r11', numero:3519, motorista:'SIDNEY FERNANDO TEIX',    tipoVeiculo:'VAN',             refrigerado:false, pesoKg:51.8,    qtdEntregas:1,  periodo:'MANHA', slaPercent:0 },
  { id:'r12', numero:3518, motorista:'SIDNEY FERNANDO TEIX',    tipoVeiculo:'VAN',             refrigerado:false, pesoKg:1342.61, qtdEntregas:7,  periodo:'TARDE', slaPercent:0 },
  { id:'r13', numero:3185, motorista:'WILLIAN EUFRORSINO A',    tipoVeiculo:'VAN',             refrigerado:false, pesoKg:119.73,  qtdEntregas:2,  periodo:'MANHA', slaPercent:0 },
  { id:'r14', numero:3190, motorista:'WILLIAN EUFRORSINO A',    tipoVeiculo:'VAN',             refrigerado:false, pesoKg:654.34,  qtdEntregas:4,  periodo:'MANHA', slaPercent:0 },
  { id:'r15', numero:3198, motorista:'WILSON LUIZ DE OLIVE',    tipoVeiculo:'VAN',             refrigerado:false, pesoKg:350.5,   qtdEntregas:3,  periodo:'MANHA', slaPercent:0 },
  { id:'r16', numero:3512, motorista:'WILLIAN EUFRORSINO A',    tipoVeiculo:'VAN',             refrigerado:false, pesoKg:342.26,  qtdEntregas:3,  periodo:'MANHA', slaPercent:0 },
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
  const [dataEntrega, setDataEntrega]               = useState('');
  const [mostrarFinalizados, setMostrarFinalizados] = useState(true);
  const [mostrarGrade, setMostrarGrade]             = useState(true);
  const [rotaPendente, setRotaPendente]             = useState(true);
  const [somenteEscolas, setSomenteEscolas]         = useState(false);
  const [permitirDesconto, setPermitirDesconto]     = useState(false);

  // ── Estado da grade ──
  const [pedidos, setPedidos]         = useState<PedidoCarga[]>(MOCK_PEDIDOS);
  const [rotas]                       = useState<RotaMotorista[]>(MOCK_ROTAS);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [abaRota, setAbaRota]         = useState<'rotas' | 'horario'>('rotas');
  const [rotaExpandida, setRotaExpandida] = useState<string | null>(null);
  const [buscaRota, setBuscaRota]     = useState('');

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

  // ── Filtrar rotas por busca ──
  const rotasFiltradas = useMemo(() => {
    if (!buscaRota) return rotas;
    const q = buscaRota.toLowerCase();
    return rotas.filter(r => r.motorista.toLowerCase().includes(q) || String(r.numero).includes(q));
  }, [rotas, buscaRota]);

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
  const handleAtualizar = () => {
    setPedidos([...MOCK_PEDIDOS]);
    setSelecionados(new Set());
  };

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
    setPedidos(MOCK_PEDIDOS);
    setSelecionados(new Set());
  };

  const handleRotear = () => {
    alert(`Roteamento de ${selecionados.size} pedido(s) selecionados.\nFuncionalidade será integrada com o backend.`);
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

  const handleNovaEntregaCriada = (novoPedido: PedidoCarga) => {
    setPedidos(prev => [novoPedido, ...prev]);
    setModalNovaEntrega(false);
  };

  // ── KPIs do painel inferior direito ──
  const kpis = useMemo(() => {
    const totalPeso = entregasSelecionadas.reduce((s, p) => s + parseFloat(p.pesoKg.replace(',', '.').replace('...', '')) || 0, 0);
    return {
      qtdRotas: rotas.length,
      pesoCargaKg: totalPeso,
      qtdEntregas: entregasSelecionadas.length,
      slaPercent: 0,
    };
  }, [rotas, entregasSelecionadas]);

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

        {/* Atualizar Lista */}
        <button onClick={handleAtualizar} className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-blue-50 px-2.5 py-1 rounded text-gray-700 font-medium">
          <RefreshCw className="h-3.5 w-3.5 text-blue-600" /> Atualizar Lista
        </button>

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

            {rotasFiltradas.map(r => (
              <div key={r.id} className={`border-b border-gray-200 cursor-pointer transition-colors ${rotaExpandida === r.id ? 'bg-blue-100' : 'hover:bg-gray-100'}`} onClick={() => setRotaExpandida(rotaExpandida === r.id ? null : r.id)}>
                <div className="flex items-center gap-1 px-2 py-1.5 text-[11px]">
                  <span className="text-gray-400 w-3">{rotaExpandida === r.id ? '▾' : '▸'}</span>
                  <Truck className={`h-3 w-3 shrink-0 ${r.refrigerado ? 'text-cyan-600' : 'text-gray-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-bold text-gray-800 truncate" style={{ maxWidth: 130 }}>{r.motorista}</span>
                      <span className={`text-[9px] font-bold px-1 rounded ${r.refrigerado ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-200 text-gray-600'}`}>
                        {r.tipoVeiculo.length > 14 ? r.tipoVeiculo.slice(0, 14) : r.tipoVeiculo}
                      </span>
                    </div>
                    <div className="text-gray-500 mt-0.5">
                      {r.pesoKg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}Kg &nbsp;–&nbsp; {r.numero}
                    </div>
                  </div>
                </div>
                {rotaExpandida === r.id && (
                  <div className="bg-blue-50 px-4 py-1.5 text-[10px] text-gray-600 space-y-0.5 border-t border-blue-200">
                    <div>Rota nº: <strong>{r.numero}</strong></div>
                    <div>Veículo: <strong>{r.tipoVeiculo}</strong>{r.refrigerado && ' ❄️'}</div>
                    <div>Entregas: <strong>{r.qtdEntregas}</strong></div>
                    <div>Peso: <strong>{r.pesoKg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg</strong></div>
                    <div>Período: <strong>{r.periodo}</strong></div>
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
                  {['Data Entrega','Rota','Nome Fantasia','Id Mltvenda','Id Venda','Volumes','Peso Total','Empresa','Tipo Faturamento','Vlr Tot Pedido','Autorização de Carga'].map(h => (
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
                    <td className="px-2 py-1">{p.aurCargaOk ? '✔' : ''}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={11} className="px-4 py-6 text-center text-gray-400 italic">Nenhum Registro Encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* KPIs (canto inferior direito) */}
          <div className="w-72 shrink-0 border-l-2 border-gray-400 bg-gray-100 flex flex-col">
            <div className="flex items-center justify-center pt-3 pb-1">
              <Truck className="h-12 w-16 text-gray-500" />
            </div>
            <div className="grid grid-cols-2 gap-0 flex-1 border-t border-gray-400">
              <div className="flex flex-col items-center justify-center border-r border-b border-gray-300 py-1">
                <span className="text-[10px] text-gray-500 font-semibold">Qtd Rotas</span>
                <span className="text-2xl font-black text-gray-900">{kpis.qtdRotas}</span>
              </div>
              <div className="flex flex-col items-center justify-center border-b border-gray-300 py-1">
                <span className="text-[10px] text-gray-500 font-semibold">Peso Carga (Kg)</span>
                <span className="text-2xl font-black text-gray-900">{kpis.pesoCargaKg.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</span>
              </div>
              <div className="flex flex-col items-center justify-center border-r border-gray-300 py-1">
                <span className="text-[10px] text-gray-500 font-semibold">Qtd Entregas</span>
                <span className="text-2xl font-black text-gray-900">{kpis.qtdEntregas}</span>
              </div>
              <div className="flex flex-col items-center justify-center py-1">
                <span className="text-[10px] text-gray-500 font-semibold">SLA (%)</span>
                <span className="text-2xl font-black text-gray-900">{kpis.slaPercent.toFixed(2)}%</span>
              </div>
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
          onClose={() => setModalNovaEntrega(false)}
          onCriado={handleNovaEntregaCriada}
        />
      )}
    </div>
  );
}

// ─── Modal Nova Entrega ──────────────────────────
function ModalNovaEntrega({ dataCarga, onClose, onCriado }: {
  dataCarga: string;
  onClose: () => void;
  onCriado: (pedido: PedidoCarga) => void;
}) {
  const { filialAtiva } = useAuth();
  const [clientes, setClientes]     = useState<any[]>([]);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [loading, setLoading]       = useState(false);
  const [salvando, setSalvando]     = useState(false);
  const [erro, setErro]             = useState('');

  // Campos do pedido
  const [clienteSel, setClienteSel] = useState<any>(null);
  const [volumes, setVolumes]       = useState('1');
  const [pesoKg, setPesoKg]         = useState('0');
  const [tipoFat, setTipoFat]      = useState('NFe');
  const [periodo, setPeriodo]       = useState('MANHA');
  const [regiao, setRegiao]         = useState('');
  const [observacoes, setObs]       = useState('');
  const [dataEntrega, setDataEntrega] = useState(dataCarga);

  // Busca clientes da API
  useEffect(() => {
    setLoading(true);
    api.get('/clientes', { params: { search: buscaCliente || undefined } })
      .then(r => setClientes(r.data))
      .catch(() => setClientes([]))
      .finally(() => setLoading(false));
  }, [buscaCliente]);

  const handleSalvar = async () => {
    if (!clienteSel) { setErro('Selecione um cliente.'); return; }
    if (!filialAtiva) { setErro('Nenhuma filial selecionada.'); return; }

    setSalvando(true);
    setErro('');
    try {
      const res = await api.post('/pedidos', {
        filialOrigemId: filialAtiva.id,
        clienteId: clienteSel.id,
        tipo: 'VENDA',
        dataEntrega,
        observacoes,
      });

      const pedido = res.data;
      const end: any = clienteSel.enderecoJson || {};
      const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Monta o objeto para a grade
      const novoPedido: PedidoCarga = {
        id: pedido.id,
        numero: pedido.numero,
        data: dataEntrega,
        liberadoEm: hora,
        nomeFantasia: clienteSel.nomeFantasia || clienteSel.razaoSocial,
        referencia: String(pedido.numero).padStart(5, '0'),
        volumes: parseInt(volumes) || 0,
        pesoKg: parseFloat(pesoKg).toFixed(1).replace('.', ','),
        empresa: 'Hetr.',
        tipoFaturamento: tipoFat,
        autorizacao: '',
        status: '',
        statusCarga: 'IMPRESSAO_PENDENTE',
        aurCargaOk: false,
        regiao: regiao || end.cidade || '',
        cep: end.cep || '',
        bairro: end.bairro || '',
        subRegiao: '',
        onda: 1,
        periodo: periodo as any,
        rota: '',
        recebimento: '',
        motorista: '',
        andamento: 0,
        valorTotal: 0,
        idMltvenda: '',
        idVenda: String(pedido.numero),
      };

      onCriado(novoPedido);
    } catch (e: any) {
      setErro(e.response?.data?.message || e.response?.data?.error?.message || 'Erro ao criar pedido.');
    } finally {
      setSalvando(false);
    }
  };

  const REGIOES = ['GUARULHOS', 'ZONA NORTE', 'ZONA SUL', 'ZONA OESTE', 'CENTRO', 'ARUJÁ', 'ZONA LESTE', 'ABC'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-300 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-green-600" />
            <h2 className="font-bold text-gray-900 text-sm">Nova Entrega / Pedido</h2>
          </div>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── Selecionar Cliente ── */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              <UserPlus className="h-3.5 w-3.5 inline mr-1" />
              Cliente *
            </label>

            {clienteSel ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-300 rounded-lg px-3 py-2">
                <div>
                  <p className="font-bold text-green-800 text-sm">{clienteSel.nomeFantasia || clienteSel.razaoSocial}</p>
                  <p className="text-xs text-green-600">{clienteSel.cnpjCpf} · {clienteSel.email}</p>
                </div>
                <button onClick={() => setClienteSel(null)} className="text-green-600 hover:text-red-600 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={buscaCliente}
                    onChange={e => setBuscaCliente(e.target.value)}
                    placeholder="Buscar cliente por nome ou CNPJ..."
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    autoFocus
                  />
                </div>
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                  ) : clientes.length === 0 ? (
                    <p className="text-center text-gray-400 text-xs py-4">Nenhum cliente encontrado.</p>
                  ) : (
                    clientes.slice(0, 30).map(c => (
                      <button
                        key={c.id}
                        onClick={() => setClienteSel(c)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.nomeFantasia || c.razaoSocial}</p>
                          <p className="text-xs text-gray-400">{c.cnpjCpf}</p>
                        </div>
                        <span className="text-xs text-blue-600">Selecionar</span>
                      </button>
                    ))
                  )}
                  {clientes.length > 30 && (
                    <p className="text-center text-xs text-gray-400 py-2">
                      Mostrando 30 de {clientes.length} — refine a busca
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Dados da Entrega ── */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Data Entrega</label>
              <input type="date" value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Período</label>
              <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="MANHA">MANHÃ</option>
                <option value="TARDE">TARDE</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Tipo Faturamento</label>
              <select value={tipoFat} onChange={e => setTipoFat(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="NFe">NF-e</option>
                <option value="Repo.">Repo.</option>
                <option value="NFC-e">NFC-e</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Volumes</label>
              <input type="number" min="0" value={volumes} onChange={e => setVolumes(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Peso (Kg)</label>
              <input type="number" step="0.1" min="0" value={pesoKg} onChange={e => setPesoKg(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Região</label>
              <select value={regiao} onChange={e => setRegiao(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {REGIOES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Observações</label>
            <input type="text" value={observacoes} onChange={e => setObs(e.target.value)} placeholder="Informações adicionais..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">{erro}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando || !clienteSel}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold disabled:opacity-40 flex items-center gap-1.5 transition-colors"
          >
            {salvando ? (
              <><span className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" /> Salvando...</>
            ) : (
              <><PlusCircle className="h-4 w-4" /> Criar Entrega</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
