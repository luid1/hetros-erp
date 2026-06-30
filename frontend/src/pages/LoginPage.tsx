import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Lock, ChevronLeft, Clock } from 'lucide-react';
import { rotaInicial } from '../config/telas';

interface UsuarioCard {
  id: string;
  nome: string;
  email: string;
  role: { nome: string };
  ultimoAcesso: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN:         'bg-purple-600',
  OPERADOR_WMS:  'bg-sky-600',
  COMERCIAL:     'bg-emerald-600',
  FINANCEIRO:    'bg-amber-600',
  FISCAL:        'bg-orange-600',
  AUDITOR:       'bg-gray-600',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN:         'Admin Master',
  OPERADOR_WMS:  'Operador WMS',
  COMERCIAL:     'Comercial',
  FINANCEIRO:    'Financeiro',
  FISCAL:        'Fiscal',
  AUDITOR:       'Auditor',
};

function getInitials(nome: string) {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

function formatUltimoAcesso(data: string | null) {
  if (!data) return 'Nunca acessou';
  const d = new Date(data);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora mesmo';
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  return d.toLocaleDateString('pt-BR');
}

export default function LoginPage() {
  const [usuarios, setUsuarios] = useState<UsuarioCard[]>([]);
  const [selecionado, setSelecionado] = useState<UsuarioCard | null>(null);
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [hora, setHora] = useState(new Date());
  const inputRef = useRef<HTMLInputElement>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Relógio em tempo real
  useEffect(() => {
    const t = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Carrega usuários do tenant
  useEffect(() => {
    setLoadingUsers(true);
    fetch('/api/v1/auth/users')
      .then((r) => r.json())
      .then((data) => setUsuarios(Array.isArray(data) ? data : []))
      .catch(() => setUsuarios([]))
      .finally(() => setLoadingUsers(false));
  }, []);

  // Foca no campo senha ao selecionar
  useEffect(() => {
    if (selecionado) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selecionado]);

  const handleSelect = (u: UsuarioCard) => {
    setSelecionado(u);
    setPassword('');
    setError('');
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!selecionado) return;
    setLoading(true);
    setError('');
    try {
      // Usa o endpoint de login-por-id (seleção visual)
      const res = await fetch('/api/v1/auth/login-por-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: selecionado.id, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error?.message || 'Senha incorreta.');

      // Persiste sessão via AuthContext
      const authUser = { ...data.usuario, tenantId: data.tenant.id };
      const filiais = data.usuario.filiais || [];
      localStorage.setItem('wms_token', data.token);
      localStorage.setItem('wms_user', JSON.stringify(authUser));
      localStorage.setItem('wms_filiais', JSON.stringify(filiais));
      if (filiais[0]) localStorage.setItem('wms_filial', JSON.stringify(filiais[0]));
      window.location.href = rotaInicial(data.usuario.telas, data.usuario.role, data.usuario.telaInicial);
    } catch (err: any) {
      setError(err.message);
      setPassword('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <img src="/logo-hetros-icone.png" alt="Hetros" className="h-9 w-9 object-contain" />
          <div>
            <p className="text-white text-sm font-bold leading-none">Hetros WMS</p>
            <p className="text-gray-500 text-xs">Sistema de Gestão Industrial</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white text-xl font-mono font-bold tabular-nums">
            {hora.toLocaleTimeString('pt-BR')}
          </p>
          <p className="text-gray-500 text-xs">
            {hora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 flex items-center justify-center p-6">

        {/* ── ETAPA 1: Seleção de usuário ── */}
        {!selecionado ? (
          <div className="w-full max-w-3xl space-y-8">
            <div className="text-center flex flex-col items-center gap-5">
              <div className="bg-white rounded-2xl px-7 py-4 shadow-xl">
                <img src="/logo-hetros.png" alt="Hetros Importação e Exportação" className="h-14 object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Quem está acessando?</h1>
                <p className="text-gray-500 text-sm mt-1">Selecione seu nome para continuar</p>
              </div>
            </div>

            {loadingUsers ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-sky-500 border-t-transparent rounded-full" />
              </div>
            ) : usuarios.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">Nenhum usuário cadastrado ainda.</p>
                <p className="text-gray-600 text-xs mt-2">
                  Use <code className="bg-gray-800 px-1 rounded">POST /api/v1/auth/register</code> para criar o primeiro tenant.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {usuarios.map((u) => {
                  const color = ROLE_COLORS[u.role?.nome] || 'bg-gray-600';
                  const roleLabel = ROLE_LABELS[u.role?.nome] || u.role?.nome;
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleSelect(u)}
                      className="group flex flex-col items-center gap-3 bg-gray-900 hover:bg-gray-800
                                 border border-gray-800 hover:border-sky-500/50 rounded-2xl p-5
                                 transition-all duration-150 hover:scale-105 hover:shadow-lg hover:shadow-sky-500/10"
                    >
                      {/* Avatar */}
                      <div className={`h-16 w-16 rounded-2xl ${color} flex items-center justify-center
                                      text-white text-xl font-bold shadow-lg group-hover:scale-110 transition-transform`}>
                        {getInitials(u.nome)}
                      </div>

                      {/* Nome */}
                      <div className="text-center min-w-0 w-full">
                        <p className="text-white text-sm font-semibold truncate">{u.nome}</p>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1
                                         text-white/90 ${color} opacity-80`}>
                          {roleLabel}
                        </span>
                      </div>

                      {/* Último acesso */}
                      {u.ultimoAcesso && (
                        <div className="flex items-center gap-1 text-gray-600 text-[10px]">
                          <Clock className="h-2.5 w-2.5" />
                          {formatUltimoAcesso(u.ultimoAcesso)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── ETAPA 2: Digitar senha ── */
          <div className="w-full max-w-sm space-y-6">

            {/* Usuário selecionado */}
            <div className="flex flex-col items-center gap-4">
              <div className={`h-20 w-20 rounded-2xl ${ROLE_COLORS[selecionado.role?.nome] || 'bg-gray-600'}
                               flex items-center justify-center text-white text-2xl font-bold shadow-xl`}>
                {getInitials(selecionado.nome)}
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">{selecionado.nome}</h2>
                <p className="text-gray-500 text-sm mt-0.5">
                  {ROLE_LABELS[selecionado.role?.nome] || selecionado.role?.nome}
                </p>
              </div>
            </div>

            {/* Formulário de senha */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                    <input
                      ref={inputRef}
                      type={showPwd ? 'text' : 'password'}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 pl-9 text-sm
                                 placeholder:text-gray-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                      placeholder="Digite sua senha..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-900/40 border border-red-700/60 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                    <span className="text-red-500">✕</span> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !password}
                  className="w-full bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold
                             py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2
                             disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-sky-500/20"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                      Verificando...
                    </span>
                  ) : (
                    'Entrar no Sistema'
                  )}
                </button>
              </form>

              <button
                onClick={() => { setSelecionado(null); setPassword(''); setError(''); }}
                className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300
                           text-xs py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Trocar usuário
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-center py-4 text-gray-700 text-xs border-t border-gray-900">
        Hetros Distribuição · Acesso restrito · v1.0.0
      </div>
    </div>
  );
}
