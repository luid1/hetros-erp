import { useState, useCallback, useEffect } from 'react';
import {
  RefreshCw, Printer, Truck, CheckSquare, Square,
  ChevronDown, ChevronRight, RotateCcw, Trash2,
  PlusCircle, ShieldCheck, Eraser, Clock,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

// ─── Tipos ───────────────────────────────────────────────
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
  status: string;
  statusCarga: 'IMPRESSO' | 'IMPRESSAO_PENDENTE' | 'PEDIDO_ALTERADO' | 'AURCARGA_OK' | 'FINALIZADO';
  aurCargaOk: boolean;
  regiao: string;
  cep: string;
  bairro: string;
  subRegiao: string;
  onda: number;
  periodo: 'MANHA' | 'TARDE';
  rota: string | null;
  recebimento: string | null;
  motorista: string | null;
  andamento: number;
  valorTotal: number;
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
  horaInicio: string | null;
  slaPercent: number;
}

interface Totais {
  qtdRotas: number;
  pesoCargaKg: number;
  qtdEntregas: number;
  slaPercent: number;
}

// ─── Dados mock (idênticos à tela do NewOxxy) ──────────
const MOCK_PEDIDOS: PedidoCarga[] = [
  { id:'1', numero:29, data:'2026-06-26', liberadoEm:'10:25', nomeFantasia:'ALMENUT...', referencia:'00001', volumes:30, pesoKg:'35.6', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'IMPRESSAO_PENDENTE', aurCargaOk:false, regiao:'GUARULHOS', cep:'07021050', bairro:'VILA PEDR...', subRegiao:'SANTA RIT...', onda:1, periodo:'MANHA', rota:null, recebimento:'06:00', motorista:'CLIENTES D...', andamento:0, valorTotal:1200 },
  { id:'2', numero:29, data:'2026-06-26', liberadoEm:'12:03', nomeFantasia:'BOTECO...', referencia:'20856', volumes:1, pesoKg:'1.00', empresa:'Hetr.', tipoFaturamento:'Repo...', status:'CONFIRMADO', statusCarga:'IMPRESSAO_PENDENTE', aurCargaOk:false, regiao:'ZONA OESTE', cep:'05417001', bairro:'PINHEIROS', subRegiao:'PINHEIROS', onda:1, periodo:'MANHA', rota:null, recebimento:'07:30', motorista:'REDE TUY', andamento:1, valorTotal:450 },
  { id:'3', numero:29, data:'2026-06-26', liberadoEm:'12:04', nomeFantasia:'BOTECO...', referencia:'20856', volumes:22, pesoKg:'21.7', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'IMPRESSAO_PENDENTE', aurCargaOk:false, regiao:'ZONA OESTE', cep:'05417001', bairro:'PINHEIROS', subRegiao:'PINHEIROS', onda:1, periodo:'MANHA', rota:null, recebimento:'07:30', motorista:'REDE TUY', andamento:1, valorTotal:2100 },
  { id:'4', numero:29, data:'2026-06-26', liberadoEm:'08:11', nomeFantasia:'CEI BURIT...', referencia:'00472', volumes:472, pesoKg:'137...', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'IMPRESSAO_PENDENTE', aurCargaOk:false, regiao:'ZONA NORTE', cep:'02849020', bairro:'JARDIM GU...', subRegiao:'BRASILAND...', onda:1, periodo:'MANHA', rota:null, recebimento:'07:00', motorista:'ROJO - DOL...', andamento:1, valorTotal:4500 },
  { id:'5', numero:29, data:'2026-06-26', liberadoEm:'08:11', nomeFantasia:'CEI BURIT...', referencia:'00472', volumes:472, pesoKg:'137...', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'IMPRESSAO_PENDENTE', aurCargaOk:false, regiao:'ZONA NORTE', cep:'02849030', bairro:'JARDIM GU...', subRegiao:'BRASILAND...', onda:1, periodo:'MANHA', rota:null, recebimento:'07:00', motorista:'ROJO - DOL...', andamento:1, valorTotal:3200 },
  { id:'6', numero:29, data:'2026-06-26', liberadoEm:'10:47', nomeFantasia:'CICLO RO...', referencia:'00083', volumes:83, pesoKg:'77.0', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'IMPRESSO', aurCargaOk:false, regiao:'ZONA OESTE', cep:'05083010', bairro:'ALTO DA L...', subRegiao:'LAPA, PER...', onda:1, periodo:'MANHA', rota:null, recebimento:'07:00', motorista:'ROJO - DOL...', andamento:1, valorTotal:980 },
  { id:'7', numero:29, data:'2026-06-26', liberadoEm:'10:47', nomeFantasia:'CICLO RO...', referencia:'00083', volumes:83, pesoKg:'77.0', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'IMPRESSO', aurCargaOk:false, regiao:'ZONA OESTE', cep:'05083010', bairro:'ALTO DA L...', subRegiao:'LAPA, PER...', onda:1, periodo:'MANHA', rota:null, recebimento:'07:00', motorista:'ROJO - DOL...', andamento:1, valorTotal:1100 },
  { id:'8', numero:29, data:'2026-06-26', liberadoEm:'13:11', nomeFantasia:'COLONIAL...', referencia:'00062', volumes:62, pesoKg:'50.7', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'IMPRESSO', aurCargaOk:false, regiao:'ZONA SUL', cep:'04608002', bairro:'CAMPO BE...', subRegiao:'BROOKLIN', onda:1, periodo:'MANHA', rota:null, recebimento:'05:40', motorista:'CLIENTES D...', andamento:0, valorTotal:760 },
  { id:'9', numero:29, data:'2026-06-26', liberadoEm:'07:25', nomeFantasia:'COMUNID...', referencia:'00087', volumes:87, pesoKg:'97.3', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'IMPRESSO', aurCargaOk:false, regiao:'ZONA SUL', cep:'04545001', bairro:'VILA OLIM...', subRegiao:'BROOKLIN', onda:1, periodo:'MANHA', rota:null, recebimento:'05:40', motorista:'CLIENTES D...', andamento:0, valorTotal:1340 },
  { id:'10', numero:26, data:'2026-06-26', liberadoEm:'14:45', nomeFantasia:'CONSUM...', referencia:'ROSA...', volumes:1, pesoKg:'14.0', empresa:'Hetr.', tipoFaturamento:'NFe', status:'FATURADO', statusCarga:'AURCARGA_OK', aurCargaOk:true, regiao:'ZONA OESTE', cep:'05316900', bairro:'VILA LEOP...', subRegiao:'VILA LEOP...', onda:1, periodo:'TARDE', rota:null, recebimento:'10:00', motorista:'CLIENTES D...', andamento:0, valorTotal:320 },
  { id:'11', numero:29, data:'2026-06-26', liberadoEm:'10:39', nomeFantasia:'CRFF PIZZ...', referencia:'00090', volumes:90, pesoKg:'82.3', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'IMPRESSAO_PENDENTE', aurCargaOk:false, regiao:'GUARULHOS', cep:'07190100', bairro:'AEROPORTO', subRegiao:'HELIO SMID...', onda:1, periodo:'MANHA', rota:null, recebimento:null, motorista:'CRFF PIZZA...', andamento:0, valorTotal:2800 },
  { id:'12', numero:29, data:'2026-06-26', liberadoEm:'15:37', nomeFantasia:'DOLCISSI...', referencia:'00152', volumes:152, pesoKg:'160...', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'IMPRESSO', aurCargaOk:false, regiao:'ZONA SUL', cep:'04039034', bairro:'VILA CLEM...', subRegiao:'VILA MARIA', onda:1, periodo:'TARDE', rota:null, recebimento:'07:00', motorista:'ROJO - DOL...', andamento:1, valorTotal:3600 },
  { id:'13', numero:29, data:'2026-06-26', liberadoEm:'07:46', nomeFantasia:'ESCOLA E...', referencia:'00001', volumes:1, pesoKg:'1.70', empresa:'Hetr.', tipoFaturamento:'Repo...', status:'CONFIRMADO', statusCarga:'IMPRESSO', aurCargaOk:false, regiao:'ZONA SUL', cep:'05097000', bairro:'AEROPORTO', subRegiao:'', onda:1, periodo:'MANHA', rota:null, recebimento:'07:00', motorista:'ROJO - DOL...', andamento:1, valorTotal:120 },
  { id:'14', numero:29, data:'2026-06-26', liberadoEm:'14:45', nomeFantasia:'ESCOLA E...', referencia:'00064', volumes:64, pesoKg:'39.1', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'IMPRESSO', aurCargaOk:false, regiao:'ZONA OESTE', cep:'05097000', bairro:'BELA ALIA...', subRegiao:'LAPA, PER...', onda:1, periodo:'TARDE', rota:null, recebimento:'07:00', motorista:'ROJO - DOL...', andamento:1, valorTotal:890 },
  { id:'15', numero:29, data:'2026-06-26', liberadoEm:'08:11', nomeFantasia:'ESCOLA R...', referencia:'00140', volumes:140, pesoKg:'60.0', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'PEDIDO_ALTERADO', aurCargaOk:false, regiao:'ZONA OESTE', cep:'05089010', bairro:'VILA LEOP...', subRegiao:'LAPA, PER...', onda:1, periodo:'MANHA', rota:null, recebimento:'07:00', motorista:'ROJO - DOL...', andamento:1, valorTotal:1560 },
  { id:'16', numero:29, data:'2026-06-26', liberadoEm:'14:50', nomeFantasia:'ESCOLA R...', referencia:'00116', volumes:116, pesoKg:'51.1', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'PEDIDO_ALTERADO', aurCargaOk:false, regiao:'ZONA OESTE', cep:'05085000', bairro:'BELA ALIA...', subRegiao:'LAPA, PER...', onda:1, periodo:'TARDE', rota:null, recebimento:'07:00', motorista:'ROJO - DOL...', andamento:1, valorTotal:1230 },
  { id:'17', numero:29, data:'2026-06-26', liberadoEm:'14:14', nomeFantasia:'ESCOLA S...', referencia:'00049', volumes:49, pesoKg:'47.2', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'IMPRESSO', aurCargaOk:false, regiao:'ZONA SUL', cep:'05352020', bairro:'CIDADE SA...', subRegiao:'VILA LEOP', onda:1, periodo:'TARDE', rota:null, recebimento:null, motorista:'ROJO - DOL...', andamento:0, valorTotal:670 },
  { id:'18', numero:29, data:'2026-06-26', liberadoEm:'09:28', nomeFantasia:'ESPORTE...', referencia:'00168', volumes:168, pesoKg:'199...', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'IMPRESSO', aurCargaOk:false, regiao:'CENTRO', cep:'01455902', bairro:'JARDIM EU...', subRegiao:'', onda:1, periodo:'MANHA', rota:null, recebimento:'07:00', motorista:'ESPORTE C...', andamento:0, valorTotal:4200 },
  { id:'19', numero:29, data:'2026-06-26', liberadoEm:'13:47', nomeFantasia:'FATTORIA...', referencia:'00039', volumes:39, pesoKg:'39.8', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'IMPRESSO', aurCargaOk:false, regiao:'CENTRO', cep:'01413000', bairro:'CERQUEIR...', subRegiao:'CERQUEIR...', onda:1, periodo:'TARDE', rota:null, recebimento:'07:00', motorista:'RASCAL', andamento:0, valorTotal:870 },
  { id:'20', numero:29, data:'2026-06-26', liberadoEm:'11:34', nomeFantasia:'GRAND H...', referencia:'00134', volumes:134, pesoKg:'75.0', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'IMPRESSO', aurCargaOk:false, regiao:'ZONA SUL', cep:'04583110', bairro:'VILA CORD...', subRegiao:'BROOKLIN', onda:1, periodo:'MANHA', rota:null, recebimento:'07:00', motorista:'GRAND HYA...', andamento:0, valorTotal:2100 },
  { id:'21', numero:29, data:'2026-06-26', liberadoEm:'07:46', nomeFantasia:'HOSPITAL...', referencia:'00539', volumes:539, pesoKg:'205...', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'IMPRESSO', aurCargaOk:false, regiao:'ARUJÁ', cep:'07402000', bairro:'CENTRO', subRegiao:'DIOMAR FE...', onda:1, periodo:'MANHA', rota:null, recebimento:null, motorista:'TODAS COZ...', andamento:0, valorTotal:8900 },
  { id:'22', numero:29, data:'2026-06-26', liberadoEm:'07:46', nomeFantasia:'HOSPITAL...', referencia:'00539', volumes:539, pesoKg:'205...', empresa:'Hetr.', tipoFaturamento:'NFe', status:'CONFIRMADO', statusCarga:'IMPRESSO', aurCargaOk:false, regiao:'ARUJÁ', cep:'07402015', bairro:'CENTRO', subRegiao:'MARIA DE L...', onda:1, periodo:'MANHA', rota:null, recebimento:null, motorista:'TODAS COZ...', andamento:0, valorTotal:7800 },
];

