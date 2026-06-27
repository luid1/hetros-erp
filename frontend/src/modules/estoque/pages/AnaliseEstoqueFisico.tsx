import { useState, useMemo } from 'react';
import { CheckCircle, Printer, Download, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

// ─── Tipos ───────────────────────────────────────
interface ProdutoEstoque {
  id: string;
  codigo: string;
  descricao: string;
  familia: string;
  saldoInicial: number;
  entradas: number;
  ordensCompra: number;
  saidas: number;
  saldoFinal: number;
  undEstoque: string;
  contagemFisica: number | null;
  diferencaEstoque: number;
  precoCusto: number;
  valorAtualEstoque: number;
}

interface Movimentacao {
  idDfe: string;
  nomeCliente: string;
  natureza: string;
  observacoes: string;
  dataHoraVenda: string;
  dataEntrega: string;
  qtdeApuracao: number;
  unidadeApuracao: string;
  vlrTotalVenda: number;
  qtdeConvertida: number;
  unidadeConvertida: string;
  precoMedio: number;
  status: number;
}

// ─── Famílias do NewOxxy ─────────────────────────
const FAMILIAS = [
  '<Todas>', 'BCA', 'Chas e Temperos', 'Citricos', 'Congelados',
  'Diversos', 'Embalado', 'Embalagem', 'Flores e Plantas', 'Folhagem',
  'Fruta', 'Legumes', 'Ovos', 'Processados', 'Verdura',
];

const GRUPOS = ['<Todas>', 'Grupo A', 'Grupo B', 'Grupo C'];

// ─── Mock de produtos (idêntico ao screenshot) ──
const MOCK_PRODUTOS: ProdutoEstoque[] = [
  { id:'1',  codigo:'ALHOC',   descricao:'ALHO',                   familia:'BCA', saldoInicial:0,       entradas:233.810, ordensCompra:0,       saidas:-85.500,   saldoFinal:148.310, undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:12.13, valorAtualEstoque:1799.00 },
  { id:'2',  codigo:'ALPD',    descricao:'ALHO DESCASCADO',        familia:'BCA', saldoInicial:0,       entradas:21.900,  ordensCompra:200.000, saidas:-100.000,  saldoFinal:121.900, undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:13.00, valorAtualEstoque:1584.70 },
  { id:'3',  codigo:'BAT25',   descricao:'BATATA ASTERIX',         familia:'BCA', saldoInicial:0,       entradas:147.850, ordensCompra:360.000, saidas:-228.000,  saldoFinal:279.850, undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:6.25,  valorAtualEstoque:1749.06 },
  { id:'4',  codigo:'BATB25',  descricao:'BATATA BOLINHA',         familia:'BCA', saldoInicial:0,       entradas:167.600, ordensCompra:288.000, saidas:-282.000,  saldoFinal:173.600, undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:3.75,  valorAtualEstoque:651.00 },
  { id:'5',  codigo:'BATN',    descricao:'BATATA LAVADA',          familia:'BCA', saldoInicial:0,       entradas:21.550,  ordensCompra:240.000, saidas:-408.300,  saldoFinal:146.750, undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:5.42,  valorAtualEstoque:-795.39 },
  { id:'6',  codigo:'BATFLO',  descricao:'BATATA LAVADA FLORAO',   familia:'BCA', saldoInicial:0,       entradas:151.900, ordensCompra:120.000, saidas:-110.000,  saldoFinal:161.900, undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:6.02,  valorAtualEstoque:974.64 },
  { id:'7',  codigo:'BATM',    descricao:'BATATA MARQUISE CESAR',  familia:'BCA', saldoInicial:0,       entradas:-78.000, ordensCompra:0,       saidas:0,         saldoFinal:-78.000, undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:6.37,  valorAtualEstoque:-496.86 },
  { id:'8',  codigo:'CEBGRA3', descricao:'CEBOLA CX3',            familia:'BCA', saldoInicial:0,       entradas:124.000, ordensCompra:0,       saidas:-75.000,   saldoFinal:49.000,  undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:4.71,  valorAtualEstoque:230.79 },
  { id:'9',  codigo:'CEBGRA4', descricao:'CEBOLA CX4',            familia:'BCA', saldoInicial:0,       entradas:-285.550,ordensCompra:950.000, saidas:-838.900,  saldoFinal:-174.450,undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:4.21,  valorAtualEstoque:-734.43 },
  { id:'10', codigo:'CEBECHA', descricao:'CEBOLA ECHALOTE',        familia:'BCA', saldoInicial:0,       entradas:53.000,  ordensCompra:0,       saidas:-0.500,    saldoFinal:52.500,  undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:7.36,  valorAtualEstoque:386.40 },
  { id:'11', codigo:'CEBOPI',  descricao:'CEBOLA PIRULITO',        familia:'BCA', saldoInicial:0,       entradas:3.600,   ordensCompra:0,       saidas:0,         saldoFinal:3.600,   undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:4.00,  valorAtualEstoque:14.40 },
  { id:'12', codigo:'CEBR',    descricao:'CEBOLA ROXA CX3',       familia:'BCA', saldoInicial:0,       entradas:692.300, ordensCompra:380.000, saidas:-112.450,  saldoFinal:959.850, undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:5.79,  valorAtualEstoque:5557.53 },
  { id:'13', codigo:'CRX',     descricao:'CEBOLA ROXA CX4',       familia:'BCA', saldoInicial:0,       entradas:61.400,  ordensCompra:76.000,  saidas:-62.000,   saldoFinal:75.400,  undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:4.74,  valorAtualEstoque:357.40 },
  { id:'14', codigo:'COS',     descricao:'COCO SECO',              familia:'BCA', saldoInicial:0,       entradas:43.880,  ordensCompra:0,       saidas:-1.330,    saldoFinal:42.550,  undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:3.23,  valorAtualEstoque:137.64 },
  { id:'15', codigo:'MANDV',   descricao:'MANDIOCA A VACUO',       familia:'BCA', saldoInicial:0,       entradas:49.000,  ordensCompra:0,       saidas:-5.000,    saldoFinal:44.000,  undEstoque:'PC', contagemFisica:null, diferencaEstoque:0, precoCusto:4.90,  valorAtualEstoque:215.60 },
  // Frutas
  { id:'16', codigo:'ABAC',    descricao:'ABACATE',                familia:'Fruta', saldoInicial:143.30, entradas:180.00, ordensCompra:0, saidas:-130.65, saldoFinal:192.65, undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:8.50, valorAtualEstoque:1637.53 },
  { id:'17', codigo:'AVO',     descricao:'ABACATE AVOCADO',        familia:'Fruta', saldoInicial:37.73,  entradas:0,      ordensCompra:0, saidas:-2.00,   saldoFinal:35.73,  undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:12.00, valorAtualEstoque:428.76 },
  { id:'18', codigo:'BNAN',    descricao:'BANANA NANICA',          familia:'Fruta', saldoInicial:338.12, entradas:400.00, ordensCompra:0, saidas:-799.44, saldoFinal:-61.32, undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:3.50, valorAtualEstoque:-214.62 },
  { id:'19', codigo:'BAN',     descricao:'BANANA PRATA',           familia:'Fruta', saldoInicial:53.55,  entradas:395.00, ordensCompra:0, saidas:-419.45, saldoFinal:149.80, undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:5.20, valorAtualEstoque:778.96 },
  { id:'20', codigo:'MANGP20', descricao:'MANGA PALMER',           familia:'Fruta', saldoInicial:114.53, entradas:716.00, ordensCompra:0, saidas:-445.19, saldoFinal:385.35, undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:4.80, valorAtualEstoque:1849.68 },
  { id:'21', codigo:'MAMF',    descricao:'MAMAO FORMOSA',          familia:'Fruta', saldoInicial:-88.65, entradas:700.00, ordensCompra:0, saidas:-486.10, saldoFinal:113.25, undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:4.20, valorAtualEstoque:475.65 },
  { id:'22', codigo:'KIWI',    descricao:'KIWI',                   familia:'Fruta', saldoInicial:51.00,  entradas:0,      ordensCompra:0, saidas:-25.78,  saldoFinal:25.28,  undEstoque:'KG', contagemFisica:null, diferencaEstoque:0, precoCusto:18.00, valorAtualEstoque:455.04 },
];

// ─── Mock movimentações do BAT25 (drill-down) ───
const MOCK_MOVIMENTACOES: Record<string, Movimentacao[]> = {
  '3': [ // BAT25
    { idDfe:'Id Venda: 1616...', nomeCliente:'SENAC PENHA',            natureza:'NFe Padrao', observacoes:'PESAR',  dataHoraVenda:'26/06/2026 07:07:58', dataEntrega:'27/06/2026', qtdeApuracao:5.000,  unidadeApuracao:'KG', vlrTotalVenda:67.20,  qtdeConvertida:0.208, unidadeConvertida:'SC', precoMedio:322.612, status:1 },
    { idDfe:'Id Venda: 1616...', nomeCliente:'MERCEARIA AMAURI',       natureza:'NFe Padrao', observacoes:'',       dataHoraVenda:'26/06/2026 09:33:21', dataEntrega:'27/06/2026', qtdeApuracao:20.000, unidadeApuracao:'KG', vlrTotalVenda:220.00, qtdeConvertida:0.833, unidadeConvertida:'SC', precoMedio:264.011, status:1 },
    { idDfe:'Id Venda: 1616...', nomeCliente:'DEMOISELLE BISTRO',      natureza:'NFe Padrao', observacoes:'',       dataHoraVenda:'26/06/2026 09:56:34', dataEntrega:'27/06/2026', qtdeApuracao:10.000, unidadeApuracao:'KG', vlrTotalVenda:134.40, qtdeConvertida:0.417, unidadeConvertida:'SC', precoMedio:322.534, status:1 },
    { idDfe:'Id Venda: 1616...', nomeCliente:'HOTEL MARCO PANINI',     natureza:'NFe Padrao', observacoes:'NOIVA',  dataHoraVenda:'26/06/2026 10:16:35', dataEntrega:'29/06/2026', qtdeApuracao:8.000,  unidadeApuracao:'KG', vlrTotalVenda:93.60,  qtdeConvertida:0.333, unidadeConvertida:'SC', precoMedio:280.828, status:1 },
    { idDfe:'Id Venda: 1617...', nomeCliente:'103700',                 natureza:'NFe Padrao', observacoes:'',       dataHoraVenda:'26/06/2026 10:47:00', dataEntrega:'29/06/2026', qtdeApuracao:12.000, unidadeApuracao:'KG', vlrTotalVenda:109.92, qtdeConvertida:0.500, unidadeConvertida:'SC', precoMedio:219.840, status:1 },
    { idDfe:'Id Venda: 1617...', nomeCliente:'LE VILLE',               natureza:'NFe Padrao', observacoes:'',       dataHoraVenda:'26/06/2026 11:10:23', dataEntrega:'27/06/2026', qtdeApuracao:50.000, unidadeApuracao:'KG', vlrTotalVenda:548.50, qtdeConvertida:2.083, unidadeConvertida:'SC', precoMedio:263.284, status:1 },
    { idDfe:'Id Venda: 1617...', nomeCliente:'EL PUNTO URUGUAYO',      natureza:'NFe Padrao', observacoes:'',       dataHoraVenda:'26/06/2026 11:18:48', dataEntrega:'27/06/2026', qtdeApuracao:3.000,  unidadeApuracao:'KG', vlrTotalVenda:35.88,  qtdeConvertida:0.125, unidadeConvertida:'SC', precoMedio:287.040, status:1 },
    { idDfe:'Id Venda: 1617...', nomeCliente:'HOSPITAL IPIRANGA MOGI', natureza:'NFe Padrao', observacoes:'NOIVA',  dataHoraVenda:'26/06/2026 11:36:04', dataEntrega:'27/06/2026', qtdeApuracao:10.000, unidadeApuracao:'KG', vlrTotalVenda:70.00,  qtdeConvertida:0.417, unidadeConvertida:'SC', precoMedio:167.987, status:1 },
    { idDfe:'Id Venda: 1617...', nomeCliente:'RASCAL JK',              natureza:'NFe Padrao', observacoes:'',       dataHoraVenda:'26/06/2026 11:47:09', dataEntrega:'27/06/2026', qtdeApuracao:20.000, unidadeApuracao:'KG', vlrTotalVenda:183.20, qtdeConvertida:0.833, unidadeConvertida:'SC', precoMedio:219.849, status:1 },
    { idDfe:'Id Venda: 1617...', nomeCliente:'SCANDAL RESTAURANTE',    natureza:'NFe Padrao', observacoes:'NOIVA',  dataHoraVenda:'26/06/2026 12:26:05', dataEntrega:'29/06/2026', qtdeApuracao:5.000,  unidadeApuracao:'KG', vlrTotalVenda:48.50,  qtdeConvertida:0.208, unidadeConvertida:'SC', precoMedio:232.837, status:1 },
    { idDfe:'Id Venda: 1617...', nomeCliente:'RASCAL JK',              natureza:'NFe Padrao', observacoes:'',       dataHoraVenda:'26/06/2026 12:40:26', dataEntrega:'29/06/2026', qtdeApuracao:20.000, unidadeApuracao:'KG', vlrTotalVenda:183.20, qtdeConvertida:0.833, unidadeConvertida:'SC', precoMedio:219.849, status:1 },
    { idDfe:'Id Venda: 1617...', nomeCliente:'MAREMONTI CAMPO BELO',   natureza:'NFe Padrao', observacoes:'',       dataHoraVenda:'26/06/2026 14:44:39', dataEntrega:'29/06/2026', qtdeApuracao:10.000, unidadeApuracao:'KG', vlrTotalVenda:85.90,  qtdeConvertida:0.417, unidadeConvertida:'SC', precoMedio:206.144, status:1 },
    { idDfe:'Id Venda: 1617...', nomeCliente:'103700',                 natureza:'NFe Padrao', observacoes:'',       dataHoraVenda:'26/06/2026 13:39:57', dataEntrega:'27/06/2026', qtdeApuracao:15.000, unidadeApuracao:'KG', vlrTotalVenda:137.40, qtdeConvertida:0.625, unidadeConvertida:'SC', precoMedio:219.840, status:1 },
    { idDfe:'Id Venda: 1617...', nomeCliente:'TERRACO ITALIA RESTAUR...', natureza:'NFe Padrao', observacoes:'NOIVA', dataHoraVenda:'26/06/2026 14:49:11', dataEntrega:'27/06/2026', qtdeApuracao:40.000, unidadeApuracao:'KG', vlrTotalVenda:450.40, qtdeConvertida:1.667, unidadeConvertida:'SC', precoMedio:270.235, status:1 },
  ],
};

// ─── Formatação ──────────────────────────────────
const N = (v: number) => {
  if (v === 0) return '0';
  const s = Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: v % 1 === 0 ? 0 : 3 });
  return v < 0 ? `- ${s}` : s;
};
const R$ = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const negClass = (v: number) => v < 0 ? 'text-red-600' : '';

