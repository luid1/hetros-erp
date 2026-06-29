import { useState, useEffect, useCallback } from 'react';
import { DollarSign, RefreshCw, Save } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

const R$ = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FreteMotoristas() {
  const { filialAtiva } = useAuth();
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [linhas, setLinhas] = useState<any[]>([]);
  const [totais, setTotais] = useState<any>({ nfeTotal: 0, valorFrete: 0, percentual: 0 });
  const [loading, setLoading] = useState(false);
  const [editValores, setEditValores] = useState<Record<string, string>>({});
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const carregar = useCallback(() => {
    if (!filialAtiva) return;
    setLoading(true);
    api.get(`/carga/${filialAtiva.id}/fechamento-frete`, { params: { data } })
      .then(r => {
        setLinhas(r.data.linhas);
        setTotais(r.data.totais);
        const ev: Record<string, string> = {};
        r.data.linhas.forEach((l: any) => ev[l.id] = String(l.valorFrete || ''));
        setEditValores(ev);
      })
      .catch(() => { setLinhas([]); setTotais({ nfeTotal: 0, valorFrete: 0, percentual: 0 }); })
      .finally(() => setLoading(false));
  }, [filialAtiva?.id, data]);

  useEffect(() => { carregar(); }, [filialAtiva?.id, data]);

  const salvarFrete = async (id: string) => {
    setSalvandoId(id);
    try {
      await api.patch(`/carga/romaneio/${id}/frete`, { valorFrete: parseFloat(editValores[id]) || 0 });
      carregar();
    } catch {
      alert('Erro ao salvar o frete.');
    } finally { setSalvandoId(null); }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between shrink-0">
        <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-amber-600" /> Frete por Motorista
        </h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-gray-600 font-semibold text-xs">
            Data:
            <input type="date" value={data} onChange={e => setData(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs" />
          </label>
          <button onClick={carregar} className="flex items-center gap-1 bg-white border border-gray-300 hover:bg-amber-50 px-3 py-1.5 rounded text-gray-700 font-medium text-xs">
            <RefreshCw className="h-3.5 w-3.5 text-amber-600" /> Atualizar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full" /></div>
        ) : (
          <div className="border-2 border-amber-700 rounded overflow-hidden shadow-sm">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-amber-700 text-white text-[11px]">
                  {['DATA', 'MOTORISTA', 'VEÍCULO', 'CLIENTE', 'FRETE', 'NF-E', 'PERCENTUAL'].map(h => (
                    <th key={h} className="px-2 py-2 font-bold border border-amber-600 text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={l.id} className={i % 2 ? 'bg-amber-50' : 'bg-amber-100/60'}>
                    <td className="px-2 py-1.5 border border-amber-200 text-center whitespace-nowrap">
                      {l.data ? new Date(l.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
                    </td>
                    <td className="px-2 py-1.5 border border-amber-200 font-semibold">{l.motorista}</td>
                    <td className="px-2 py-1.5 border border-amber-200 text-center">{l.veiculo}</td>
                    <td className="px-2 py-1.5 border border-amber-200">{l.clientes}</td>
                    <td className="px-1 py-1 border border-amber-200 text-right whitespace-nowrap">
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-gray-500">R$</span>
                        <input type="number" min="0" step="0.01" value={editValores[l.id] ?? ''}
                          onChange={e => setEditValores({ ...editValores, [l.id]: e.target.value })}
                          onBlur={() => { if ((parseFloat(editValores[l.id]) || 0) !== Number(l.valorFrete)) salvarFrete(l.id); }}
                          className="w-24 border border-amber-300 rounded px-1.5 py-1 text-right bg-white" />
                        {salvandoId === l.id && <Save className="h-3 w-3 text-amber-600 animate-pulse" />}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 border border-amber-200 text-right font-mono whitespace-nowrap">{R$(l.nfeTotal)}</td>
                    <td className="px-2 py-1.5 border border-amber-200 text-center font-bold">{l.percentual.toFixed(0)}%</td>
                  </tr>
                ))}
                {linhas.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-amber-700 bg-amber-50 italic">
                    Nenhuma rota montada nesta data. Roteirize pedidos no Controle de Carga.
                  </td></tr>
                )}
              </tbody>
              {linhas.length > 0 && (
                <tfoot>
                  <tr className="bg-amber-700 text-white font-bold">
                    <td className="px-2 py-2 border border-amber-600 text-center" colSpan={4}>TOTAL</td>
                    <td className="px-2 py-2 border border-amber-600 text-right font-mono">{R$(totais.valorFrete)}</td>
                    <td className="px-2 py-2 border border-amber-600 text-right font-mono">{R$(totais.nfeTotal)}</td>
                    <td className="px-2 py-2 border border-amber-600 text-center">{totais.percentual.toFixed(0)}%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        <p className="text-[11px] text-gray-400 mt-2">
          O <strong>frete</strong> é digitado por rota e salvo automaticamente. <strong>NF-E</strong> = soma dos pedidos da rota ·
          <strong> Percentual</strong> = frete ÷ NF-E.
        </p>
      </div>
    </div>
  );
}
