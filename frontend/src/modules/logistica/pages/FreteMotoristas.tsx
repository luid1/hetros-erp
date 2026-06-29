import { useState, useEffect, useCallback } from 'react';
import { DollarSign, RefreshCw, Truck, Receipt, Percent, Route } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

const R$ = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const veiculoCor: Record<string, string> = {
  VAN: 'bg-blue-100 text-blue-700',
  'VAN REFRIGERADA': 'bg-cyan-100 text-cyan-700',
  KOMBI: 'bg-purple-100 text-purple-700',
  'MINI-VAN': 'bg-indigo-100 text-indigo-700',
  HR: 'bg-orange-100 text-orange-700',
};
// cor do percentual: baixo=verde, médio=âmbar, alto=vermelho
const pctCor = (p: number) => p === 0 ? 'bg-gray-100 text-gray-400'
  : p <= 10 ? 'bg-green-100 text-green-700'
  : p <= 18 ? 'bg-amber-100 text-amber-700'
  : 'bg-red-100 text-red-700';

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
        r.data.linhas.forEach((l: any) => ev[l.id] = l.valorFrete ? String(l.valorFrete) : '');
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
    } catch { alert('Erro ao salvar o frete.'); }
    finally { setSalvandoId(null); }
  };

  const Kpi = ({ icon: Icon, label, valor, cor }: any) => (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm flex-1">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${cor}`}><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
        <p className="text-lg font-bold text-gray-900 leading-tight">{valor}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Cabeçalho */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-500" /> Frete por Motorista
          </h1>
          <p className="text-xs text-gray-400">Fechamento de frete das rotas do dia</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={data} onChange={e => setData(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-amber-300" />
          <button onClick={carregar} className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-gray-700 font-medium text-sm">
            <RefreshCw className="h-4 w-4 text-amber-500" /> Atualizar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* KPIs */}
        <div className="flex gap-3">
          <Kpi icon={Route}   label="Rotas"      valor={linhas.length} cor="bg-blue-50 text-blue-600" />
          <Kpi icon={Truck}   label="Total Frete" valor={R$(totais.valorFrete)} cor="bg-amber-50 text-amber-600" />
          <Kpi icon={Receipt} label="Total NF-e"  valor={R$(totais.nfeTotal)} cor="bg-green-50 text-green-600" />
          <Kpi icon={Percent} label="% Médio"     valor={`${totais.percentual.toFixed(1)}%`} cor="bg-purple-50 text-purple-600" />
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full" /></div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[11px] uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold">Data</th>
                  <th className="px-4 py-3 text-left font-semibold">Motorista</th>
                  <th className="px-4 py-3 text-center font-semibold">Veículo</th>
                  <th className="px-4 py-3 text-left font-semibold">Clientes</th>
                  <th className="px-4 py-3 text-right font-semibold">Frete</th>
                  <th className="px-4 py-3 text-right font-semibold">NF-e</th>
                  <th className="px-4 py-3 text-center font-semibold">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {linhas.map(l => {
                  const pct = (parseFloat(editValores[l.id]) || 0) > 0 && l.nfeTotal > 0
                    ? ((parseFloat(editValores[l.id]) || 0) / l.nfeTotal) * 100 : l.percentual;
                  return (
                    <tr key={l.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                        {l.data ? new Date(l.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-gray-900 whitespace-nowrap">
                        {l.motorista}
                        <span className="block text-[10px] text-gray-400 font-normal">Rota #{l.numero} · {l.qtdEntregas} entr.</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${veiculoCor[l.veiculo] || 'bg-gray-100 text-gray-600'}`}>{l.veiculo}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs max-w-[340px]">{l.clientes}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50/50 overflow-hidden focus-within:ring-2 focus-within:ring-amber-300">
                          <span className="text-gray-400 text-xs pl-2">R$</span>
                          <input type="number" min="0" step="0.01" placeholder="0,00" value={editValores[l.id] ?? ''}
                            onChange={e => setEditValores({ ...editValores, [l.id]: e.target.value })}
                            onBlur={() => { if ((parseFloat(editValores[l.id]) || 0) !== Number(l.valorFrete)) salvarFrete(l.id); }}
                            className="w-24 px-2 py-1.5 text-right bg-transparent outline-none font-mono text-gray-900" />
                        </div>
                        {salvandoId === l.id && <span className="block text-[9px] text-amber-600 mt-0.5">salvando…</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-700 whitespace-nowrap">{R$(l.nfeTotal)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${pctCor(pct)}`}>{pct.toFixed(1)}%</span>
                      </td>
                    </tr>
                  );
                })}
                {linhas.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                    <Truck className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                    <p className="text-sm font-medium">Nenhuma rota montada nesta data</p>
                    <p className="text-xs mt-1">Roteirize pedidos no Controle de Carga para lançar o frete.</p>
                  </td></tr>
                )}
              </tbody>
              {linhas.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-gray-800">
                    <td className="px-4 py-3" colSpan={4}>TOTAL · {linhas.length} rota{linhas.length !== 1 ? 's' : ''}</td>
                    <td className="px-4 py-3 text-right font-mono text-amber-700">{R$(totais.valorFrete)}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-700">{R$(totais.nfeTotal)}</td>
                    <td className="px-4 py-3 text-center">{totais.percentual.toFixed(1)}%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        <p className="text-xs text-gray-400">
          O <strong>frete</strong> é digitado por rota e salvo automaticamente · <strong>NF-e</strong> = soma dos pedidos da rota ·
          <strong> %</strong> = frete ÷ NF-e.
        </p>
      </div>
    </div>
  );
}
