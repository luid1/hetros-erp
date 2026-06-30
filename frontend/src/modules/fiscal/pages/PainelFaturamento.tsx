import { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3, RefreshCw, FileText, Landmark, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

const R$ = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const primeiroDiaMes = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const diaLabel = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7);

export default function PainelFaturamento() {
  const { filialAtiva } = useAuth();
  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ini, setIni] = useState(primeiroDiaMes());
  const [fim, setFim] = useState(hojeISO());

  const carregar = useCallback(() => {
    if (!filialAtiva) return;
    setLoading(true);
    api.get(`/nfe/${filialAtiva.id}`, { params: { dataInicio: ini, dataFim: fim + 'T23:59:59' } })
      .then(r => setNotas(r.data)).catch(() => setNotas([])).finally(() => setLoading(false));
  }, [filialAtiva?.id, ini, fim]);
  useEffect(() => { carregar(); }, [carregar]);

  // Considera apenas NF-e de venda emitidas (ignora devolução e canceladas)
  const validas = useMemo(() => notas.filter(n => n.status === 'EMITIDO' && n.finalidade !== '4'), [notas]);

  const kpis = useMemo(() => {
    const total = validas.reduce((s, n) => s + Number(n.valorNfe || 0), 0);
    const impostos = validas.reduce((s, n) => s + Number(n.valorIcms || 0) + Number(n.valorIcmsSt || 0) + Number(n.valorIpi || 0) + Number(n.valorPis || 0) + Number(n.valorCofins || 0), 0);
    const qtd = validas.length;
    return { total, impostos, qtd, ticket: qtd ? total / qtd : 0 };
  }, [validas]);

  // Faturamento por dia (para o gráfico)
  const porDia = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of validas) {
      const iso = (n.dataEmissao || '').slice(0, 10);
      if (!iso) continue;
      map.set(iso, (map.get(iso) || 0) + Number(n.valorNfe || 0));
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([dia, valor]) => ({ dia, valor }));
  }, [validas]);
  const maxDia = Math.max(1, ...porDia.map(d => d.valor));

  // Faturamento por cliente
  const porCliente = useMemo(() => {
    const map = new Map<string, { nome: string; valor: number; qtd: number }>();
    for (const n of validas) {
      const nome = n.cliente?.razaoSocial || '—';
      const cur = map.get(nome) || { nome, valor: 0, qtd: 0 };
      cur.valor += Number(n.valorNfe || 0); cur.qtd += 1;
      map.set(nome, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.valor - a.valor);
  }, [validas]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-emerald-500" /> Painel de Faturamento</h1>
          <p className="text-xs text-gray-400 mt-0.5">Visão gerencial do que foi faturado no período</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold">De
            <input type="date" value={ini} onChange={e => setIni(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold">Até
            <input type="date" value={fim} onChange={e => setFim(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </label>
          <button onClick={carregar} className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg text-gray-700 font-medium text-sm">
            <RefreshCw className="h-4 w-4 text-emerald-600" /> Atualizar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi icon={<TrendingUp className="h-5 w-5" />} cor="emerald" label="Faturamento no período" valor={R$(kpis.total)} />
              <Kpi icon={<Landmark className="h-5 w-5" />} cor="amber" label="Impostos (simulado)" valor={R$(kpis.impostos)} />
              <Kpi icon={<FileText className="h-5 w-5" />} cor="sky" label="Notas emitidas" valor={String(kpis.qtd)} />
              <Kpi icon={<Users className="h-5 w-5" />} cor="violet" label="Ticket médio" valor={R$(kpis.ticket)} />
            </div>

            {/* Gráfico de barras por dia */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-bold text-sm text-gray-700 mb-3">Faturamento por dia</h3>
              {porDia.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">Sem faturamento no período.</p>
              ) : (
                <div className="flex items-end gap-1.5 h-48 overflow-x-auto pt-4">
                  {porDia.map(d => (
                    <div key={d.dia} className="flex flex-col items-center gap-1 min-w-[34px] flex-1" title={`${diaLabel(d.dia)} — ${R$(d.valor)}`}>
                      <span className="text-[9px] text-gray-500 font-mono">{(d.valor / 1000).toFixed(1)}k</span>
                      <div className="w-full bg-emerald-500 hover:bg-emerald-400 rounded-t transition-all"
                        style={{ height: `${Math.max(4, (d.valor / maxDia) * 150)}px` }} />
                      <span className="text-[9px] text-gray-400">{diaLabel(d.dia)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Faturamento por cliente */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <h3 className="font-bold text-sm text-gray-700 px-4 py-3 border-b">Faturamento por cliente</h3>
              {porCliente.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">Nenhum cliente faturado.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>{['Cliente', 'Notas', 'Faturado', '% do total'].map(h => <th key={h} className="px-4 py-2 text-left font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {porCliente.map(c => (
                      <tr key={c.nome} className="border-t border-gray-100">
                        <td className="px-4 py-2 font-semibold text-gray-800">{c.nome}</td>
                        <td className="px-4 py-2 text-center">{c.qtd}</td>
                        <td className="px-4 py-2 text-right font-mono font-bold">{R$(c.valor)}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{kpis.total ? ((c.valor / kpis.total) * 100).toFixed(1) : '0'}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const CORES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
  violet: 'bg-violet-50 text-violet-600',
};
function Kpi({ icon, label, valor, cor }: { icon: any; label: string; valor: string; cor: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${CORES[cor]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 font-semibold uppercase truncate">{label}</p>
        <p className="text-lg font-bold text-gray-900 truncate">{valor}</p>
      </div>
    </div>
  );
}
