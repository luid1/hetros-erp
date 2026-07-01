import { toast, promptDialog } from '../../../components/ui/feedback';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, RefreshCw, Trash2, ShieldAlert, CalendarClock } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { CadastroShell, TopBar, FilterBar, Chips, TableCard, Th, Loader, Vazio } from '../../cadastros/ui';

const num = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const dt = (v: any) => v ? new Date(v).toLocaleDateString('pt-BR') : '—';
const diasAte = (v: any) => { if (!v) return null; const d = Math.ceil((new Date(new Date(v).toDateString()).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000); return d; };

export default function Pereciveis() {
  const { filialAtiva } = useAuth();
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dias, setDias] = useState('7');
  const [busca, setBusca] = useState('');

  const carregar = useCallback(() => {
    if (!filialAtiva) return;
    setLoading(true);
    api.get(`/estoque/${filialAtiva.id}/alertas-validade`, { params: { dias } })
      .then(r => setLista(r.data)).catch(() => setLista([])).finally(() => setLoading(false));
  }, [filialAtiva?.id, dias]);
  useEffect(() => { carregar(); }, [carregar]);

  const filtradas = lista.filter(x => !busca.trim() || (x.produto?.descricao || '').toLowerCase().includes(busca.toLowerCase()));

  const kpis = useMemo(() => {
    let venc = 0, vencendo = 0;
    for (const x of filtradas) { const d = diasAte(x.lote?.dataValidade); if (d != null && d < 0) venc++; else if (d != null && d <= 2) vencendo++; }
    return { venc, vencendo, total: filtradas.length };
  }, [filtradas]);

  const baixar = async (item: any, tipo: 'PERDA' | 'AVARIA') => {
    const qtd = await promptDialog(`Quantidade a baixar como ${tipo} de "${item.produto?.descricao}" (lote ${item.lote?.numero || '—'})?`, String(item.quantidade));
    if (!qtd) return;
    try {
      await api.post('/estoque/ajuste', { filialId: filialAtiva!.id, produtoId: item.produtoId, loteId: item.loteId || undefined, tipo, quantidade: Number(qtd), observacoes: `Baixa ${tipo} por validade` });
      carregar();
    } catch (e: any) { toast(e.response?.data?.message || 'Erro ao baixar.'); }
  };

  const corDias = (d: number | null) => d == null ? 'text-slate-400' : d < 0 ? 'text-rose-400' : d <= 2 ? 'text-orange-400' : d <= Number(dias) ? 'text-amber-400' : 'text-emerald-400';

  return (
    <CadastroShell>
      <TopBar icon={<AlertTriangle className="h-5 w-5" />} titulo="Perecíveis / FLV" subtitulo="Controle FEFO — lotes vencendo por validade"
        extra={<button onClick={carregar} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-200 text-sm"><RefreshCw className="h-4 w-4 text-sky-400" /> Atualizar</button>} />

      <FilterBar busca={busca} onBusca={setBusca} placeholder="Buscar produto...">
        <span className="text-xs text-slate-400 font-semibold">Vencendo em até:</span>
        <Chips value={dias} onChange={setDias} options={[{ value: '3', label: '3 dias' }, { value: '7', label: '7 dias' }, { value: '15', label: '15 dias' }, { value: '30', label: '30 dias' }]} />
      </FilterBar>

      <div className="px-4 pt-4 grid grid-cols-3 gap-3">
        <div className="bg-[#111d33] border border-rose-500/30 rounded-xl p-3 flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center"><ShieldAlert className="h-5 w-5" /></div><div><p className="text-[10px] uppercase text-slate-500 font-semibold">Vencidos</p><p className="text-lg font-bold text-rose-400">{kpis.venc}</p></div></div>
        <div className="bg-[#111d33] border border-orange-500/30 rounded-xl p-3 flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center"><CalendarClock className="h-5 w-5" /></div><div><p className="text-[10px] uppercase text-slate-500 font-semibold">Vencendo (≤2 dias)</p><p className="text-lg font-bold text-orange-400">{kpis.vencendo}</p></div></div>
        <div className="bg-[#111d33] border border-slate-800 rounded-xl p-3 flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center"><AlertTriangle className="h-5 w-5" /></div><div><p className="text-[10px] uppercase text-slate-500 font-semibold">Lotes em alerta</p><p className="text-lg font-bold text-slate-100">{kpis.total}</p></div></div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? <Loader /> : filtradas.length === 0 ? <Vazio icon={<AlertTriangle className="h-10 w-10" />} texto="Nenhum lote vencendo nesse período. 🎉" /> : (
          <TableCard>
            <thead><tr>{['Produto', 'Lote', 'Validade', 'Dias restantes', 'Qtd', 'Localização', 'Ações'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {filtradas.map(x => {
                const d = diasAte(x.lote?.dataValidade);
                return (
                  <tr key={x.id} className="border-t border-slate-800 hover:bg-sky-500/5">
                    <td className="px-3 py-2.5"><p className="font-semibold text-slate-100">{x.produto?.descricao}</p><p className="text-slate-500 text-xs font-mono">{x.produto?.codigo}</p></td>
                    <td className="px-3 py-2.5 font-mono text-slate-300 text-xs">{x.lote?.numero || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-300">{dt(x.lote?.dataValidade)}</td>
                    <td className={`px-3 py-2.5 font-bold ${corDias(d)}`}>{d == null ? '—' : d < 0 ? `vencido há ${Math.abs(d)}d` : d === 0 ? 'vence hoje' : `${d} dia(s)`}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-200">{num(x.quantidade)}</td>
                    <td className="px-3 py-2.5 text-slate-400 text-xs">{x.localizacao ? `${x.localizacao.rua}-${x.localizacao.prateleira}` : '—'}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5">
                        <button onClick={() => baixar(x, 'PERDA')} className="text-[11px] bg-rose-500/10 text-rose-300 border border-rose-500/30 px-2 py-1 rounded font-semibold hover:bg-rose-500/20 flex items-center gap-1"><Trash2 className="h-3 w-3" /> Perda</button>
                        <button onClick={() => baixar(x, 'AVARIA')} className="text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-1 rounded font-semibold hover:bg-amber-500/20">Avaria</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableCard>
        )}
      </div>
    </CadastroShell>
  );
}
