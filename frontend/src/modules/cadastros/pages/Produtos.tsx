import { useState, useEffect, useCallback } from 'react';
import { Package, Search, Pencil, X, Check, Scale, AlertTriangle } from 'lucide-react';
import api from '../../../services/api';

const R$ = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const kg3 = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

interface Produto {
  id: string; codigo: string; descricao: string; codigoBarras?: string | null;
  ncm?: string; cfop?: string | null; categoria?: string | null; grupo?: string | null; marca?: string | null;
  pesoLiquido?: string | null; pesoBruto?: string | null; precoVenda?: string | null;
  unidadeMedida?: { sigla: string };
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Produto | null>(null);

  const carregar = useCallback(() => {
    setLoading(true);
    api.get('/produtos', { params: { q: busca || undefined } })
      .then(r => setProdutos(r.data)).catch(() => setProdutos([])).finally(() => setLoading(false));
  }, [busca]);
  useEffect(() => { const t = setTimeout(carregar, 250); return () => clearTimeout(t); }, [carregar]);

  const semPeso = produtos.filter(p => !Number(p.pesoLiquido)).length;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2"><Package className="h-5 w-5 text-sky-500" /> Produtos & NCM</h1>
          <p className="text-xs text-gray-400 mt-0.5">{produtos.length} produtos · {semPeso} sem peso unitário</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, código ou barras..."
            className="w-full border border-gray-300 rounded-lg pl-8 pr-2 py-2 text-sm focus:ring-2 focus:ring-sky-400" />
        </div>
      </div>

      {semPeso > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 text-xs text-amber-800 flex items-center gap-2 shrink-0">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          {semPeso} produto(s) sem <b>peso unitário</b> — preencha pra a divergência da pesagem (itens CX/UN) ficar correta.
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-6 w-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-xs text-gray-600">
                <tr>{['Código', 'Descrição', 'Un', 'Peso unit. (kg)', 'Preço venda', 'Categoria', ''].map(h => <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {produtos.map(p => {
                  const semp = !Number(p.pesoLiquido);
                  return (
                    <tr key={p.id} className="border-t border-gray-100 hover:bg-sky-50/40">
                      <td className="px-3 py-2 font-mono text-gray-500">{p.codigo}</td>
                      <td className="px-3 py-2 font-semibold text-gray-900">{p.descricao}</td>
                      <td className="px-3 py-2 text-gray-500">{p.unidadeMedida?.sigla}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-mono ${semp ? 'text-amber-500 font-bold' : 'text-gray-700'}`}>{semp ? '—' : kg3(p.pesoLiquido)}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700">{R$(Number(p.precoVenda))}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{p.categoria || '—'}</td>
                      <td className="px-3 py-2 text-right"><button onClick={() => setEdit(p)} className="text-gray-400 hover:text-sky-600 p-1"><Pencil className="h-4 w-4" /></button></td>
                    </tr>
                  );
                })}
                {produtos.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Nenhum produto encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {edit && <ModalProduto produto={edit} onClose={() => setEdit(null)} onSalvo={() => { setEdit(null); carregar(); }} />}
    </div>
  );
}

const lbl = 'block text-[11px] font-semibold text-gray-500 mb-1';
const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-400';

function ModalProduto({ produto, onClose, onSalvo }: { produto: Produto; onClose: () => void; onSalvo: () => void }) {
  const [f, setF] = useState({
    descricao: produto.descricao || '', codigo: produto.codigo || '', codigoBarras: produto.codigoBarras || '',
    pesoLiquido: produto.pesoLiquido ? String(Number(produto.pesoLiquido)) : '',
    pesoBruto: produto.pesoBruto ? String(Number(produto.pesoBruto)) : '',
    precoVenda: produto.precoVenda ? String(Number(produto.precoVenda)) : '',
    categoria: produto.categoria || '', ncm: produto.ncm || '', cfop: produto.cfop || '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const salvar = async () => {
    setErro(''); setSalvando(true);
    try { await api.put(`/produtos/${produto.id}`, f); onSalvo(); }
    catch (e: any) { setErro(e.response?.data?.message || 'Erro ao salvar.'); }
    finally { setSalvando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="font-bold text-gray-900 truncate">{produto.descricao}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-3 overflow-auto">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><label className={lbl}>Descrição</label><input value={f.descricao} onChange={e => set('descricao', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Código</label><input value={f.codigo} onChange={e => set('codigo', e.target.value)} className={inp} /></div>
          </div>

          {/* Destaque: peso unitário */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mb-2"><Scale className="h-4 w-4" /> Peso para a Separação / Pesagem</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Peso líquido unitário (kg)</label>
                <input type="number" step="0.001" min="0" value={f.pesoLiquido} onChange={e => set('pesoLiquido', e.target.value)} className={inp} placeholder="ex: 0,208" />
                <p className="text-[10px] text-gray-400 mt-1">Peso de 1 unidade/caixa. Usado pra calcular o esperado em itens CX/UN.</p>
              </div>
              <div>
                <label className={lbl}>Peso bruto unitário (kg)</label>
                <input type="number" step="0.001" min="0" value={f.pesoBruto} onChange={e => set('pesoBruto', e.target.value)} className={inp} placeholder="opcional" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Preço venda (R$)</label><input type="number" step="0.01" min="0" value={f.precoVenda} onChange={e => set('precoVenda', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Categoria</label><input value={f.categoria} onChange={e => set('categoria', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Cód. barras</label><input value={f.codigoBarras} onChange={e => set('codigoBarras', e.target.value)} className={inp} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>NCM</label><input value={f.ncm} onChange={e => set('ncm', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>CFOP</label><input value={f.cfop} onChange={e => set('cfop', e.target.value)} className={inp} /></div>
          </div>
          {erro && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-bold disabled:opacity-40 flex items-center gap-1.5"><Check className="h-4 w-4" /> Salvar</button>
        </div>
      </div>
    </div>
  );
}
