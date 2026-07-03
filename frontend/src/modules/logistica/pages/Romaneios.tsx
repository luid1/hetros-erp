import { useState, useEffect, useCallback } from 'react';
import { Route, RefreshCw, Truck, Printer, ArrowLeft, Play, CheckCircle2, Snowflake, MapPin } from 'lucide-react';
import { toast, confirmDialog } from '../../../components/ui/feedback';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { CadastroShell, TopBar, TableCard, Th, Loader, Vazio } from '../../cadastros/ui';

const R$ = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const nkg = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const dt = (v: any) => v ? new Date(v).toLocaleDateString('pt-BR') : '—';
const up = (s: any) => String(s || '').toUpperCase();

const STATUS: Record<string, { label: string; cls: string }> = {
  ABERTO:           { label: 'Em montagem', cls: 'bg-amber-500/15 text-amber-400' },
  EM_ROTA:          { label: 'Em trânsito', cls: 'bg-sky-500/15 text-sky-400' },
  ENTREGUE_PARCIAL: { label: 'Parcial',     cls: 'bg-violet-500/15 text-violet-400' },
  ENTREGUE:         { label: 'Concluído',   cls: 'bg-emerald-500/15 text-emerald-400' },
  RETORNADO:        { label: 'Retornado',   cls: 'bg-slate-500/20 text-slate-300' },
};

const hojeISO = () => new Date().toISOString().slice(0, 10);
const menos = (dias: number) => new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);

