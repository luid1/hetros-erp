import { useState, useEffect, useCallback } from 'react';
import { Receipt, RefreshCw, FileText, Printer, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { imprimirDanfe } from '../danfe';

const R$ = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function Faturamento() {
  const { filialAtiva } = useAuth();
  const [data, setData] = useState(hojeISO());
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: number; erros: string[] } | null>(null);
  const [andamento, setAndamento] = useState<string>('');

  const carregar = useCallback(() => {
    if (!filialAtiva) return;
    setLoading(true);
    api.get('/pedidos', { params: { filialId: filialAtiva.id, status: 'SEPARADO', dataInicio: data, dataFim: data } })
      .then(r => { setPedidos(r.data); setSel(new Set()); })
      .catch(() => setPedidos([]))
      .finally(() => setLoading(false));
  }, [filialAtiva?.id, data]);
  useEffect(() => { carregar(); }, [carregar]);

  const toggle = (id: string) => setSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSel(sel.size === pedidos.length ? new Set() : new Set(pedidos.map(p => p.id)));

  // Fatura um pedido: gera NF-e + emite (mock SEFAZ). Devolve a NF-e emitida.
  const faturarUm = async (pedidoId: string) => {
    const { data: nfe } = await api.post(`/nfe/gerar-de-pedido/${pedidoId}`, { filialId: filialAtiva!.id });
    await api.post(`/nfe/${nfe.id}/emitir`);
    const { data: full } = await api.get(`/nfe/documento/${nfe.id}`);
    return full;
  };

  const faturarSelecionados = async () => {
    if (sel.size === 0 || processando) return;
    setProcessando(true); setResultado(null);
    const ids = Array.from(sel);
    let ok = 0; const erros: string[] = []; let ultima: any = null;
    for (let i = 0; i < ids.length; i++) {
      const p = pedidos.find(x => x.id === ids[i]);
      setAndamento(`Faturando ${i + 1}/${ids.length} — ${p?.cliente?.nomeFantasia || p?.cliente?.razaoSocial || ''}`);
      try { ultima = await faturarUm(ids[i]); ok++; }
      catch (e: any) { erros.push(`${p?.cliente?.razaoSocial || ids[i]}: ${e.response?.data?.message || 'erro'}`); }
    }
    setAndamento('');
    setProcessando(false);
    setResultado({ ok, erros });
    carregar();
    if (ok === 1 && ultima) imprimirDanfe(ultima); // 1 só → já abre a DANFE
  };

  const faturarLinha = async (pedidoId: string) => {
    if (processando) return;
    setProcessando(true); setResultado(null);
    try { const nfe = await faturarUm(pedidoId); carregar(); imprimirDanfe(nfe); }
    catch (e: any) { alert(e.response?.data?.message || 'Erro ao faturar.'); }
    finally { setProcessando(false); }
  };

  const totalSel = pedidos.filter(p => sel.has(p.id)).reduce((s, p) => s + Number(p.valorTotal || 0), 0);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2"><Receipt className="h-5 w-5 text-emerald-500" /> Faturamento</h1>
          <p className="text-xs text-gray-400 mt-0.5">{pedidos.length} pedido(s) liberado(s) p/ faturamento</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-gray-600 font-semibold text-sm">Dia:
            <input type="date" value={data} onChange={e => setData(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </label>
          <button onClick={carregar} className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg text-gray-700 font-medium text-sm">
            <RefreshCw className="h-4 w-4 text-emerald-600" /> Atualizar
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 text-xs text-amber-800 flex items-center gap-2 shrink-0">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
        Modo de teste: gera a NF-e e baixa estoque + conta a receber, mas <b>não transmite para a SEFAZ</b> (sem validade fiscal).
      </div>

      {/* Barra de ação em lote */}
      <div className="bg-white border-b border-gray-200 px-5 py-2 flex items-center justify-between shrink-0">
        <span className="text-sm text-gray-500">
          {sel.size > 0 ? <><b>{sel.size}</b> selecionado(s) · total {R$(totalSel)}</> : 'Selecione pedidos para faturar em lote'}
        </span>
        <button onClick={faturarSelecionados} disabled={sel.size === 0 || processando}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-5 py-2 text-sm font-bold disabled:opacity-40">
          {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {processando ? 'Faturando…' : `Faturar selecionados (${sel.size})`}
        </button>
      </div>

      {processando && andamento && <div className="px-5 py-2 text-xs text-emerald-700 bg-emerald-50 border-b border-emerald-200">{andamento}</div>}
      {resultado && (
        <div className={`px-5 py-2 text-xs border-b ${resultado.erros.length ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          <b>{resultado.ok}</b> faturado(s) com sucesso{resultado.erros.length > 0 && <> · <b>{resultado.erros.length}</b> com erro: {resultado.erros.join(' · ')}</>}.
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>
        ) : pedidos.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <Receipt className="h-10 w-10 mx-auto mb-2 text-gray-200" />
            Nenhum pedido liberado para faturamento nesta data. Separe pedidos na Operacional primeiro.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-xs text-gray-600">
                <tr>
                  <th className="w-10 px-3 py-2"><input type="checkbox" checked={sel.size === pedidos.length && pedidos.length > 0} onChange={toggleAll} className="accent-emerald-600 h-4 w-4" /></th>
                  {['Nº', 'Cliente', 'Itens', 'Peso (kg)', 'Valor', ''].map(h => <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {pedidos.map(p => (
                  <tr key={p.id} className={`border-t border-gray-100 ${sel.has(p.id) ? 'bg-emerald-50/50' : 'hover:bg-gray-50'}`}>
                    <td className="px-3 py-2"><input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} className="accent-emerald-600 h-4 w-4" /></td>
                    <td className="px-3 py-2 font-bold text-blue-700">{p.numero}</td>
                    <td className="px-3 py-2 font-semibold text-gray-900">{p.cliente?.nomeFantasia || p.cliente?.razaoSocial}</td>
                    <td className="px-3 py-2 text-center">{p._count?.itens ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-mono">{(Number(p.pesoTotal) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{R$(p.valorTotal)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => faturarLinha(p.id)} disabled={processando}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded px-3 py-1.5 text-xs font-bold disabled:opacity-40 ml-auto">
                        <Check className="h-3.5 w-3.5" /> Faturar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1"><Printer className="h-3 w-3" /> Ao faturar, a DANFE (modo teste) abre para impressão. As notas ficam em "NF-e Emitidas".</p>
      </div>
    </div>
  );
}
