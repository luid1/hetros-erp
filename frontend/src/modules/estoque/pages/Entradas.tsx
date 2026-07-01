import { useState, useEffect, useCallback } from 'react';
import { PackagePlus, RefreshCw, Upload, Trash2, FileCode, Plus } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { CadastroShell, TopBar, FilterBar, TableCard, Th, Modal, Secao, Campo, Loader, Vazio, inp, R$ } from '../../cadastros/ui';

const dt = (v: any) => v ? new Date(v).toLocaleDateString('pt-BR') : '—';
const STATUS_COR: Record<string, string> = { CONFERIDA: 'bg-emerald-500/15 text-emerald-400', PENDENTE: 'bg-amber-500/15 text-amber-400', DIVERGENTE: 'bg-rose-500/15 text-rose-400', CANCELADA: 'bg-slate-600/40 text-slate-400' };

type Item = { produtoId: string; descricao: string; ncm: string; quantidade: string; unidade: string; valorUnitario: string; loteNumero: string; dataValidade: string };
const itemVazio = (): Item => ({ produtoId: '', descricao: '', ncm: '', quantidade: '', unidade: 'KG', valorUnitario: '', loteNumero: '', dataValidade: '' });

export default function Entradas() {
  const { filialAtiva } = useAuth();
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    api.get('/entradas', { params: { search: busca || undefined } })
      .then(r => setLista(r.data)).catch(() => setLista([])).finally(() => setLoading(false));
  }, [busca]);
  useEffect(() => { const t = setTimeout(carregar, 250); return () => clearTimeout(t); }, [carregar]);

  return (
    <CadastroShell>
      <TopBar icon={<PackagePlus className="h-5 w-5" />} titulo="Entradas (XML NF-e)" subtitulo={`${lista.length} entrada(s) — recebimento de mercadoria`}
        novoLabel="Nova Entrada" onNovo={() => setModal(true)}
        extra={<button onClick={carregar} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-200 text-sm"><RefreshCw className="h-4 w-4 text-sky-400" /> Atualizar</button>} />
      <FilterBar busca={busca} onBusca={setBusca} placeholder="Buscar por NF, chave ou fornecedor..." />

      <div className="flex-1 overflow-auto p-4">
        {loading ? <Loader /> : lista.length === 0 ? <Vazio icon={<PackagePlus className="h-10 w-10" />} texto="Nenhuma entrada registrada" /> : (
          <TableCard>
            <thead><tr>{['Data', 'Fornecedor', 'NF', 'Chave', 'Itens', 'Valor', 'Status'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {lista.map(e => (
                <tr key={e.id} className="border-t border-slate-800 hover:bg-sky-500/5">
                  <td className="px-3 py-2.5 text-slate-300">{dt(e.dataEntrada)}</td>
                  <td className="px-3 py-2.5 font-semibold text-slate-100">{e.fornecedor?.nomeFantasia || e.fornecedor?.razaoSocial}</td>
                  <td className="px-3 py-2.5 text-slate-300">{e.numeroNf ? `${e.numeroNf}/${e.serieNf || '1'}` : '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-500 text-[11px] max-w-[220px] truncate">{e.chaveNfeEntrada || '—'}</td>
                  <td className="px-3 py-2.5 text-center text-slate-300">{e._count?.itens ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-200">{R$(e.valorTotal)}</td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COR[e.status] || 'bg-slate-700'}`}>{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        )}
      </div>

      {modal && <ModalEntrada onClose={() => setModal(false)} onSalvo={() => { setModal(false); carregar(); }} filialId={filialAtiva?.id} />}
    </CadastroShell>
  );
}

function ModalEntrada({ onClose, onSalvo, filialId }: { onClose: () => void; onSalvo: () => void; filialId?: string }) {
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [fornecedorId, setFornecedorId] = useState('');
  const [numeroNf, setNumeroNf] = useState('');
  const [serieNf, setSerieNf] = useState('1');
  const [chave, setChave] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [itens, setItens] = useState<Item[]>([itemVazio()]);
  const [gerarCP, setGerarCP] = useState(true);
  const [dataVenc, setDataVenc] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    api.get('/fornecedores').then(r => setFornecedores(r.data)).catch(() => {});
    api.get('/produtos').then(r => setProdutos(r.data)).catch(() => {});
  }, []);

  const setItem = (i: number, k: keyof Item, v: string) => setItens(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const addItem = () => setItens(p => [...p, itemVazio()]);
  const delItem = (i: number) => setItens(p => p.filter((_, idx) => idx !== i));

  // Parse do XML da NF-e (feito no navegador)
  const onXml = async (file: File) => {
    setErro(''); setAviso('');
    try {
      const txt = await file.text();
      const doc = new DOMParser().parseFromString(txt, 'text/xml');
      const g = (parent: Element | Document, tag: string) => parent.getElementsByTagName(tag)[0]?.textContent || '';
      // Cabeçalho
      const inf = doc.getElementsByTagName('infNFe')[0];
      if (inf) { const id = inf.getAttribute('Id') || ''; setChave(id.replace(/\D/g, '').slice(-44)); }
      setNumeroNf(g(doc, 'nNF')); setSerieNf(g(doc, 'serie') || '1');
      const dhEmi = g(doc, 'dhEmi') || g(doc, 'dEmi'); if (dhEmi) setDataEmissao(dhEmi.slice(0, 10));
      // Itens
      const dets = Array.from(doc.getElementsByTagName('det'));
      const novos: Item[] = dets.map(det => {
        const prod = det.getElementsByTagName('prod')[0];
        const xProd = g(prod, 'xProd'); const ncm = g(prod, 'NCM'); const uCom = g(prod, 'uCom') || 'UN';
        const qCom = g(prod, 'qCom'); const vUn = g(prod, 'vUnCom');
        // tenta casar produto pelo NCM ou nome
        const match = produtos.find(p => (ncm && p.ncm === ncm) || (xProd && p.descricao?.toLowerCase() === xProd.toLowerCase()));
        return { produtoId: match?.id || '', descricao: xProd, ncm, unidade: uCom, quantidade: qCom, valorUnitario: vUn, loteNumero: '', dataValidade: '' };
      });
      if (novos.length) { setItens(novos); setAviso(`XML lido: ${novos.length} item(ns). Confira o vínculo dos produtos (itens sem vínculo não movimentam estoque).`); }
      else setErro('Não encontrei itens no XML.');
    } catch { setErro('Falha ao ler o XML.'); }
  };

  const salvar = async () => {
    if (!fornecedorId) return setErro('Selecione o fornecedor.');
    const itensValidos = itens.filter(i => i.descricao.trim() && Number(i.quantidade) > 0);
    if (itensValidos.length === 0) return setErro('Informe ao menos um item com quantidade.');
    setSalvando(true); setErro('');
    const payload = {
      fornecedorId, filialId, numeroNf: numeroNf || null, serieNf, chaveNfeEntrada: chave || null,
      dataEmissao: dataEmissao || null, gerarContaPagar: gerarCP, dataVencimento: dataVenc || null,
      itens: itensValidos.map(i => ({
        produtoId: i.produtoId || null, descricao: i.descricao.trim(), ncm: i.ncm || null,
        quantidade: Number(i.quantidade), unidade: i.unidade, valorUnitario: Number(i.valorUnitario) || 0,
        valorTotal: (Number(i.quantidade) || 0) * (Number(i.valorUnitario) || 0),
        loteNumero: i.loteNumero || null, dataValidade: i.dataValidade || null,
      })),
    };
    try { await api.post('/entradas', payload); onSalvo(); }
    catch (e: any) { setErro(e.response?.data?.message || 'Erro ao salvar entrada.'); }
    finally { setSalvando(false); }
  };

  const totalNota = itens.reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.valorUnitario) || 0), 0);

  return (
    <Modal titulo="Nova Entrada de Mercadoria" onClose={onClose} onSalvar={salvar} salvando={salvando} salvarLabel="Dar entrada" wide>
      {/* Upload XML */}
      <label className="flex items-center gap-3 bg-slate-800/60 border border-dashed border-slate-600 rounded-lg px-4 py-3 cursor-pointer hover:border-sky-500">
        <Upload className="h-5 w-5 text-sky-400" />
        <div className="flex-1"><p className="text-sm font-semibold text-slate-200">Importar XML da NF-e do fornecedor</p><p className="text-xs text-slate-500">Preenche os itens automaticamente (você confere o vínculo dos produtos).</p></div>
        <FileCode className="h-4 w-4 text-slate-500" />
        <input type="file" accept=".xml,text/xml" className="hidden" onChange={e => e.target.files?.[0] && onXml(e.target.files[0])} />
      </label>
      {aviso && <p className="text-xs text-sky-300 bg-sky-500/10 px-3 py-2 rounded-lg">{aviso}</p>}

      <Secao titulo="Dados da nota" />
      <div className="grid grid-cols-4 gap-3">
        <Campo label="Fornecedor *" className="col-span-2">
          <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)} className={inp}>
            <option value="">— selecione —</option>
            {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nomeFantasia || f.razaoSocial}</option>)}
          </select>
        </Campo>
        <Campo label="Nº NF"><input value={numeroNf} onChange={e => setNumeroNf(e.target.value)} className={inp} /></Campo>
        <Campo label="Série"><input value={serieNf} onChange={e => setSerieNf(e.target.value)} className={inp} /></Campo>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Campo label="Chave de acesso" className="col-span-3"><input value={chave} onChange={e => setChave(e.target.value)} className={`${inp} font-mono text-xs`} /></Campo>
        <Campo label="Emissão"><input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} className={inp} /></Campo>
      </div>

      <Secao titulo="Itens" />
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-800/60 text-slate-400"><tr>
            {['Produto (vínculo)', 'Descrição', 'NCM', 'Qtd', 'Un', 'Vl Unit', 'Lote', 'Validade', ''].map(h => <th key={h} className="px-2 py-1.5 text-left font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {itens.map((it, i) => (
              <tr key={i} className="border-t border-slate-800">
                <td className="px-1.5 py-1"><select value={it.produtoId} onChange={e => setItem(i, 'produtoId', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-xs text-slate-100 w-32"><option value="">— sem vínculo —</option>{produtos.map(p => <option key={p.id} value={p.id}>{p.descricao}</option>)}</select></td>
                <td className="px-1.5 py-1"><input value={it.descricao} onChange={e => setItem(i, 'descricao', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-xs text-slate-100 w-36" /></td>
                <td className="px-1.5 py-1"><input value={it.ncm} onChange={e => setItem(i, 'ncm', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-xs text-slate-100 w-20 font-mono" /></td>
                <td className="px-1.5 py-1"><input type="number" value={it.quantidade} onChange={e => setItem(i, 'quantidade', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-xs text-slate-100 w-16 text-right" /></td>
                <td className="px-1.5 py-1"><input value={it.unidade} onChange={e => setItem(i, 'unidade', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-xs text-slate-100 w-12" /></td>
                <td className="px-1.5 py-1"><input type="number" value={it.valorUnitario} onChange={e => setItem(i, 'valorUnitario', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-xs text-slate-100 w-20 text-right" /></td>
                <td className="px-1.5 py-1"><input value={it.loteNumero} onChange={e => setItem(i, 'loteNumero', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-xs text-slate-100 w-20" /></td>
                <td className="px-1.5 py-1"><input type="date" value={it.dataValidade} onChange={e => setItem(i, 'dataValidade', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1 py-1 text-xs text-slate-100 w-32" /></td>
                <td className="px-1.5 py-1">{itens.length > 1 && <button onClick={() => delItem(i)} className="text-slate-500 hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <button onClick={addItem} className="flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200 font-semibold"><Plus className="h-3.5 w-3.5" /> Adicionar item</button>
        <span className="text-sm text-slate-300">Total da nota: <b className="text-slate-100">{R$(totalNota)}</b></span>
      </div>

      <Secao titulo="Financeiro" />
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={gerarCP} onChange={e => setGerarCP(e.target.checked)} className="accent-sky-500 h-4 w-4" /> Gerar Contas a Pagar</label>
        {gerarCP && <Campo label="Vencimento"><input type="date" value={dataVenc} onChange={e => setDataVenc(e.target.value)} className={inp} /></Campo>}
      </div>
      <p className="text-[11px] text-slate-500">Itens vinculados a um produto dão entrada no estoque (com lote/validade se informados). Sem vínculo, entram só como documento.</p>

      {erro && <p className="text-xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg">{erro}</p>}
    </Modal>
  );
}