// ─── Componente principal ────────────────────────
export default function AnaliseEstoqueFisico() {
  const { filialAtiva } = useAuth();

  // Filtros
  const [dataIni, setDataIni]     = useState('26/06/2026 00:00:00');
  const [dataFim, setDataFim]     = useState('26/06/2026 23:59:59');
  const [tipoItem, setTipoItem]   = useState('00-Mercadoria para Revenda');
  const [familia, setFamilia]     = useState('<Todas>');
  const [grupo, setGrupo]         = useState('<Todas>');
  const [cd, setCd]               = useState('1 - HETROS');
  const [undApuracao, setUndApuracao] = useState('Estoque');
  const [confFisica, setConfFisica]   = useState(false);
  const [semOrdCompra, setSemOrdCompra] = useState(false);
  const [executado, setExecutado]     = useState(true);
  const [processando, setProcessando] = useState(false);

  // Detalhe
  const [detalheAberto, setDetalheAberto] = useState<ProdutoEstoque | null>(null);

  // Seleção de linha
  const [selId, setSelId] = useState<string | null>(null);

  // Filtrar produtos
  const produtosFiltrados = useMemo(() => {
    if (!executado) return [];
    return MOCK_PRODUTOS.filter(p => {
      if (familia !== '<Todas>' && p.familia !== familia) return false;
      return true;
    });
  }, [executado, familia]);

  // Totais
  const totais = useMemo(() => ({
    saldoFinal: produtosFiltrados.reduce((s, p) => s + p.saldoFinal, 0),
    diferenca:  produtosFiltrados.reduce((s, p) => s + p.diferencaEstoque, 0),
    valorTotal: produtosFiltrados.reduce((s, p) => s + p.valorAtualEstoque, 0),
  }), [produtosFiltrados]);

  const handleExecutar = () => {
    setProcessando(true);
    setExecutado(false);
    setTimeout(() => {
      setProcessando(false);
      setExecutado(true);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 text-xs select-none overflow-hidden">

      {/* ── Barra de filtros (idêntica ao NewOxxy) ── */}
      <div className="bg-gray-200 border-b border-gray-400 px-3 py-2 flex flex-wrap items-end gap-4 shrink-0">

        {/* Período */}
        <fieldset className="border border-gray-400 rounded px-2 pb-1 pt-0">
          <legend className="text-[10px] font-semibold text-gray-700 px-1">Período</legend>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-gray-600 w-6">De:</span>
              <input value={dataIni} onChange={e => setDataIni(e.target.value)} className="border border-gray-400 bg-white text-xs px-1 py-0.5 rounded w-36 font-mono" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-600 w-6">Até:</span>
              <input value={dataFim} onChange={e => setDataFim(e.target.value)} className="border border-gray-400 bg-white text-xs px-1 py-0.5 rounded w-36 font-mono" />
            </div>
          </div>
        </fieldset>

        {/* Seleção */}
        <fieldset className="border border-gray-400 rounded px-2 pb-1 pt-0">
          <legend className="text-[10px] font-semibold text-gray-700 px-1">Seleção</legend>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-gray-600">Tipo Item:</span>
              <select value={tipoItem} onChange={e => setTipoItem(e.target.value)} className="border border-gray-400 bg-white text-xs px-1 py-0.5 rounded">
                <option>00-Mercadoria para Revenda</option>
                <option>01-Matéria Prima</option>
                <option>02-Embalagem</option>
              </select>
            </div>
            <label className="flex items-center gap-1 cursor-pointer text-gray-600">
              <input type="checkbox" checked={confFisica} onChange={e => setConfFisica(e.target.checked)} className="accent-blue-600" />
              Conferência Física
            </label>
            <label className="flex items-center gap-1 cursor-pointer text-gray-600">
              <input type="checkbox" checked={semOrdCompra} onChange={e => setSemOrdCompra(e.target.checked)} className="accent-blue-600" />
              Não Mostrar Ordens de Compra
            </label>
          </div>
        </fieldset>

        {/* Família */}
        <fieldset className="border border-gray-400 rounded px-2 pb-1 pt-0">
          <legend className="text-[10px] font-semibold text-gray-700 px-1">Selecione uma Família</legend>
          <select
            value={familia}
            onChange={e => setFamilia(e.target.value)}
            className="border border-gray-400 bg-white text-xs px-1 py-0.5 rounded w-36"
            size={1}
          >
            {FAMILIAS.map(f => <option key={f}>{f}</option>)}
          </select>
          <div className="mt-1">
            <span className="text-[10px] text-gray-500">Selecione um Grupo</span>
            <select value={grupo} onChange={e => setGrupo(e.target.value)} className="border border-gray-400 bg-white text-xs px-1 py-0.5 rounded w-36 block">
              {GRUPOS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        </fieldset>

        {/* Centro de Distribuição */}
        <fieldset className="border border-gray-400 rounded px-2 pb-1 pt-0">
          <legend className="text-[10px] font-semibold text-gray-700 px-1">Centro de Distribuição</legend>
          <select value={cd} onChange={e => setCd(e.target.value)} className="border border-gray-400 bg-white text-xs px-1 py-0.5 rounded w-28">
            <option>1 - HETROS</option>
          </select>
        </fieldset>

        {/* Unidade de Apuração */}
        <fieldset className="border border-gray-400 rounded px-2 pb-1 pt-0">
          <legend className="text-[10px] font-semibold text-gray-700 px-1">Unidade de Apuração</legend>
          <label className="flex items-center gap-1 text-gray-700">
            <input type="radio" name="und" checked={undApuracao === 'Estoque'} onChange={() => setUndApuracao('Estoque')} className="accent-blue-600" />
            Estoque
          </label>
          <label className="flex items-center gap-1 text-gray-700">
            <input type="radio" name="und" checked={undApuracao === 'Principal'} onChange={() => setUndApuracao('Principal')} className="accent-blue-600" />
            Principal
          </label>
        </fieldset>

        {/* Botões */}
        <div className="flex gap-2">
          <button onClick={handleExecutar} className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-green-50 px-3 py-1.5 rounded text-green-700 font-semibold">
            <CheckCircle className="h-4 w-4" /> Executar
          </button>
          <button className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-gray-50 px-3 py-1.5 rounded text-gray-700">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button className="flex items-center gap-1 bg-white border border-gray-400 hover:bg-gray-50 px-3 py-1.5 rounded text-gray-700">
            <Download className="h-4 w-4" /> Exportar
          </button>
        </div>
      </div>

      {/* ── Grade de produtos ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-[11px]" style={{ minWidth: 1200 }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-300 border-b-2 border-gray-500">
              <th className="px-2 py-1 text-left font-semibold text-gray-800 border-r border-gray-400 whitespace-nowrap">Código Produto</th>
              <th className="px-2 py-1 text-left font-semibold text-gray-800 border-r border-gray-400 whitespace-nowrap">Descrição</th>
              <th className="px-2 py-1 text-left font-semibold text-gray-800 border-r border-gray-400 whitespace-nowrap">Família</th>
              <th className="px-2 py-1 text-right font-semibold text-gray-800 border-r border-gray-400 whitespace-nowrap">↓ Saldo Inicial</th>
              <th className="px-2 py-1 text-right font-semibold text-gray-800 border-r border-gray-400 whitespace-nowrap">⇒ Entradas</th>
              <th className="px-2 py-1 text-right font-semibold text-gray-800 border-r border-gray-400 whitespace-nowrap">Ordens de Compras</th>
              <th className="px-2 py-1 text-right font-semibold text-gray-800 border-r border-gray-400 whitespace-nowrap">⇐ Saídas</th>
              <th className="px-2 py-1 text-right font-semibold text-gray-800 border-r border-gray-400 whitespace-nowrap">⇒ Saldo Final</th>
              <th className="px-2 py-1 text-left font-semibold text-gray-800 border-r border-gray-400 whitespace-nowrap">Und Estoque</th>
              <th className="px-2 py-1 text-right font-semibold text-gray-800 border-r border-gray-400 whitespace-nowrap">✎ Contagem Física</th>
              <th className="px-2 py-1 text-right font-semibold text-gray-800 border-r border-gray-400 whitespace-nowrap">⊘ Diferença de Estoque</th>
              <th className="px-2 py-1 text-right font-semibold text-gray-800 border-r border-gray-400 whitespace-nowrap">Preço Custo</th>
              <th className="px-2 py-1 text-right font-semibold text-gray-800 whitespace-nowrap">Valor Atual do Estoque</th>
            </tr>
          </thead>
          <tbody>
            {produtosFiltrados.map((p) => {
              const isSelected = selId === p.id;
              return (
                <tr
                  key={p.id}
                  onClick={() => setSelId(p.id)}
                  onDoubleClick={() => setDetalheAberto(p)}
                  className={`border-b border-gray-200 cursor-pointer transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}
                >
                  <td className="px-2 py-1 border-r border-gray-200">
                    <div className="flex items-center gap-1">
                      <ChevronRight className="h-3 w-3 text-gray-400 shrink-0" />
                      <span className={`font-semibold ${isSelected ? 'text-white' : 'text-blue-700'}`}>{p.codigo}</span>
                    </div>
                  </td>
                  <td className={`px-2 py-1 border-r border-gray-200 ${isSelected ? '' : 'text-blue-600'}`}>{p.descricao}</td>
                  <td className="px-2 py-1 border-r border-gray-200">{p.familia}</td>
                  <td className={`px-2 py-1 border-r border-gray-200 text-right font-mono ${isSelected ? '' : negClass(p.saldoInicial)}`}>{N(p.saldoInicial)}</td>
                  <td className={`px-2 py-1 border-r border-gray-200 text-right font-mono ${isSelected ? '' : negClass(p.entradas)}`}>{N(p.entradas)}</td>
                  <td className={`px-2 py-1 border-r border-gray-200 text-right font-mono ${isSelected ? '' : 'text-green-700'}`}>{p.ordensCompra > 0 ? N(p.ordensCompra) : ''}</td>
                  <td className={`px-2 py-1 border-r border-gray-200 text-right font-mono ${isSelected ? '' : negClass(p.saidas)}`}>{N(p.saidas)}</td>
                  <td className={`px-2 py-1 border-r border-gray-200 text-right font-mono font-bold ${isSelected ? '' : negClass(p.saldoFinal)}`}>{N(p.saldoFinal)}</td>
                  <td className="px-2 py-1 border-r border-gray-200">{p.undEstoque}</td>
                  <td className="px-2 py-1 border-r border-gray-200 text-right font-mono">
                    {confFisica ? (
                      <input
                        type="number"
                        step="0.001"
                        className="w-20 border border-gray-300 text-right text-xs px-1 py-0 rounded bg-yellow-50"
                        value={p.contagemFisica ?? ''}
                        onClick={e => e.stopPropagation()}
                        onChange={() => {}}
                        placeholder="0,000"
                      />
                    ) : null}
                  </td>
                  <td className={`px-2 py-1 border-r border-gray-200 text-right font-mono ${isSelected ? '' : negClass(p.diferencaEstoque)}`}>{p.diferencaEstoque !== 0 ? N(p.diferencaEstoque) : ''}</td>
                  <td className="px-2 py-1 border-r border-gray-200 text-right font-mono">{R$(p.precoCusto)}</td>
                  <td className={`px-2 py-1 text-right font-mono font-semibold ${isSelected ? '' : negClass(p.valorAtualEstoque)}`}>{R$(p.valorAtualEstoque)}</td>
                </tr>
              );
            })}
            {produtosFiltrados.length === 0 && (
              <tr><td colSpan={13} className="px-4 py-8 text-center text-gray-400 italic">Nenhum item encontrado!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Rodapé com totais ── */}
      <div className="shrink-0 bg-gray-300 border-t-2 border-gray-500 px-3 py-1 flex items-center justify-between text-gray-800">
        <span>Registros encontrados: <strong>{produtosFiltrados.length}</strong></span>
        <div className="flex gap-8 font-mono">
          <span>{R$(totais.saldoFinal)}</span>
          <span>{R$(totais.diferenca)}</span>
          <span className="font-bold">{R$(totais.valorTotal)}</span>
        </div>
      </div>

      {/* ── Modal "Processando..." ── */}
      {processando && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white border-2 border-gray-400 rounded-lg shadow-xl p-6 w-80 text-center">
            <p className="text-xs text-gray-500">Análise de Estoque</p>
            <p className="text-sm text-gray-600 mt-1">Processando...</p>
            <p className="text-xl font-bold text-gray-900 mt-2">Aguarde...</p>
            <p className="text-xs text-gray-500 mt-2">Produto: FEIJAO PROCESSADO</p>
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mt-3" />
            <button onClick={() => setProcessando(false)} className="mt-4 px-4 py-1 bg-gray-200 border border-gray-400 rounded text-xs text-gray-700 hover:bg-gray-300">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Detalhamento do Registro ── */}
      {detalheAberto && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-gray-400 rounded-lg shadow-xl w-full max-w-5xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-300 bg-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">⊞ Detalhamento do Registro</span>
              </div>
              <button onClick={() => setDetalheAberto(null)} className="text-gray-500 hover:text-gray-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Info do produto */}
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center gap-6 shrink-0 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Código do Produto</span>
                <input value={detalheAberto.codigo} readOnly className="border border-gray-400 bg-white px-2 py-0.5 rounded w-20 font-mono font-bold" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Descrição do Produto</span>
                <input value={detalheAberto.descricao} readOnly className="border border-gray-400 bg-white px-2 py-0.5 rounded w-52" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Quantidade Total</span>
                <input value={N(Math.abs(detalheAberto.saidas))} readOnly className="border border-gray-400 bg-white px-2 py-0.5 rounded w-20 text-right font-mono" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-600">Unidade</span>
                <span className="font-bold">{detalheAberto.undEstoque}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Saldo Atual</span>
                <span className="bg-blue-600 text-white px-3 py-0.5 rounded font-bold font-mono">{R$(detalheAberto.saldoFinal)}</span>
              </div>
              <label className="flex items-center gap-1 ml-auto text-gray-500 text-[10px]">
                <input type="checkbox" className="accent-blue-600" />
                Mostrar movimentações de Alteração/Exclusão
              </label>
            </div>

            {/* Tabela de movimentações */}
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead className="sticky top-0 bg-gray-200 border-b border-gray-400">
                  <tr>
                    {['Id DFe/Pedido','Nome/Razão Social','Natureza de Operação','Observações','Data/Hora Venda','Data Entrega','Qtde Apuração','Unidade Apuração','Vlr Total Venda','Qtde Convertida','Unidade Convertida','Preço Médio','Status'].map(h => (
                      <th key={h} className="px-2 py-1 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(MOCK_MOVIMENTACOES[detalheAberto.id] || []).map((m, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-blue-50">
                      <td className="px-2 py-1 border-r border-gray-200 text-blue-700 whitespace-nowrap">{m.idDfe}</td>
                      <td className="px-2 py-1 border-r border-gray-200 whitespace-nowrap">{m.nomeCliente}</td>
                      <td className="px-2 py-1 border-r border-gray-200">{m.natureza}</td>
                      <td className="px-2 py-1 border-r border-gray-200 text-orange-600 font-semibold">{m.observacoes}</td>
                      <td className="px-2 py-1 border-r border-gray-200 font-mono whitespace-nowrap">{m.dataHoraVenda}</td>
                      <td className="px-2 py-1 border-r border-gray-200 font-mono">{m.dataEntrega}</td>
                      <td className="px-2 py-1 border-r border-gray-200 text-right font-mono font-bold">{N(m.qtdeApuracao)}</td>
                      <td className="px-2 py-1 border-r border-gray-200">{m.unidadeApuracao}</td>
                      <td className="px-2 py-1 border-r border-gray-200 text-right font-mono">{R$(m.vlrTotalVenda)}</td>
                      <td className="px-2 py-1 border-r border-gray-200 text-right font-mono">{m.qtdeConvertida.toFixed(3)}</td>
                      <td className="px-2 py-1 border-r border-gray-200">{m.unidadeConvertida}</td>
                      <td className="px-2 py-1 border-r border-gray-200 text-right font-mono">{R$(m.precoMedio)}</td>
                      <td className="px-2 py-1 text-center">{m.status}</td>
                    </tr>
                  ))}
                  {!(MOCK_MOVIMENTACOES[detalheAberto.id] || []).length && (
                    <tr><td colSpan={13} className="px-4 py-6 text-center text-gray-400 italic">Nenhuma movimentação encontrada para este produto.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer do modal */}
            <div className="shrink-0 bg-gray-100 border-t border-gray-300 px-4 py-2 flex items-center justify-between text-xs">
              <span className="text-gray-500">
                Registros Encontrados: <strong>{(MOCK_MOVIMENTACOES[detalheAberto.id] || []).length}</strong>
              </span>
              <div className="flex gap-3">
                <button className="px-3 py-1 bg-white border border-gray-400 rounded hover:bg-gray-50 text-gray-700 font-medium">
                  <Download className="h-3 w-3 inline mr-1" /> Exportar
                </button>
                <button onClick={() => setDetalheAberto(null)} className="px-4 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