const MOCK_ROTAS: RotaMotorista[] = [
  { id:'r1', numero:3519, motorista:'ANDRE LUIZ CELESTINO', tipoVeiculo:'VAN', refrigerado:false, pesoKg:591.1, qtdEntregas:4, periodo:'MANHA', horaInicio:'07:30', slaPercent:0 },
  { id:'r2', numero:3515, motorista:'ELINALDO TAVARES DE', tipoVeiculo:'KOMBI', refrigerado:false, pesoKg:1155.5, qtdEntregas:7, periodo:'MANHA', horaInicio:'07:30', slaPercent:0 },
  { id:'r3', numero:3189, motorista:'ELTON DE OLIVEIRA CO', tipoVeiculo:'VAN REFRIGERADA', refrigerado:true, pesoKg:819.7, qtdEntregas:5, periodo:'MANHA', horaInicio:null, slaPercent:0 },
  { id:'r4', numero:3518, motorista:'GENIVAL BEZERRA DOS', tipoVeiculo:'KOMBI', refrigerado:false, pesoKg:300.2, qtdEntregas:3, periodo:'MANHA', horaInicio:null, slaPercent:0 },
  { id:'r5', numero:3518, motorista:'GENIVAL BEZERRA DOS', tipoVeiculo:'KOMBI', refrigerado:false, pesoKg:508.9, qtdEntregas:4, periodo:'MANHA', horaInicio:null, slaPercent:0 },
  { id:'r6', numero:3195, motorista:'HENRIQUE SILVA DOS A', tipoVeiculo:'MINI-VAN', refrigerado:false, pesoKg:272.7, qtdEntregas:3, periodo:'MANHA', horaInicio:null, slaPercent:0 },
  { id:'r7', numero:3195, motorista:'JEFERSON DE ALMEIDA', tipoVeiculo:'MINI-VAN', refrigerado:false, pesoKg:287.8, qtdEntregas:2, periodo:'MANHA', horaInicio:null, slaPercent:0 },
  { id:'r8', numero:3186, motorista:'MILTON SANTOS', tipoVeiculo:'VAN', refrigerado:false, pesoKg:947.8, qtdEntregas:6, periodo:'MANHA', horaInicio:null, slaPercent:0 },
  { id:'r9', numero:3201, motorista:'MILTON SANTOS', tipoVeiculo:'VAN', refrigerado:false, pesoKg:1424.5, qtdEntregas:8, periodo:'TARDE', horaInicio:null, slaPercent:0 },
  { id:'r10', numero:3519, motorista:'SIDNEY FERNANDO TEIX', tipoVeiculo:'VAN', refrigerado:false, pesoKg:51.8, qtdEntregas:1, periodo:'MANHA', horaInicio:null, slaPercent:0 },
  { id:'r11', numero:3196, motorista:'SIDNEY FERNANDO TEIX', tipoVeiculo:'VAN', refrigerado:false, pesoKg:1342.6, qtdEntregas:7, periodo:'TARDE', horaInicio:null, slaPercent:0 },
  { id:'r12', numero:3512, motorista:'WILLIAN EUFRORSINO A', tipoVeiculo:'VAN', refrigerado:false, pesoKg:342.3, qtdEntregas:3, periodo:'MANHA', horaInicio:null, slaPercent:0 },
  { id:'r13', numero:3190, motorista:'WILLIAN EUFRORSINO A', tipoVeiculo:'VAN', refrigerado:false, pesoKg:634.4, qtdEntregas:4, periodo:'MANHA', horaInicio:null, slaPercent:0 },
  { id:'r14', numero:3518, motorista:'WILSON LUIZ DE OLIVE', tipoVeiculo:'VAN', refrigerado:false, pesoKg:350.5, qtdEntregas:3, periodo:'MANHA', horaInicio:null, slaPercent:0 },
];