export default function Romaneios() {
  const { filialAtiva } = useAuth();
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [ini, setIni] = useState(menos(7));
  const [fim, setFim] = useState(hojeISO());
  const [status, setStatus] = useState('');

  const carregar = useCallback(() => {
    if (!filialAtiva) return;
    setLoading(true);
    api.get('/romaneios', { params: { filialId: filialAtiva.id, dataIni: ini, dataFim: fim, status: status || undefined } })
      .then(r => setLista(r.data)).catch(() => setLista([])).finally(() => setLoading(false));
  }, [filialAtiva?.id, ini, fim, status]);
  useEffect(() => { carregar(); }, [carregar]);

  if (abertoId) return <Detalhe id={abertoId} onVoltar={() => { setAbertoId(null); carregar(); }} />;

  return (
    <CadastroShell>
      <TopBar icon={<Route className="h-5 w-5" />} titulo="Romaneios" subtitulo={`${lista.length} viagem(ns)`}
        extra={
          <div className="flex items-center gap-2">
            <input type="date" value={ini} onChange={e => setIni(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-100" />
            <span className="text-slate-500 text-xs">até</span>
            <input type="date" value={fim} onChange={e => setFim(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-100" />
            <select value={status} onChange={e => setStatus(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-100">
              <option value="">Todos os status</option>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={carregar} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-200 text-sm"><RefreshCw className="h-4 w-4 text-sky-400" /> Atualizar</button>
          </div>
        } />

      <div className="flex-1 overflow-auto p-4">
        {loading ? <Loader /> : lista.length === 0 ? (
          <Vazio icon={<Route className="h-10 w-10" />} texto="Nenhum romaneio no período. Monte rotas no Controle de Carga → Nova Entrega." />
        ) : (
          <TableCard>
            <thead><tr>{['Nº', 'Veículo / Placa', 'Motorista', 'Período', 'Entregas', 'Peso', 'Valor', 'Status', ''].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {lista.map(r => {
                const st = STATUS[r.status] || { label: r.status, cls: 'bg-slate-700' };
                const ocup = r.capacidadeKg ? (r.pesoKg / r.capacidadeKg) * 100 : null;
                return (
                  <tr key={r.id} className="border-t border-slate-800 hover:bg-sky-500/5 cursor-pointer" onClick={() => setAbertoId(r.id)}>
                    <td className="px-3 py-2.5 font-mono font-bold text-slate-100">#{r.numero}</td>
                    <td className="px-3 py-2.5 text-slate-300"><span className="inline-flex items-center gap-1.5">{r.refrigerado && <Snowflake className="h-3.5 w-3.5 text-cyan-400" />}{r.placa} <span className="text-slate-500 text-xs">{r.tipoVeiculo}</span></span></td>
                    <td className="px-3 py-2.5 text-slate-300">{r.motorista}</td>
                    <td className="px-3 py-2.5 text-slate-400 text-xs">{up(r.periodo)} · {dt(r.dataEntrega)}</td>
                    <td className="px-3 py-2.5 text-center text-slate-300">{r.entregues}/{r.qtdEntregas}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-300">{nkg(r.pesoKg)} kg{ocup != null && <span className={`ml-1 text-[10px] ${ocup > 100 ? 'text-rose-400' : ocup >= 90 ? 'text-amber-400' : 'text-slate-500'}`}>({ocup.toFixed(0)}%)</span>}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-300">{R$(r.valorTotal)}</td>
                    <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>{st.label}</span></td>
                    <td className="px-3 py-2.5 text-right"><button onClick={e => { e.stopPropagation(); setAbertoId(r.id); }} className="text-[11px] bg-sky-500/10 text-sky-300 border border-sky-500/30 px-2 py-1 rounded font-semibold hover:bg-sky-500/20">Abrir</button></td>
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

function Detalhe({ id, onVoltar }: { id: string; onVoltar: () => void }) {
  const [r, setR] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(() => {
    setLoading(true);
    api.get(`/romaneios/${id}`).then(res => setR(res.data)).finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { carregar(); }, [carregar]);

  const mudarStatus = async (status: string, msg: string) => {
    if (!await confirmDialog(msg)) return;
    try { await api.patch(`/romaneios/${id}/status`, { status }); toast('Status atualizado.', 'success'); carregar(); }
    catch (e: any) { toast(e.response?.data?.message || 'Erro ao mudar status.', 'error'); }
  };
  const marcar = async (itemId: string, entregue: boolean) => {
    try { await api.patch(`/romaneios/item/${itemId}/entrega`, { entregue }); carregar(); }
    catch { toast('Erro ao marcar entrega.', 'error'); }
  };

  if (loading || !r) return <CadastroShell><Loader /></CadastroShell>;

  const st = STATUS[r.status] || { label: r.status, cls: 'bg-slate-700' };
  const itens = r.itens || [];
  const pesoKg = itens.reduce((s: number, i: any) => s + Number(i.pedido?.pesoTotal || 0), 0);
  const caixas = itens.reduce((s: number, i: any) => s + Number(i.pedido?.volumes || 0), 0);
  const entregues = itens.filter((i: any) => i.entregue).length;

  return (
    <CadastroShell>
      <TopBar icon={<Route className="h-5 w-5" />} titulo={`Romaneio #${r.numero}`} subtitulo={`${r.veiculo?.placa || r.placaVeiculo || '—'} · ${r.motorista || '—'} · ${st.label}`}
        extra={
          <div className="flex items-center gap-2">
            <button onClick={onVoltar} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-200 text-sm"><ArrowLeft className="h-4 w-4" /> Voltar</button>
            <button onClick={() => imprimirRomaneio(r)} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-200 text-sm"><Printer className="h-4 w-4 text-sky-400" /> Imprimir</button>
            {r.status === 'ABERTO' && <button onClick={() => mudarStatus('EM_ROTA', 'Iniciar o trânsito desta viagem?')} className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg font-bold text-sm"><Play className="h-4 w-4" /> Iniciar trânsito</button>}
            {(r.status === 'EM_ROTA' || r.status === 'ENTREGUE_PARCIAL') && <button onClick={() => mudarStatus('ENTREGUE', 'Concluir a viagem (todas as entregas feitas)?')} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm"><CheckCircle2 className="h-4 w-4" /> Concluir</button>}
          </div>
        } />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Info label="Veículo" valor={`${r.veiculo?.placa || '—'}`} icon={<Truck className="h-4 w-4 text-sky-300" />} />
          <Info label="Entregas" valor={`${entregues}/${itens.length}`} />
          <Info label="Peso total" valor={`${nkg(pesoKg)} kg`} />
          <Info label="Caixas" valor={String(caixas)} />
        </div>

        {/* Sequência de entrega */}
        <TableCard>
          <thead><tr>{['#', 'Cliente', 'Endereço', 'Volumes', 'Peso', 'Valor', 'Entregue'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {itens.map((i: any) => {
              const cli = i.pedido?.cliente || {};
              const end: any = cli.enderecoJson || {};
              const endTxt = [end.rua, end.numero].filter(Boolean).join(', ') + (end.bairro ? ' - ' + end.bairro : '');
              return (
                <tr key={i.id} className={`border-t border-slate-800 ${i.entregue ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2 font-mono font-bold text-sky-300">{i.ordemEntrega}</td>
                  <td className="px-3 py-2"><p className="font-semibold text-slate-100">{up(cli.nomeFantasia || cli.razaoSocial)}</p><p className="text-slate-500 text-xs">Pedido #{i.pedido?.numero}{i.pedido?.observacoes ? ` · ${up(i.pedido.observacoes)}` : ''}</p></td>
                  <td className="px-3 py-2 text-slate-400 text-xs"><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{endTxt || '—'}{end.cidade ? ` · ${up(end.cidade)}` : ''}</span></td>
                  <td className="px-3 py-2 text-right font-mono text-slate-300">{i.pedido?.volumes ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-300">{nkg(i.pedido?.pesoTotal)} kg</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-300">{R$(i.pedido?.valorTotal)}</td>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" checked={!!i.entregue} onChange={e => marcar(i.id, e.target.checked)} className="accent-emerald-500 h-4 w-4 cursor-pointer" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
      </div>
    </CadastroShell>
  );
}

function Info({ label, valor, icon }: { label: string; valor: string; icon?: any }) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/60 p-4">
      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide flex items-center gap-1">{icon}{label}</p>
      <p className="text-lg font-bold text-white mt-1">{valor}</p>
    </div>
  );
}

// ─── Checklist de entrega para o motorista (A4 simples) ───
function imprimirRomaneio(r: any) {
  const itens = r.itens || [];
  const pesoKg = itens.reduce((s: number, i: any) => s + Number(i.pedido?.pesoTotal || 0), 0);
  const linhas = itens.map((i: any) => {
    const cli = i.pedido?.cliente || {};
    const end: any = cli.enderecoJson || {};
    const endTxt = [end.rua, end.numero].filter(Boolean).join(', ') + (end.bairro ? ' - ' + end.bairro : '') + (end.cidade ? ' · ' + end.cidade : '');
    return `<tr>
      <td class="c">${i.ordemEntrega}</td>
      <td><b>${up(cli.nomeFantasia || cli.razaoSocial || '—')}</b><br/><span class="s">Ped #${i.pedido?.numero || ''} ${i.pedido?.observacoes ? '· ' + up(i.pedido.observacoes) : ''}</span></td>
      <td class="s">${up(endTxt) || '—'}</td>
      <td class="c">${i.pedido?.volumes ?? ''}</td>
      <td class="c">${nkg(i.pedido?.pesoTotal)}</td>
      <td class="c">[ &nbsp; ]</td>
      <td></td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Romaneio ${r.numero}</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: Arial, sans-serif; font-size: 12px; color:#000; }
  h1 { font-size: 18px; margin:0; } .hd { display:flex; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:6px; margin-bottom:8px; }
  .meta { font-size: 12px; } .meta b { display:inline-block; min-width:70px; }
  table { width:100%; border-collapse:collapse; margin-top:8px; }
  th,td { border:1px solid #999; padding:5px 6px; text-align:left; vertical-align:top; }
  th { background:#eee; font-size:11px; } .c { text-align:center; } .s { font-size:10px; color:#333; }
  .foot { margin-top:14px; font-size:11px; display:flex; justify-content:space-between; }
  @media print { button { display:none; } }
</style></head><body>
  <div class="hd">
    <div><h1>HETROS — Romaneio de Entrega</h1><div class="meta">Viagem <b>#${r.numero}</b></div></div>
    <div class="meta" style="text-align:right">
      <div><b>Motorista:</b> ${up(r.motorista || '—')}</div>
      <div><b>Veículo:</b> ${r.veiculo?.placa || r.placaVeiculo || '—'} (${r.tipoVeiculo || 'VAN'})</div>
      <div><b>Data:</b> ${dt(r.dataEntrega)} · ${up(r.periodo || '')}</div>
    </div>
  </div>
  <table>
    <thead><tr><th class="c">Seq</th><th>Cliente</th><th>Endereço</th><th class="c">Vol</th><th class="c">Peso</th><th class="c">Entregue</th><th>Assinatura / Recebedor</th></tr></thead>
    <tbody>${linhas || '<tr><td colspan="7" class="c">Sem entregas</td></tr>'}</tbody>
  </table>
  <div class="foot">
    <span><b>Total de entregas:</b> ${itens.length} &nbsp;·&nbsp; <b>Peso total:</b> ${nkg(pesoKg)} kg</span>
    <span>Km inicial: __________ &nbsp; Km final: __________</span>
  </div>
  <p style="margin-top:24px;font-size:11px">Assinatura do motorista: ______________________________________</p>
  <script>window.print();</script>
</body></html>`;
  const w = window.open('', '_blank', 'width=800,height=900');
  if (w) { w.document.write(html); w.document.close(); }
}
