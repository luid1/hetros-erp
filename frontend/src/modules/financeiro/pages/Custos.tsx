import { useState, useEffect, useCallback } from 'react';
import {
  Coins, RefreshCw, TrendingUp, TrendingDown, Percent, Boxes, Search,
  X, Calculator, Target, Truck, PackageMinus, ShoppingBag, AlertTriangle, Send, Layers,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from '../../../components/ui/feedback';
import api from '../../../services/api';

const R$ = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const nkg = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const primeiroDiaMes = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const hojeISO = () => new Date().toISOString().slice(0, 10);
const numBR = (v: string) => v === '' ? 0 : parseFloat(String(v).replace(',', '.')) || 0;

// Margem crítica: < 15% vermelho, 15–25% âmbar, ≥ 25% verde
const corMargem = (m: number) => m < 15 ? 'text-rose-400' : m < 25 ? 'text-amber-400' : 'text-emerald-300';

// Emoji por tipo de produto (para a mensagem de WhatsApp)
const EMOJI: [RegExp, string][] = [
  [/banana/i, '🍌'], [/abacaxi|anan[aá]/i, '🍍'], [/ma[çc][aã]/i, '🍎'], [/uva/i, '🍇'],
  [/laranja|citric|tangerina|mexerica/i, '🍊'], [/lim[aã]o/i, '🍋'], [/manga/i, '🥭'], [/melancia/i, '🍉'],
  [/mel[aã]o/i, '🍈'], [/morango/i, '🍓'], [/tomate/i, '🍅'], [/cenoura/i, '🥕'], [/milho/i, '🌽'],
  [/batata|mandioca|inhame|car[aá]|beterraba|nabo/i, '🥔'], [/cebola|alho/i, '🧅'],
  [/alface|couve|rucula|r[uú]cula|verdura|folha|espinafre|acelga|agri[aã]o/i, '🥬'],
  [/piment[aã]o|pimenta/i, '🌶️'], [/coco/i, '🥥'], [/ovo/i, '🥚'], [/abacate/i, '🥑'],
  [/pepino|abobrinha|vagem|quiabo|berinjela/i, '🥒'], [/kiwi/i, '🥝'], [/mam[aã]o/i, '🥭'],
];
const emoji = (desc: string) => { for (const [re, e] of EMOJI) if (re.test(desc)) return e; return '📦'; };

// Produto normalizado que a gaveta de cotação recebe
interface ProdCotacao {
  produtoId: string; descricao: string; codigo: string; unidade?: string;
  composto: number; aquisicao: number; frete: number; chapa: number; precoVenda: number;
}

export default function Custos() {
  const { filialAtiva } = useAuth();
  const [aba, setAba] = useState<'margem' | 'produtos'>('margem');
  const [dados, setDados] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [ini, setIni] = useState(primeiroDiaMes());
  const [fim, setFim] = useState(hojeISO());
  const [cotarList, setCotarList] = useState<ProdCotacao[] | null>(null); // produtos na gaveta (1 ou N)

  const carregar = useCallback(() => {
    if (!filialAtiva) return;
    setLoading(true);
    api.get(`/custos/${filialAtiva.id}/margem`, { params: { dataIni: ini, dataFim: fim } })
      .then(r => setDados(r.data)).catch(() => setDados(null)).finally(() => setLoading(false));
  }, [filialAtiva?.id, ini, fim]);
  useEffect(() => { if (aba === 'margem') carregar(); }, [carregar, aba]);

  const k = dados?.kpis;
  const produtos: any[] = dados?.produtos || [];

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      <div className="bg-slate-900/80 border-b border-slate-800 px-6 pt-4 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2"><Coins className="h-5 w-5 text-amber-300" /> Custos & Margem</h1>
            <p className="text-xs text-slate-500 mt-0.5">Custo base composto (compra + frete + chapa) herdado automaticamente · cotação individual e em lote</p>
          </div>
          {aba === 'margem' && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">De
                <input type="date" value={ini} onChange={e => setIni(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-100" />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">Até
                <input type="date" value={fim} onChange={e => setFim(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-100" />
              </label>
              <button onClick={carregar} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 px-3.5 py-2 rounded-lg text-slate-200 font-medium text-sm">
                <RefreshCw className={`h-4 w-4 text-amber-300 ${loading ? 'animate-spin' : ''}`} /> Atualizar
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 mt-3">
          {([['margem', 'Margem & Lucratividade'], ['produtos', 'Custos por produto (cotação)']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setAba(key)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${aba === key ? 'border-amber-400 text-amber-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {aba === 'produtos' && <ProdutosComposicao onCotar={setCotarList} />}
      {aba === 'produtos' ? null : (
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin h-7 w-7 border-2 border-amber-400 border-t-transparent rounded-full" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Kpi icon={<Boxes className="h-4 w-4" />} cor="amber" label="CMV (custo composto)" valor={R$(k?.cmv)} />
                <Kpi icon={<TrendingUp className="h-4 w-4" />} cor="sky" label="Receita de vendas" valor={R$(k?.receitaTotal)} />
                <Kpi icon={<TrendingDown className="h-4 w-4" />} cor="rose" label="Perdas monetizadas" valor={R$(k?.perdas)} />
                <Kpi icon={<Percent className="h-4 w-4" />} cor="emerald" label="Margem média" valor={`${(Number(k?.margemMediaPct) || 0).toFixed(1)}%`} />
              </div>

              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 overflow-hidden">
                <h3 className="font-semibold text-sm text-slate-200 px-5 py-3 border-b border-slate-700/60 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-300" /> Lucratividade por produto <span className="text-xs text-slate-500 font-normal">· clique para cotar</span>
                </h3>
                {produtos.length === 0 ? (
                  <p className="text-sm text-slate-500 py-12 text-center">Sem vendas no período.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/40 text-xs text-slate-400">
                      <tr>
                        {['Produto', 'Qtd vendida', 'Custo composto médio', 'Preço médio venda', 'Lucro bruto', 'Margem %'].map((h, i) => (
                          <th key={h} className={`px-4 py-2.5 font-semibold ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {produtos.map(p => (
                        <tr key={p.produtoId} onClick={() => setCotarList([{ produtoId: p.produtoId, descricao: p.descricao, codigo: p.codigo, unidade: p.unidade, composto: p.custoComposto, aquisicao: p.aquisicao, frete: p.frete, chapa: p.chapa, precoVenda: p.precoMedioVenda }])}
                          className="border-t border-slate-800 hover:bg-amber-500/10 cursor-pointer">
                          <td className="px-4 py-2.5"><span className="font-semibold text-slate-100">{p.descricao}</span> <span className="text-slate-500 font-mono text-xs">{p.codigo}</span></td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-300">{nkg(p.qtdVendida)}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-300 bg-amber-500/5">{R$(p.custoComposto)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-300">{R$(p.precoMedioVenda)}</td>
                          <td className={`px-4 py-2.5 text-right font-mono font-bold ${p.lucroBruto < 0 ? 'text-rose-400' : 'text-slate-100'}`}>{R$(p.lucroBruto)}</td>
                          <td className={`px-4 py-2.5 text-right font-mono font-bold ${corMargem(p.margemPct)}`}>{p.margemPct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {cotarList && <DrawerCotacao produtos={cotarList} onClose={() => setCotarList(null)} />}
    </div>
  );
}

// ── Aba: todos os produtos com o custo composto (herdado) + seleção múltipla ──
function ProdutosComposicao({ onCotar }: { onCotar: (p: ProdCotacao[]) => void }) {
  const { filialAtiva } = useAuth();
  const [lista, setLista] = useState<ProdCotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const carregar = useCallback(() => {
    if (!filialAtiva) return;
    setLoading(true);
    api.get(`/custos/${filialAtiva.id}/composicao`, { params: busca ? { q: busca } : {} })
      .then(r => setLista(r.data?.produtos || [])).catch(() => setLista([])).finally(() => setLoading(false));
  }, [filialAtiva?.id, busca]);
  useEffect(() => { const t = setTimeout(carregar, 250); return () => clearTimeout(t); }, [carregar]);

  const toggle = (id: string) => setSelecionados(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelecionados(selecionados.size === lista.length ? new Set() : new Set(lista.map(p => p.produtoId)));
  const cotarSelecionados = () => onCotar(lista.filter(p => selecionados.has(p.produtoId)));

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..." className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-100 w-72 focus:outline-none focus:border-amber-400" />
        </div>
        <span className="text-xs text-slate-500">{lista.length} produto(s) · custo herdado automaticamente</span>
        {selecionados.size > 0 && (
          <button onClick={cotarSelecionados}
            className="ml-auto flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-4 py-2 rounded-lg shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]">
            <Layers className="h-4 w-4" /> Cotar Selecionados ({selecionados.size})
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin h-6 w-6 border-2 border-amber-400 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/40 text-xs text-slate-400">
              <tr>
                <th className="px-3 py-2.5 w-8">
                  <input type="checkbox" checked={lista.length > 0 && selecionados.size === lista.length} onChange={toggleAll} className="accent-amber-500 h-3.5 w-3.5 cursor-pointer" />
                </th>
                {['Produto', 'Aquisição', 'Frete', 'Chapa', 'Custo composto', 'Preço venda', 'Margem est.'].map((h, i) => <th key={h} className={`px-4 py-2.5 font-semibold ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {lista.map(p => {
                const margem = p.precoVenda > 0 ? ((p.precoVenda - p.composto) / p.precoVenda) * 100 : 0;
                const sel = selecionados.has(p.produtoId);
                return (
                  <tr key={p.produtoId} className={`border-t border-slate-800 hover:bg-amber-500/10 cursor-pointer ${sel ? 'bg-amber-500/[0.07]' : ''}`}>
                    <td className="px-3 py-2 w-8" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={sel} onChange={() => toggle(p.produtoId)} className="accent-amber-500 h-3.5 w-3.5 cursor-pointer" />
                    </td>
                    <td className="px-4 py-2" onClick={() => onCotar([p])}><span className="font-semibold text-slate-100">{p.descricao}</span> <span className="text-slate-500 font-mono text-xs">{p.codigo} · {p.unidade}</span></td>
                    <td className="px-4 py-2 text-right font-mono text-slate-400" onClick={() => onCotar([p])}>{R$(p.aquisicao)}</td>
                    <td className="px-4 py-2 text-right font-mono text-slate-500" onClick={() => onCotar([p])}>{R$(p.frete)}</td>
                    <td className="px-4 py-2 text-right font-mono text-slate-500" onClick={() => onCotar([p])}>{R$(p.chapa)}</td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-amber-300 bg-amber-500/5" onClick={() => onCotar([p])}>{R$(p.composto)}</td>
                    <td className="px-4 py-2 text-right font-mono text-slate-300" onClick={() => onCotar([p])}>{p.precoVenda > 0 ? R$(p.precoVenda) : '—'}</td>
                    <td className={`px-4 py-2 text-right font-mono font-bold ${p.precoVenda > 0 ? corMargem(margem) : 'text-slate-600'}`} onClick={() => onCotar([p])}>{p.precoVenda > 0 ? margem.toFixed(1) + '%' : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Gaveta lateral: cotação individual OU em lote ──
type LinhaState = { preco: string; cobrir: boolean; alvo: string; motivo: string };

const MOTIVOS = [
  { v: 'GARANTIR_CLIENTE', l: 'Garantir Cliente' },
  { v: 'DESOVAR_ESTOQUE', l: 'Desovar Estoque' },
  { v: 'COMBATER_CONCORRENCIA', l: 'Combater Concorrência' },
];

function DrawerCotacao({ produtos, onClose }: { produtos: ProdCotacao[]; onClose: () => void }) {
  const { filialAtiva } = useAuth();
  const lote = produtos.length > 1;
  // Estado por produto (performático: um único objeto keyado por id)
  const [estado, setEstado] = useState<Record<string, LinhaState>>(() => {
    const init: Record<string, LinhaState> = {};
    for (const p of produtos) init[p.produtoId] = { preco: p.precoVenda ? String(p.precoVenda) : '', cobrir: false, alvo: '', motivo: '' };
    return init;
  });
  const set = (id: string, patch: Partial<LinhaState>) => setEstado(s => ({ ...s, [id]: { ...s[id], ...patch } }));

  // Cálculo por produto
  const calc = (p: ProdCotacao) => {
    const st = estado[p.produtoId] || { preco: '', cobrir: false, alvo: '', motivo: '' };
    const sug = numBR(st.preco);
    const alvo = numBR(st.alvo);
    const precoFinal = st.cobrir && alvo > 0 ? alvo : sug;
    const margem = precoFinal > 0 ? ((precoFinal - p.composto) / precoFinal) * 100 : null;
    const markup = p.composto > 0 && sug > 0 ? ((sug / p.composto) - 1) * 100 : null;
    const lucro = precoFinal - p.composto;
    const prejuizo = precoFinal > 0 && precoFinal < p.composto;
    return { st, sug, alvo, precoFinal, margem, markup, lucro, prejuizo };
  };

  // Exporta para WhatsApp (só o preço final de venda — nunca custo/margem)
  const copiarWhats = async () => {
    const linhas = produtos.map(p => ({ p, c: calc(p) })).filter(x => x.c.precoFinal > 0);
    if (linhas.length === 0) { toast('Preencha ao menos um preço para cotar.', 'error'); return; }
    // Motivo obrigatório para itens vendidos abaixo do custo composto
    const semMotivo = linhas.find(x => x.c.prejuizo && !x.c.st.motivo);
    if (semMotivo) { toast(`Informe o "Motivo da Execução" de ${semMotivo.p.descricao} (venda abaixo do custo).`, 'error'); return; }
    const hoje = new Date().toLocaleDateString('pt-BR');
    const corpo = linhas.map(({ p, c }) => `${emoji(p.descricao)} *${p.descricao}* -> ${R$(c.precoFinal)}`).join('\n');
    const msg = `*HETROS WMS - Cotação do Dia (${hoje})*\n\n${corpo}`;

    // Persiste a cotação (o app dos compradores lê da mesma base)
    if (filialAtiva) {
      const itens = linhas.map(({ p, c }) => ({
        produtoId: p.produtoId, codigo: p.codigo, descricao: p.descricao, unidade: p.unidade,
        precoVenda: c.precoFinal, custoComposto: p.composto, cobrir: c.st.cobrir, motivo: c.st.motivo || null,
      }));
      api.post(`/custos/${filialAtiva.id}/cotacao`, { itens }).catch(() => { /* não bloqueia o copiar */ });
    }

    try {
      await navigator.clipboard.writeText(msg);
      toast(`Cotação de ${linhas.length} item(ns) copiada e salva para o app!`, 'success');
    } catch {
      toast('Cotação salva. Não consegui copiar automaticamente — copie manualmente.', 'error');
    }
  };
  const preenchidos = produtos.filter(p => calc(p).precoFinal > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-[#0e1729] border-l border-slate-800 h-full flex flex-col shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-slate-800 shrink-0 flex items-start justify-between">
          <div className="min-w-0">
            {lote ? (
              <>
                <h2 className="font-bold text-white flex items-center gap-2"><Layers className="h-4 w-4 text-amber-300" /> Cotação em lote</h2>
                <p className="text-xs text-slate-500 mt-0.5">{produtos.length} produtos selecionados</p>
              </>
            ) : (
              <>
                <h2 className="font-bold text-white truncate">{produtos[0].descricao}</h2>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">{produtos[0].codigo}{produtos[0].unidade ? ` · ${produtos[0].unidade}` : ''}</p>
              </>
            )}
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {!lote ? <PainelIndividual p={produtos[0]} c={calc(produtos[0])} set={set} /> : (
            <div className="space-y-2.5">
              {produtos.map(p => <LinhaLote key={p.produtoId} p={p} c={calc(p)} set={set} />)}
            </div>
          )}
        </div>

        {/* Rodapé: exportar */}
        <div className="border-t border-slate-800 px-5 py-3 shrink-0 space-y-2">
          <button onClick={copiarWhats} disabled={preenchidos === 0}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-900 font-bold py-2.5 rounded-lg transition-all active:scale-[0.98]">
            <Send className="h-4 w-4" /> Copiar para WhatsApp{preenchidos > 0 ? ` (${preenchidos})` : ''}
          </button>
          <button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 rounded-lg transition-colors text-sm">Fechar</button>
        </div>
      </div>
    </div>
  );
}

// Painel detalhado (modo individual)
function PainelIndividual({ p, c, set }: { p: ProdCotacao; c: any; set: (id: string, patch: Partial<LinhaState>) => void }) {
  return (
    <div className="space-y-5">
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
        <p className="text-[10px] text-amber-300/70 uppercase tracking-wide font-semibold">Custo base composto</p>
        <p className="text-2xl font-extrabold text-amber-300 font-mono">{R$(p.composto)}</p>
        <div className="flex gap-3 mt-1.5 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><ShoppingBag className="h-3 w-3" /> aquisição {R$(p.aquisicao)}</span>
          <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> frete {R$(p.frete)}</span>
          <span className="flex items-center gap-1"><PackageMinus className="h-3 w-3" /> chapa {R$(p.chapa)}</span>
        </div>
      </div>

      {/* Cotação rápida */}
      <div>
        <p className="text-[11px] font-bold text-sky-300/80 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Calculator className="h-3.5 w-3.5" /> Cotação rápida (preço do dia)</p>
        <label className="block">
          <span className="text-xs text-slate-400">Preço sugerido de venda</span>
          <div className="mt-1 flex items-center bg-slate-800 border border-slate-600 rounded-lg overflow-hidden focus-within:border-sky-400">
            <span className="px-2 text-slate-500 text-sm">R$</span>
            <input type="number" step="0.01" autoFocus value={c.st.preco} onChange={e => set(p.produtoId, { preco: e.target.value })}
              className="flex-1 bg-transparent px-2 py-2.5 text-lg text-slate-100 text-right font-mono focus:outline-none" placeholder="0,00" />
          </div>
        </label>
        {c.sug > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MiniStat label="Margem" valor={`${(c.margem ?? 0).toFixed(1)}%`} cor={corMargem(c.margem ?? 0)} />
            <MiniStat label="Markup" valor={c.markup != null ? `${c.markup.toFixed(0)}%` : '—'} cor="text-slate-200" />
            <MiniStat label="Lucro/un" valor={R$(c.lucro)} cor={c.lucro < 0 ? 'text-rose-400' : 'text-emerald-300'} />
          </div>
        )}
      </div>

      {/* Cobrir preço */}
      <div className="border-t border-slate-800 pt-4">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-[11px] font-bold text-violet-300/80 uppercase tracking-wide flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> Cobrir preço da concorrência</span>
          <Switch on={c.st.cobrir} onClick={() => set(p.produtoId, { cobrir: !c.st.cobrir })} />
        </label>
        {c.st.cobrir && (
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="text-xs text-slate-400">Preço alvo do cliente</span>
              <div className="mt-1 flex items-center bg-slate-800 border border-slate-600 rounded-lg overflow-hidden focus-within:border-violet-400">
                <span className="px-2 text-slate-500 text-sm">R$</span>
                <input type="number" step="0.01" value={c.st.alvo} onChange={e => set(p.produtoId, { alvo: e.target.value })}
                  className="flex-1 bg-transparent px-2 py-2.5 text-lg text-slate-100 text-right font-mono focus:outline-none" placeholder="0,00" />
              </div>
            </label>
            {c.alvo > 0 && (c.prejuizo ? (
              <div className="bg-rose-500/10 border border-rose-500/40 rounded-xl px-4 py-3 space-y-2.5">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm"><AlertTriangle className="h-4 w-4" /> Atenção: Venda abaixo do custo composto!</div>
                <p className="text-2xl font-extrabold text-rose-400 font-mono">−{(((p.composto - c.alvo) / p.composto) * 100).toFixed(1)}%</p>
                <p className="text-xs text-rose-300/70">Abaixo do custo em {R$(p.composto - c.alvo)}/un · exige liberação do gerente.</p>
                <label className="block">
                  <span className="text-[11px] text-rose-200 font-semibold">Motivo da Execução (obrigatório)</span>
                  <select value={c.st.motivo} onChange={e => set(p.produtoId, { motivo: e.target.value })}
                    className={`mt-1 w-full bg-slate-800 border rounded-lg px-2 py-2 text-sm text-slate-100 focus:outline-none ${c.st.motivo ? 'border-slate-600' : 'border-rose-500/60'}`}>
                    <option value="">Selecione o motivo…</option>
                    {MOTIVOS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                  </select>
                </label>
              </div>
            ) : (
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Margem no preço alvo</p>
                <p className={`text-2xl font-extrabold font-mono ${corMargem(c.margem ?? 0)}`}>{(c.margem ?? 0).toFixed(1)}%</p>
                <p className="text-xs text-slate-400 mt-0.5">Lucro de {R$(c.alvo - p.composto)}/un cobrindo o cliente.</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Linha compacta (modo lote)
function LinhaLote({ p, c, set }: { p: ProdCotacao; c: any; set: (id: string, patch: Partial<LinhaState>) => void }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate">{emoji(p.descricao)} {p.descricao}</p>
          <p className="text-[10px] text-slate-500 font-mono">custo {R$(p.composto)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] text-violet-300/70 uppercase font-semibold">cobrir</span>
          <Switch small on={c.st.cobrir} onClick={() => set(p.produtoId, { cobrir: !c.st.cobrir })} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 flex items-center bg-slate-900 border border-slate-600 rounded-lg overflow-hidden focus-within:border-sky-400">
          <span className="px-1.5 text-slate-500 text-xs">R$</span>
          <input type="number" step="0.01" value={c.st.cobrir ? c.st.alvo : c.st.preco}
            onChange={e => set(p.produtoId, c.st.cobrir ? { alvo: e.target.value } : { preco: e.target.value })}
            className="flex-1 bg-transparent px-1.5 py-1.5 text-sm text-slate-100 text-right font-mono focus:outline-none"
            placeholder={c.st.cobrir ? 'preço alvo' : 'preço venda'} />
        </div>
        {c.precoFinal > 0 && (
          <div className="text-right shrink-0 w-28">
            <p className={`text-sm font-bold font-mono ${c.prejuizo ? 'text-rose-400' : corMargem(c.margem ?? 0)}`}>{(c.margem ?? 0).toFixed(1)}%</p>
            <p className={`text-[10px] font-mono ${c.lucro < 0 ? 'text-rose-400' : 'text-slate-400'}`}>{c.lucro < 0 ? 'prejuízo ' : 'lucro '}{R$(c.lucro)}</p>
          </div>
        )}
      </div>
      {c.prejuizo && (
        <div className="mt-1.5">
          <p className="text-[10px] text-rose-400 font-semibold flex items-center gap-1 mb-1"><AlertTriangle className="h-3 w-3" /> Atenção: venda abaixo do custo composto!</p>
          <select value={c.st.motivo} onChange={e => set(p.produtoId, { motivo: e.target.value })}
            className={`w-full bg-slate-900 border rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none ${c.st.motivo ? 'border-slate-600' : 'border-rose-500/60'}`}>
            <option value="">Motivo da Execução (obrigatório)…</option>
            {MOTIVOS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

function Switch({ on, onClick, small }: { on: boolean; onClick: () => void; small?: boolean }) {
  const w = small ? 'h-4 w-7' : 'h-5 w-9';
  const dot = small ? 'h-3 w-3' : 'h-4 w-4';
  return (
    <span onClick={onClick} className={`relative inline-flex ${w} items-center rounded-full cursor-pointer transition-colors ${on ? 'bg-violet-500' : 'bg-slate-700'}`}>
      <span className={`inline-block ${dot} transform rounded-full bg-white transition-transform ${on ? (small ? 'translate-x-3.5' : 'translate-x-4') : 'translate-x-0.5'}`} />
    </span>
  );
}

function MiniStat({ label, valor, cor }: { label: string; valor: string; cor: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-2 py-2 text-center">
      <p className="text-[9px] text-slate-500 uppercase tracking-wide font-semibold">{label}</p>
      <p className={`text-base font-bold font-mono ${cor}`}>{valor}</p>
    </div>
  );
}

const CORES: Record<string, string> = {
  amber: 'bg-amber-400/10 text-amber-300',
  sky: 'bg-sky-400/10 text-sky-300',
  rose: 'bg-rose-400/10 text-rose-300',
  emerald: 'bg-emerald-400/10 text-emerald-300',
};
function Kpi({ icon, label, valor, cor }: { icon: any; label: string; valor: string; cor: string }) {
  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${CORES[cor]}`}>{icon}</span>
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider truncate">{label}</p>
      </div>
      <p className="text-2xl font-extrabold text-white tracking-tight truncate">{valor}</p>
    </div>
  );
}