// ─── Cores por statusCarga ────────────────────────────────
function getRowStyle(p: PedidoCarga, selected: boolean): string {
  if (selected) return 'bg-blue-600 text-white';
  switch (p.statusCarga) {
    case 'IMPRESSAO_PENDENTE': return 'bg-red-600 text-white hover:bg-red-700';
    case 'PEDIDO_ALTERADO':    return 'bg-gray-900 text-white hover:bg-gray-800';
    case 'AURCARGA_OK':        return 'bg-green-600 text-white hover:bg-green-700';
    case 'FINALIZADO':         return 'bg-blue-800 text-white hover:bg-blue-900';
    default:                   return 'bg-white text-gray-800 hover:bg-gray-50';
  }
}

// ─── Componente principal ─────────────────────────────────
export default function ControleCarga() {
  const { filialAtiva } = useAuth();
  const hoje = new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-');
  // Exibe no formato DD/MM/AAAA
  const hojeDisplay = new Date().toLocaleDateString('pt-BR');

  const [dataCarga,  setDataCarga]  = useState(hojeDisplay);
  const [dataEntrega,setDataEntrega]= useState('');
  const [segmento,   setSegmento]   = useState('0-Todos');
  const [pedidos,    setPedidos]    = useState<PedidoCarga[]>(MOCK_PEDIDOS);
  const [rotas,      setRotas]      = useState<RotaMotorista[]>(MOCK_ROTAS);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [pedidoDetalhe, setPedidoDetalhe] = useState<PedidoCarga | null>(null);
  const [rotaExpandida, setRotaExpandida] = useState<string | null>(null);
  const [abaRota, setAbaRota] = useState<'rotas' | 'horario'>('rotas');

  // Filtros
  const [rotaPendente,      setRotaPendente]      = useState(true);
  const [somenteEscolas,    setSomenteEscolas]    = useState(false);
  const [mostrarFinalizados,setMostrarFinalizados]= useState(false);
  const [mostrarGrade,      setMostrarGrade]      = useState(false);

  const totais = {
    qtdRotas:    rotas.length,
    pesoCargaKg: 0,
    qtdEntregas: 0,
    slaPercent:  0,
  };

  const toggleSelect = (id: string) =>
    setSelecionados(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelecionados(selecionados.size === pedidos.length ? new Set() : new Set(pedidos.map(p => p.id)));

  const handleAutorizar = () => {
    setPedidos(prev => prev.map(p =>
      selecionados.has(p.id) ? { ...p, aurCargaOk: true, statusCarga: 'AURCARGA_OK' } : p
    ));
    setSelecionados(new Set());
  };

  const handleLimpar = () => {
    setPedidos(MOCK_PEDIDOS);
    setSelecionados(new Set());
    setPedidoDetalhe(null);
  };

  const veicoloLabel = (r: RotaMotorista) => {
    const tip = r.tipoVeiculo.toUpperCase();
    if (tip.includes('REFRIG')) return 'VAN REFRIGERA';
    return tip;
  };

  // Aplica filtros aos pedidos
  const pedidosFiltrados = pedidos.filter(p => {
    if (somenteEscolas && !p.nomeFantasia.toUpperCase().includes('ESCOLA')) return false;
    if (rotaPendente && p.motorista !== null && p.statusCarga === 'FINALIZADO') return false;
    if (!mostrarFinalizados && p.statusCarga === 'FINALIZADO') return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-gray-100 text-xs select-none overflow-hidden">

      {/* ── Barra de filtros ── */}
      <div className="bg-gray-200 border-b border-gray-400 px-2 py-1 flex flex-wrap items-center gap-2 shrink-0">
        {/* Segmento */}
        <div className="flex items-center gap-1">
          <span className="text-gray-700 font-medium">Segmento:</span>
          <select
            value={segmento}
            onChange={e => setSegmento(e.target.value)}
            className="border border-gray-400 bg-white text-xs px-1 py-0.5 rounded"
          >
            <option>0-Todos</option>
            <option>1-Escolas</option>
            <option>2-Restaurantes</option>
            <option>3-Hospitais</option>
          </select>
        </div>

        <div className="w-px h-4 bg-gray-400" />

        {/* Checkboxes */}
        {[
          { label: 'Atualizar Lista',           icon: <RefreshCw className="h-3 w-3" />, action: () => {} },
        ].map((btn) => (
          <button key={btn.label} onClick={btn.action} className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-gray-50 px-2 py-0.5 rounded text-gray-700">
            {btn.icon} {btn.label}
          </button>
        ))}

        <label className="flex items-center gap-1 cursor-pointer text-gray-700">
          <input type="checkbox" checked={mostrarFinalizados} onChange={e => setMostrarFinalizados(e.target.checked)} className="accent-blue-600" />
          Mostrar Pedidos Finalizados
        </label>
        <label className="flex items-center gap-1 cursor-pointer text-gray-700">
          <input type="checkbox" checked={mostrarGrade} onChange={e => setMostrarGrade(e.target.checked)} className="accent-blue-600" />
          Mostrar grade de produtos
        </label>
        <label className="flex items-center gap-1 cursor-pointer text-gray-700 font-semibold">
          <input type="checkbox" checked={rotaPendente} onChange={e => setRotaPendente(e.target.checked)} className="accent-blue-600" />
          ✔ Rota Pendente
        </label>
        <label className="flex items-center gap-1 cursor-pointer text-gray-700">
          <input type="checkbox" checked={somenteEscolas} onChange={e => setSomenteEscolas(e.target.checked)} className="accent-blue-600" />
          Somente Escolas
        </label>

        <div className="w-px h-4 bg-gray-400" />

        <button className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-blue-50 px-2 py-0.5 rounded text-blue-700 font-semibold">
          <RotateCcw className="h-3 w-3" /> Rotear
        </button>
        <button className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-gray-50 px-2 py-0.5 rounded text-gray-700">
          <Printer className="h-3 w-3" /> Imprimir Selecionados
        </button>
        <button className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-gray-50 px-2 py-0.5 rounded text-gray-700">
          Permitir Desconto no Frete
        </button>
      </div>

      {/* ── Data carga ── */}
      <div className="bg-gray-200 border-b border-gray-400 px-2 py-1 flex items-center gap-4 shrink-0 text-gray-700">
        <div className="flex items-center gap-1">
          <span className="font-semibold">Carga:</span>
          <input
            type="text"
            value={dataCarga}
            onChange={e => setDataCarga(e.target.value)}
            className="border border-gray-400 bg-white text-xs px-1 py-0.5 rounded w-24 font-mono"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="font-semibold">Entrega:</span>
          <input
            type="text"
            placeholder="/ /"
            value={dataEntrega}
            onChange={e => setDataEntrega(e.target.value)}
            className="border border-gray-400 bg-white text-xs px-1 py-0.5 rounded w-20 font-mono"
          />
          <span className="text-gray-400">...</span>
        </div>

        {/* Legenda de cores */}
        <div className="flex items-center gap-3 ml-4">
          <span className="flex items-center gap-1">
            <span className="h-3 w-8 inline-block bg-gray-300 border border-gray-500" />
            <span>Impresso</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-8 inline-block bg-red-600 border border-red-700" />
            <span>Impressão Pendente</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-8 inline-block bg-gray-900 border border-gray-700" />
            <span className="text-gray-800">Pedido Alterado</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-8 inline-block bg-green-600 border border-green-700" />
            <span>AurCarga Ok</span>
          </span>
        </div>
      </div>

      {/* ── Área principal: grade + painel rotas ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Grade de pedidos (esquerda) ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-[11px]" style={{ minWidth: 900 }}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-300 border-b-2 border-gray-500">
                  <th className="w-5 px-1 py-0.5 border-r border-gray-400">
                    <input type="checkbox"
                      checked={selecionados.size === pedidosFiltrados.length && pedidosFiltrados.length > 0}
                      onChange={toggleAll}
                      className="accent-blue-600"
                    />
                  </th>
                  {['Da...','I...','Nome Fanta...','Refere...','Libe...','Vols','Peso','Emp...','Tipo de Fatur...','Autor...','Status','Região','CEP','Bairro','Sub-Região','Onda','Período','Rota','Recebi...','Motorista','Andamento'].map((h) => (
                    <th key={h} className="px-1 py-0.5 text-left font-semibold text-gray-800 border-r border-gray-400 whitespace-nowrap cursor-pointer hover:bg-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((p) => {
                  const sel = selecionados.has(p.id);
                  const style = getRowStyle(p, sel);
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-gray-300 cursor-pointer ${style}`}
                      onClick={() => { toggleSelect(p.id); setPedidoDetalhe(p); }}
                    >
                      <td className="px-1 text-center border-r border-gray-400/50">
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggleSelect(p.id)}
                          onClick={e => e.stopPropagation()}
                          className="accent-blue-400"
                        />
                      </td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30">{new Date(p.data).getDate()}.</td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30">1.</td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30 max-w-[110px] truncate">{p.nomeFantasia}</td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30">{p.referencia}</td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30">{p.liberadoEm}</td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30 text-right">{p.volumes}</td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30 text-right">{p.pesoKg}</td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30">{p.empresa}</td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30">
                        <span className={`px-1 rounded text-[10px] font-bold ${p.tipoFaturamento === 'NFe' ? (sel ? 'bg-blue-400' : 'bg-yellow-200 text-yellow-900') : ''}`}>
                          {p.tipoFaturamento}
                        </span>
                      </td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30"></td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30">
                        {p.status === 'FATURADO' ? <span className="font-bold">FIN</span> : ''}
                      </td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30 max-w-[90px] truncate font-semibold">{p.regiao}</td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30 font-mono">{p.cep}</td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30 max-w-[80px] truncate">{p.bairro}</td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30 max-w-[90px] truncate">{p.subRegiao}</td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30 text-center">{p.onda}</td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30">
                        <span className={`px-1 rounded text-[10px] font-bold ${p.periodo === 'MANHA' ? (sel ? '' : 'text-blue-800') : (sel ? '' : 'text-orange-700')}`}>
                          {p.periodo === 'MANHA' ? 'MANHÃ' : 'TARDE'}
                        </span>
                      </td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30"></td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30">{p.recebimento}</td>
                      <td className="px-1 whitespace-nowrap border-r border-gray-400/30 max-w-[100px] truncate">{p.motorista}</td>
                      <td className="px-1 whitespace-nowrap text-center">{p.andamento}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Rodapé da grade */}
          <div className="bg-gray-200 border-t border-gray-400 px-2 py-0.5 flex items-center gap-6 shrink-0 text-gray-700">
            <span>Registros na...<strong className="ml-1">{pedidosFiltrados.length}</strong></span>
            <span>12...</span>
            <span>10.39...</span>
          </div>
        </div>

        {/* ── Painel de Rotas (direita) ── */}
        <div className="w-72 shrink-0 border-l-2 border-gray-400 flex flex-col bg-gray-50">
          {/* Abas */}
          <div className="flex border-b border-gray-400 bg-gray-200 shrink-0">
            {(['rotas', 'horario'] as const).map(aba => (
              <button
                key={aba}
                onClick={() => setAbaRota(aba)}
                className={`flex-1 py-1 text-xs font-medium border-r border-gray-400 last:border-r-0 transition-colors ${abaRota === aba ? 'bg-white text-blue-700 border-b-2 border-b-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {aba === 'rotas' ? 'Rotas' : 'Carga por Horário'}
              </button>
            ))}
          </div>

          {/* Busca */}
          <div className="px-2 py-1 border-b border-gray-300 shrink-0 flex items-center gap-1">
            <span className="text-gray-600">Pesquisar:</span>
            <input className="flex-1 border border-gray-400 text-xs px-1 py-0.5 rounded bg-white" />
          </div>

          {/* Árvore de rotas */}
          <div className="flex-1 overflow-y-auto">
            {/* Cabeçalho Entregas Programadas */}
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-200 border-b border-gray-300 font-semibold text-gray-800 text-[11px]">
              <ChevronDown className="h-3 w-3 text-gray-600" />
              <Truck className="h-3 w-3 text-blue-600" />
              <span>Entregas Programadas</span>
            </div>

            {rotas.map((r) => (
              <div
                key={r.id}
                className={`border-b border-gray-200 cursor-pointer transition-colors ${rotaExpandida === r.id ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                onClick={() => setRotaExpandida(rotaExpandida === r.id ? null : r.id)}
              >
                <div className="flex items-center gap-1 px-2 py-1 text-[11px]">
                  <span className="text-gray-400 w-3">{rotaExpandida === r.id ? '▾' : '▸'}</span>
                  <Truck className={`h-3 w-3 shrink-0 ${r.refrigerado ? 'text-cyan-600' : 'text-gray-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="font-semibold text-gray-800 truncate" style={{maxWidth:130}}>{r.motorista}</span>
                      <span className={`text-[9px] font-bold px-1 rounded ${r.refrigerado ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-200 text-gray-600'}`}>
                        {veicoloLabel(r)}
                      </span>
                    </div>
                    <div className="text-gray-500 mt-0.5">
                      {r.pesoKg.toFixed(2)}Kg &nbsp;–&nbsp; {r.numero}
                    </div>
                  </div>
                  {r.horaInicio && (
                    <span className="text-[10px] text-gray-500 shrink-0">{r.horaInicio}</span>
                  )}
                </div>

                {/* Detalhe expandido */}
                {rotaExpandida === r.id && (
                  <div className="bg-blue-50 px-4 py-1 text-[10px] text-gray-600 space-y-0.5 border-t border-blue-200">
                    <div>Rota nº: <strong>{r.numero}</strong></div>
                    <div>Veículo: <strong>{r.tipoVeiculo}</strong>{r.refrigerado && ' ❄️'}</div>
                    <div>Entregas: <strong>{r.qtdEntregas}</strong></div>
                    <div>Peso: <strong>{r.pesoKg.toFixed(2)} kg</strong></div>
                    <div>Período: <strong>{r.periodo}</strong></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Painel inferior: Entregas ── */}
      <div className="shrink-0 border-t-2 border-gray-400" style={{ height: 180 }}>
        <div className="bg-gray-200 border-b border-gray-400 px-2 py-0.5 font-semibold text-gray-800 text-[11px]">
          Entregas
        </div>

        <div className="flex h-full">
          {/* Tabela de entregas */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead className="bg-gray-300 sticky top-0">
                <tr>
                  {['Data Entrega','Rota','Nome Fantasia','Id Mltvenda','Id Venda','Volumes','Peso Total','Empresa','Tipo Faturamento','Vlr Tot Pedido','Autorização de Carga'].map(h => (
                    <th key={h} className="px-2 py-0.5 text-left font-semibold text-gray-700 border-r border-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidoDetalhe ? (
                  <tr className="bg-blue-50 border-b border-gray-200">
                    <td className="px-2 py-1 border-r border-gray-300 whitespace-nowrap">{new Date(pedidoDetalhe.data).toLocaleDateString('pt-BR')}</td>
                    <td className="px-2 py-1 border-r border-gray-300">{pedidoDetalhe.rota || ''}</td>
                    <td className="px-2 py-1 border-r border-gray-300">{pedidoDetalhe.nomeFantasia}</td>
                    <td className="px-2 py-1 border-r border-gray-300"></td>
                    <td className="px-2 py-1 border-r border-gray-300">{pedidoDetalhe.numero}</td>
                    <td className="px-2 py-1 border-r border-gray-300 text-right">{pedidoDetalhe.volumes}</td>
                    <td className="px-2 py-1 border-r border-gray-300 text-right">{pedidoDetalhe.pesoKg}</td>
                    <td className="px-2 py-1 border-r border-gray-300">{pedidoDetalhe.empresa}</td>
                    <td className="px-2 py-1 border-r border-gray-300">{pedidoDetalhe.tipoFaturamento}</td>
                    <td className="px-2 py-1 border-r border-gray-300 text-right">{pedidoDetalhe.valorTotal.toFixed(2)}</td>
                    <td className="px-2 py-1">{pedidoDetalhe.aurCargaOk ? '✔' : ''}</td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={11} className="px-4 py-4 text-center text-gray-400 italic">
                      Nenhum Registro Encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Painel de totais (canto inferior direito) */}
          <div className="w-72 shrink-0 border-l-2 border-gray-400 bg-gray-100 flex flex-col">
            {/* Ícone caminhão */}
            <div className="flex items-center justify-center pt-2 pb-1">
              <div className="relative">
                <Truck className="h-10 w-14 text-gray-600" />
              </div>
            </div>

            {/* Grid de KPIs */}
            <div className="grid grid-cols-2 gap-0 flex-1 border-t border-gray-400">
              <div className="flex flex-col items-center justify-center border-r border-b border-gray-400 py-1">
                <span className="text-[10px] text-gray-500 font-medium">Qtd Rotas</span>
                <span className="text-xl font-bold text-gray-900">{totais.qtdRotas}</span>
              </div>
              <div className="flex flex-col items-center justify-center border-b border-gray-400 py-1">
                <span className="text-[10px] text-gray-500 font-medium">Peso Carga (Kg)</span>
                <span className="text-xl font-bold text-gray-900">{totais.pesoCargaKg.toFixed(3)}</span>
              </div>
              <div className="flex flex-col items-center justify-center border-r border-gray-400 py-1">
                <span className="text-[10px] text-gray-500 font-medium">Qtd Entregas</span>
                <span className="text-xl font-bold text-gray-900">{totais.qtdEntregas}</span>
              </div>
              <div className="flex flex-col items-center justify-center py-1">
                <span className="text-[10px] text-gray-500 font-medium">SLA (%)</span>
                <span className={`text-xl font-bold ${totais.slaPercent >= 95 ? 'text-green-600' : totais.slaPercent >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {totais.slaPercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Botões de ação (rodapé) ── */}
      <div className="shrink-0 bg-gray-200 border-t border-gray-400 px-2 py-1 flex items-center gap-2">
        <button
          onClick={() => { if (pedidoDetalhe) setSelecionados(new Set()); }}
          className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-red-50 hover:text-red-700 px-3 py-1 rounded text-gray-700 font-medium"
        >
          <Trash2 className="h-3 w-3" /> Remover Linha
        </button>
        <button className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-gray-50 px-3 py-1 rounded text-gray-700 font-medium">
          <Printer className="h-3 w-3" /> Imprimir Bilhete
        </button>
        <button className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-green-50 hover:text-green-700 px-3 py-1 rounded text-gray-700 font-medium">
          <PlusCircle className="h-3 w-3" /> Nova Entrega
        </button>
        <button
          onClick={handleAutorizar}
          className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-blue-50 hover:text-blue-700 px-3 py-1 rounded text-gray-700 font-medium"
        >
          <ShieldCheck className="h-3 w-3" /> Incluir na Autorização
        </button>
        <button
          onClick={handleLimpar}
          className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-gray-50 px-3 py-1 rounded text-gray-700 font-medium"
        >
          <Eraser className="h-3 w-3" /> Limpar a Grade
        </button>

        {/* Contadores */}
        <div className="ml-auto flex items-center gap-4 text-gray-600">
          <span>Entregas: <strong>0</strong></span>
          <span className="font-mono">0,000</span>
          <span className="font-mono">0,00</span>
          {selecionados.size > 0 && (
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
              {selecionados.size} selecionado{selecionados.size !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
