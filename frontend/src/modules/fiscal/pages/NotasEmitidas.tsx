import { useState, useEffect, useCallback } from 'react';
import { FileText, RefreshCw, Printer, Ban } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { imprimirDanfe } from '../danfe';

const R$ = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_COR: Record<string, string> = {
  EMITIDO: 'bg-emerald-100 text-emerald-700',
  RASCUNHO: 'bg-gray-200 text-gray-600',
  PENDENTE_EMISSAO: 'bg-amber-100 text-amber-700',
  CANCELADO: 'bg-red-100 text-red-700',
  REJEITADO: 'bg-red-100 text-red-700',
};

export default function NotasEmitidas() {
  const { filialAtiva } = useAuth();
  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const carregar = useCallback(() => {
    if (!filialAtiva) return;
    setLoading(true);
    api.get(`/nfe/${filialAtiva.id}`).then(r => setNotas(r.data)).catch(() => setNotas([])).finally(() => setLoading(false));
  }, [filialAtiva?.id]);
  useEffect(() => { carregar(); }, [carregar]);

  const abrirDanfe = async (id: string) => {
    const { data } = await api.get(`/nfe/documento/${id}`);
    imprimirDanfe(data);
  };
  const cancelar = async (id: string) => {
    const motivo = prompt('Motivo do cancelamento (mín. 15 caracteres):');
    if (!motivo) return;
    try { await api.patch(`/nfe/${id}/cancelar`, { motivo }); carregar(); }
    catch (e: any) { alert(e.response?.data?.message || 'Erro ao cancelar.'); }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2"><FileText className="h-5 w-5 text-sky-500" /> NF-e Emitidas</h1>
          <p className="text-xs text-gray-400 mt-0.5">{notas.length} nota(s)</p>
        </div>
        <button onClick={carregar} className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg text-gray-700 font-medium text-sm">
          <RefreshCw className="h-4 w-4 text-sky-600" /> Atualizar
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-6 w-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>
        ) : notas.length === 0 ? (
          <div className="text-center text-gray-400 py-16"><FileText className="h-10 w-10 mx-auto mb-2 text-gray-200" /> Nenhuma NF-e emitida ainda.</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-xs text-gray-600">
                <tr>{['Nº/Série', 'Pedido', 'Cliente', 'Chave de acesso', 'Valor', 'Status', ''].map(h => <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {notas.map(n => (
                  <tr key={n.id} className="border-t border-gray-100 hover:bg-sky-50/40">
                    <td className="px-3 py-2 font-bold text-gray-800">{String(n.numero).padStart(6, '0')}/{n.serie}</td>
                    <td className="px-3 py-2 text-gray-500">{n.pedido?.numero ? `nº ${n.pedido.numero}` : '—'}</td>
                    <td className="px-3 py-2 font-semibold text-gray-900">{n.cliente?.razaoSocial}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-gray-500 max-w-[260px] truncate">{n.chaveAcesso || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{R$(n.valorNfe)}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COR[n.status] || 'bg-gray-100'}`}>{n.status}</span></td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => abrirDanfe(n.id)} className="text-gray-400 hover:text-sky-600 p-1" title="Imprimir DANFE"><Printer className="h-4 w-4" /></button>
                      {n.status === 'EMITIDO' && <button onClick={() => cancelar(n.id)} className="text-gray-400 hover:text-red-600 p-1" title="Cancelar"><Ban className="h-4 w-4" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
