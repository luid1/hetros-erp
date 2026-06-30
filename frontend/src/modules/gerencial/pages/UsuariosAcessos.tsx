import { useState, useEffect, useCallback } from 'react';
import {
  Users, ShieldCheck, Plus, Pencil, Power, KeyRound, X, Check, Trash2, Building2, Monitor,
} from 'lucide-react';
import api from '../../../services/api';
import { TELAS_POR_GRUPO, TELAS } from '../../../config/telas';

interface Role { id: string; nome: string; descricao?: string | null; telas: string[]; telaInicial?: string | null; _count: { usuarios: number } }
interface Filial { id: string; codigo: string; nome: string }
interface Usuario {
  id: string; nome: string; email: string; cpf?: string | null; ativo: boolean; ultimoAcesso?: string | null;
  role: { id: string; nome: string };
  filiais: { filial: Filial }[];
}

const lbl = 'block text-[11px] font-semibold text-gray-500 mb-1';
const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-400';

export default function UsuariosAcessos() {
  const [aba, setAba] = useState<'usuarios' | 'perfis'>('usuarios');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [modalUser, setModalUser] = useState<Usuario | 'novo' | null>(null);
  const [modalRole, setModalRole] = useState<Role | 'novo' | null>(null);

  const carregar = useCallback(() => {
    api.get('/usuarios').then(r => setUsuarios(r.data)).catch(() => setUsuarios([]));
    api.get('/usuarios/roles').then(r => setRoles(r.data)).catch(() => setRoles([]));
    api.get('/filiais').then(r => setFiliais(r.data)).catch(() => setFiliais([]));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header + abas */}
      <div className="bg-white border-b border-gray-200 px-5 pt-3 shrink-0">
        <h1 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-2">
          <Users className="h-5 w-5 text-sky-500" /> Usuários & Acessos
        </h1>
        <div className="flex gap-1">
          <button onClick={() => setAba('usuarios')} className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 ${aba === 'usuarios' ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Users className="h-4 w-4 inline mr-1" /> Usuários ({usuarios.length})
          </button>
          <button onClick={() => setAba('perfis')} className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 ${aba === 'perfis' ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <ShieldCheck className="h-4 w-4 inline mr-1" /> Perfis ({roles.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {aba === 'usuarios' ? (
          <>
            <div className="flex justify-end mb-3">
              <button onClick={() => setModalUser('novo')} className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-4 py-2 text-sm font-bold">
                <Plus className="h-4 w-4" /> Novo Usuário
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-xs text-gray-600">
                  <tr>{['Nome', 'E-mail', 'Perfil', 'Filiais', 'Último acesso', 'Status', ''].map(h => <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id} className={`border-t border-gray-100 ${!u.ativo ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2 font-semibold text-gray-900">{u.nome}</td>
                      <td className="px-3 py-2 text-gray-600">{u.email}</td>
                      <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700">{u.role?.nome}</span></td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{u.filiais?.map(f => f.filial.codigo).join(', ') || '—'}</td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{u.ultimoAcesso ? new Date(u.ultimoAcesso).toLocaleString('pt-BR') : 'Nunca'}</td>
                      <td className="px-3 py-2">{u.ativo ? <span className="text-emerald-600 text-xs font-bold">Ativo</span> : <span className="text-gray-400 text-xs">Inativo</span>}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => setModalUser(u)} className="text-gray-400 hover:text-sky-600 p-1"><Pencil className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-end mb-3">
              <button onClick={() => setModalRole('novo')} className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-4 py-2 text-sm font-bold">
                <Plus className="h-4 w-4" /> Novo Perfil
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {roles.map(r => {
                const todas = r.telas.includes('*');
                return (
                  <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-gray-900 flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-sky-500" /> {r.nome}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{r.descricao || '—'}</p>
                      </div>
                      <button onClick={() => setModalRole(r)} className="text-gray-400 hover:text-sky-600 p-1"><Pencil className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Monitor className="h-3.5 w-3.5" /> {todas ? 'Todas as telas' : `${r.telas.length} tela(s)`}</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {r._count.usuarios} usuário(s)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {modalUser && <ModalUsuario alvo={modalUser} roles={roles} filiais={filiais} onClose={() => setModalUser(null)} onSalvo={() => { setModalUser(null); carregar(); }} />}
      {modalRole && <ModalPerfil alvo={modalRole} onClose={() => setModalRole(null)} onSalvo={() => { setModalRole(null); carregar(); }} />}
    </div>
  );
}

// ─────────── Modal Usuário ───────────
function ModalUsuario({ alvo, roles, filiais, onClose, onSalvo }: {
  alvo: Usuario | 'novo'; roles: Role[]; filiais: Filial[]; onClose: () => void; onSalvo: () => void;
}) {
  const novo = alvo === 'novo';
  const u = novo ? null : (alvo as Usuario);
  const [nome, setNome] = useState(u?.nome || '');
  const [email, setEmail] = useState(u?.email || '');
  const [senha, setSenha] = useState('');
  const [roleId, setRoleId] = useState(u?.role?.id || roles[0]?.id || '');
  const [ativo, setAtivo] = useState(u?.ativo ?? true);
  const [filialIds, setFilialIds] = useState<string[]>(u?.filiais?.map(f => f.filial.id) || []);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const toggleFilial = (id: string) => setFilialIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const salvar = async () => {
    setErro(''); setSalvando(true);
    try {
      if (novo) {
        await api.post('/usuarios', { nome, email, senha, roleId, ativo, filialIds });
      } else {
        await api.put(`/usuarios/${u!.id}`, { nome, email, roleId, ativo, filialIds });
      }
      onSalvo();
    } catch (e: any) { setErro(e.response?.data?.message || 'Erro ao salvar.'); }
    finally { setSalvando(false); }
  };

  const resetSenha = async () => {
    const nova = prompt('Nova senha para ' + u!.nome + ':');
    if (!nova) return;
    try { await api.patch(`/usuarios/${u!.id}/senha`, { senha: nova }); alert('Senha alterada.'); }
    catch (e: any) { alert(e.response?.data?.message || 'Erro.'); }
  };
  const inativar = async () => {
    if (!confirm('Inativar ' + u!.nome + '? Ele não conseguirá mais logar.')) return;
    try { await api.delete(`/usuarios/${u!.id}`); onSalvo(); } catch (e: any) { alert(e.response?.data?.message || 'Erro.'); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">{novo ? 'Novo Usuário' : 'Editar Usuário'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-3 overflow-auto">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Nome</label><input value={nome} onChange={e => setNome(e.target.value)} className={inp} /></div>
            <div><label className={lbl}>E-mail (login)</label><input value={email} onChange={e => setEmail(e.target.value)} className={inp} /></div>
          </div>
          {novo && <div><label className={lbl}>Senha</label><input type="text" value={senha} onChange={e => setSenha(e.target.value)} className={inp} placeholder="senha inicial" /></div>}
          <div>
            <label className={lbl}>Perfil de acesso</label>
            <select value={roleId} onChange={e => setRoleId(e.target.value)} className={inp}>
              {roles.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">O perfil define quais telas o usuário enxerga.</p>
          </div>
          <div>
            <label className={lbl}><Building2 className="h-3 w-3 inline" /> Filiais / Boxes</label>
            <div className="flex flex-wrap gap-1.5">
              {filiais.map(f => (
                <button key={f.id} onClick={() => toggleFilial(f.id)} type="button"
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${filialIds.includes(f.id) ? 'bg-sky-600 text-white border-sky-600' : 'bg-white border-gray-300 text-gray-600'}`}>
                  {f.codigo} — {f.nome}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} className="accent-sky-600 h-4 w-4" /> Usuário ativo
          </label>
          {erro && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex gap-2">
            {!novo && <button onClick={resetSenha} className="flex items-center gap-1 text-xs text-gray-600 hover:text-sky-600 px-2 py-1.5 rounded border border-gray-300"><KeyRound className="h-3.5 w-3.5" /> Trocar senha</button>}
            {!novo && u?.ativo && <button onClick={inativar} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 px-2 py-1.5 rounded border border-red-200"><Power className="h-3.5 w-3.5" /> Inativar</button>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm">Cancelar</button>
            <button onClick={salvar} disabled={salvando} className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-bold disabled:opacity-40 flex items-center gap-1.5"><Check className="h-4 w-4" /> Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────── Modal Perfil ───────────
function ModalPerfil({ alvo, onClose, onSalvo }: { alvo: Role | 'novo'; onClose: () => void; onSalvo: () => void }) {
  const novo = alvo === 'novo';
  const r = novo ? null : (alvo as Role);
  const ehAdmin = r?.nome === 'ADMIN';
  const [nome, setNome] = useState(r?.nome || '');
  const [descricao, setDescricao] = useState(r?.descricao || '');
  const [telas, setTelas] = useState<string[]>(r && !r.telas.includes('*') ? r.telas : []);
  const [telaInicial, setTelaInicial] = useState(r?.telaInicial || '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const toggleTela = (key: string) => setTelas(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key]);
  const toggleGrupo = (keys: string[]) => {
    const todosMarcados = keys.every(k => telas.includes(k));
    setTelas(p => todosMarcados ? p.filter(k => !keys.includes(k)) : Array.from(new Set([...p, ...keys])));
  };

  const salvar = async () => {
    setErro(''); setSalvando(true);
    try {
      const payload = { nome, descricao, telas: ehAdmin ? ['*'] : telas, telaInicial: telaInicial || null };
      if (novo) await api.post('/usuarios/roles', payload);
      else await api.put(`/usuarios/roles/${r!.id}`, payload);
      onSalvo();
    } catch (e: any) { setErro(e.response?.data?.message || 'Erro ao salvar.'); }
    finally { setSalvando(false); }
  };
  const excluir = async () => {
    if (!confirm('Excluir o perfil ' + r!.nome + '?')) return;
    try { await api.delete(`/usuarios/roles/${r!.id}`); onSalvo(); } catch (e: any) { alert(e.response?.data?.message || 'Erro.'); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">{novo ? 'Novo Perfil' : `Perfil — ${r?.nome}`}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-auto">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Nome do perfil</label><input value={nome} onChange={e => setNome(e.target.value)} disabled={ehAdmin} className={`${inp} disabled:bg-gray-100`} /></div>
            <div><label className={lbl}>Descrição</label><input value={descricao} onChange={e => setDescricao(e.target.value)} className={inp} /></div>
          </div>

          {ehAdmin ? (
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-sm text-sky-700">
              O perfil <b>ADMIN</b> enxerga <b>todas as telas</b> automaticamente.
            </div>
          ) : (
            <>
              <div>
                <label className={lbl}>Tela inicial (onde o usuário cai ao logar)</label>
                <select value={telaInicial} onChange={e => setTelaInicial(e.target.value)} className={inp}>
                  <option value="">— primeira tela liberada —</option>
                  {TELAS.filter(t => telas.includes(t.key)).map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Telas que este perfil pode ver</label>
                <div className="space-y-3 border border-gray-200 rounded-lg p-3 max-h-[40vh] overflow-auto">
                  {Object.entries(TELAS_POR_GRUPO).map(([grupo, items]) => {
                    const keys = items.map(i => i.key);
                    const todos = keys.every(k => telas.includes(k));
                    return (
                      <div key={grupo}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{grupo}</p>
                          <button onClick={() => toggleGrupo(keys)} type="button" className="text-[10px] text-sky-600 hover:underline">{todos ? 'desmarcar' : 'marcar todas'}</button>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {items.map(t => (
                            <label key={t.key} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                              <input type="checkbox" checked={telas.includes(t.key)} onChange={() => toggleTela(t.key)} className="accent-sky-600 h-3.5 w-3.5" />
                              {t.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{telas.length} tela(s) selecionada(s).</p>
              </div>
            </>
          )}
          {erro && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          {!novo && !ehAdmin && r!._count.usuarios === 0
            ? <button onClick={excluir} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 px-2 py-1.5 rounded border border-red-200"><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
            : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm">Cancelar</button>
            <button onClick={salvar} disabled={salvando} className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-bold disabled:opacity-40 flex items-center gap-1.5"><Check className="h-4 w-4" /> Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
