import { useState, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { podeVerTela, rotaInicial } from '../../config/telas';
import { FeedbackHost } from '../ui/feedback';
import {
  LayoutDashboard, Users, Package, Warehouse, FileText,
  DollarSign, Truck, ClipboardList, BarChart3, Settings,
  ChevronLeft, ChevronRight, LogOut, Building2, AlertTriangle,
  Receipt, ShieldCheck, Menu, X, MapPin, PackageCheck, ShoppingCart, Coins, Landmark,
} from 'lucide-react';

interface NavItem { to: string; icon: React.ElementType; label: string; badge?: string; badgeColor?: string; highlight?: boolean }
interface NavGroup { group: string; items: NavItem[] }

const navigation: NavGroup[] = [
  {
    group: 'Visão Geral',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Painel Operacional' },
    ],
  },
  {
    group: 'A · Cadastros',
    items: [
      { to: '/cadastros/clientes',       icon: Users,        label: 'Clientes' },
      { to: '/cadastros/fornecedores',   icon: Building2,    label: 'Fornecedores' },
      { to: '/cadastros/transportadoras',icon: Truck,        label: 'Transportadoras' },
      { to: '/cadastros/produtos',       icon: Package,      label: 'Produtos & NCM' },
      { to: '/cadastros/filiais',        icon: Warehouse,    label: 'Filiais / Boxes' },
    ],
  },
  {
    group: 'B · Estoque / WMS',
    items: [
      { to: '/wms/posicao',       icon: Warehouse,      label: 'Posição de Estoque' },
      { to: '/wms/pereciveis',    icon: AlertTriangle,  label: 'Perecíveis / FLV', badge: '!', badgeColor: 'bg-red-500' },
      { to: '/wms/compras',       icon: ShoppingCart,   label: 'Ordens de Compra' },
      { to: '/compras/app',       icon: ShoppingCart,   label: 'App de Compras', highlight: true },
      { to: '/wms/entradas',      icon: ClipboardList,  label: 'Entradas (XML NF-e)' },
      { to: '/wms/movimentacoes', icon: BarChart3,      label: 'Movimentações' },
      { to: '/wms/inventario',    icon: ClipboardList,  label: 'Inventário' },
      { to: '/wms/analise-estoque', icon: BarChart3,    label: 'Análise Estoque Físico', highlight: true },
    ],
  },
  {
    group: 'C · Logística',
    items: [
      { to: '/logistica/pedidos',   icon: ClipboardList, label: 'Pedidos de Venda' },
      { to: '/logistica/carga',     icon: Truck,         label: 'Controle de Carga', highlight: true },
      { to: '/logistica/torre',     icon: MapPin,        label: 'Torre de Controle', highlight: true },
      { to: '/logistica/motorista', icon: Truck,         label: 'App do Motorista' },
      { to: '/logistica/lider',     icon: ClipboardList, label: 'Líder / Separação' },
      { to: '/logistica/operacional', icon: PackageCheck, label: 'Operacional / Separação' },
      { to: '/logistica/frete',     icon: DollarSign,    label: 'Frete por Motorista' },
      { to: '/logistica/romaneios', icon: MapPin,        label: 'Romaneios' },
      { to: '/logistica/frotas',    icon: Truck,         label: 'Frotas & Veículos' },
    ],
  },
  {
    group: 'D · Fiscal / DFe',
    items: [
      { to: '/fiscal/nfe',    icon: Receipt,   label: 'NF-e Emitidas' },
      { to: '/fiscal/emitir', icon: Receipt,   label: 'Faturamento', highlight: true },
      { to: '/fiscal/painel', icon: BarChart3, label: 'Painel de Faturamento' },
      { to: '/fiscal/matriz', icon: FileText,  label: 'Matriz Fiscal' },
      { to: '/fiscal/cte',    icon: FileText,  label: 'CT-e / MDF-e' },
      { to: '/fiscal/gestao', icon: Receipt,   label: 'Gestão Fiscal' },
    ],
  },
  {
    group: 'E · Financeiro',
    items: [
      { to: '/financeiro/fluxo-caixa', icon: Landmark,   label: 'Fluxo de Caixa' },
      { to: '/financeiro/receber', icon: DollarSign, label: 'Contas a Receber' },
      { to: '/financeiro/pagar',   icon: DollarSign, label: 'Contas a Pagar' },
      { to: '/financeiro/dre',     icon: BarChart3,  label: 'DRE & Relatórios' },
      { to: '/financeiro/custos',  icon: Coins,      label: 'Custos & Margem' },
    ],
  },
  {
    group: 'F · Gerencial',
    items: [
      { to: '/gerencial/auditoria',     icon: ShieldCheck, label: 'Logs de Auditoria' },
      { to: '/gerencial/usuarios',      icon: Users,       label: 'Usuários & Acessos' },
      { to: '/gerencial/configuracoes', icon: Settings,    label: 'Configurações' },
    ],
  },
];

export default function AppShell() {
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const { user, filialAtiva, logout } = useAuth();
  const navigate = useNavigate();
  const sw = collapsed ? 'w-14' : 'w-56';

  // Filtra o menu pelas telas que o perfil do usuário pode ver
  const navVisivel = useMemo(() => navigation
    .map((g) => ({ ...g, items: g.items.filter((i) => podeVerTela(user?.telas, user?.role, i.to)) }))
    .filter((g) => g.items.length > 0), [user?.telas, user?.role]);

  return (
    <div className="relative flex h-screen overflow-hidden" style={{ backgroundColor: '#0B0F17' }}>
      {/* Glow ambiente — profundidade no canvas (não intercepta cliques) */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-sky-500/[0.06] blur-[140px] animate-aurora" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-indigo-500/[0.05] blur-[140px] animate-aurora-slow" />
        <div className="absolute top-1/3 right-1/4 h-[360px] w-[360px] rounded-full bg-violet-500/[0.035] blur-[150px] animate-aurora" />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-40 lg:hidden animate-fade-in" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar — placa de vidro */}
      <aside className={`fixed lg:relative z-50 h-full flex flex-col bg-white/[0.02] backdrop-blur-xl border-r border-white/[0.05] transition-all duration-300 ease-in-out shrink-0 ${sw} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Logo */}
        <div className={`flex items-center border-b border-white/[0.05] h-12 px-3 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <img src="/logo-hetros-icone.png" alt="Hetros" className="h-7 w-7 object-contain shrink-0" />
              <div className="min-w-0">
                <p className="text-white text-xs font-bold leading-none truncate tracking-tight">Hetros WMS</p>
                <p className="text-slate-500 text-[10px] truncate">{filialAtiva?.nome || '—'}</p>
              </div>
            </div>
          )}
          {collapsed && <img src="/logo-hetros-icone.png" alt="Hetros" className="h-6 w-6 object-contain" />}
          <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all duration-300 shrink-0 active:scale-[0.9]">
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2.5 px-1.5 space-y-3">
          {navVisivel.map((group) => (
            <div key={group.group}>
              {!collapsed && (
                <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-[0.14em] px-2 mb-1">{group.group}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label, badge, badgeColor, highlight }) => (
                  <NavLink
                    key={to}
                    to={to}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) => `
                      flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-medium
                      transition-all duration-300 ease-in-out group relative active:scale-[0.98]
                      ${isActive
                        ? 'bg-gradient-to-r from-sky-400/[0.18] to-sky-400/[0.04] text-sky-200 shadow-[inset_0_1px_0_0_rgba(56,189,248,0.15)]'
                        : highlight
                          ? 'text-amber-300/90 hover:bg-white/[0.05]'
                          : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100'
                      }
                      ${collapsed ? 'justify-center' : ''}
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        {/* Indicador cirúrgico de foco */}
                        {isActive && !collapsed && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]" />}
                        <Icon className={`h-3.5 w-3.5 shrink-0 transition-colors duration-300 ${isActive ? 'text-sky-300' : highlight && !isActive ? 'text-amber-300/80' : 'text-slate-500 group-hover:text-slate-200'}`} />
                        {!collapsed && <span className="truncate">{label}</span>}
                        {badge && !collapsed && (
                          <span className={`ml-auto h-3.5 w-3.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center ${badgeColor}`}>
                            {badge}
                          </span>
                        )}
                        {collapsed && (
                          <span className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#0E141F]/90 backdrop-blur-xl border border-white/[0.08] text-slate-200 text-xs rounded-lg shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity duration-200">
                            {label}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className={`px-1.5 py-2 border-t border-white/[0.05] ${collapsed ? 'flex justify-center' : ''}`}>
          {!collapsed ? (
            <div>
              <div className="flex items-center gap-2 px-1 mb-1.5">
                <div className="h-6 w-6 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 text-[10px] font-bold shrink-0">
                  {user?.nome?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-[11px] font-medium truncate">{user?.nome}</p>
                  <p className="text-slate-600 text-[9px]">{user?.role}</p>
                </div>
              </div>
              <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-200 text-[10px] w-full px-2 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all duration-300 active:scale-[0.98]">
                <LogOut className="h-3 w-3" /> Sair
              </button>
            </div>
          ) : (
            <button onClick={() => { logout(); navigate('/login'); }} className="text-slate-500 hover:text-slate-200 p-1.5 rounded-lg hover:bg-white/[0.05] transition-all duration-300" title="Sair">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-12 bg-white/[0.02] backdrop-blur-xl border-b border-white/[0.05] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1.5 text-slate-400 hover:bg-white/[0.06] rounded-lg transition-all duration-300" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <FilialSelector />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" title="Online" />
            <span className="text-xs text-slate-500 hidden sm:block">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </span>
            <span className="text-xs font-mono text-slate-400 hidden sm:block tabular-nums">
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <TelaGuard><Outlet /></TelaGuard>
        </main>
      </div>
      <FeedbackHost />
    </div>
  );
}

// Bloqueia acesso por URL a telas fora do perfil do usuário
function TelaGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  if (podeVerTela(user?.telas, user?.role, path)) return <>{children}</>;
  return <Navigate to={rotaInicial(user?.telas, user?.role, user?.telaInicial)} replace />;
}

function FilialSelector() {
  const { filiais, filialAtiva, setFilialAtiva } = useAuth();
  return (
    <div className="flex items-center gap-1.5">
      <Building2 className="h-3.5 w-3.5 text-slate-500" />
      <select
        className="text-xs rounded-lg px-2 py-1 text-slate-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] focus:outline-none focus:border-sky-400/50 transition-all duration-300 cursor-pointer"
        value={filialAtiva?.id || ''}
        onChange={(e) => { const f = filiais?.find((f) => f.id === e.target.value); if (f) setFilialAtiva(f); }}
      >
        {filiais?.map((f) => <option key={f.id} value={f.id}>{f.codigo} — {f.nome}</option>)}
      </select>
    </div>
  );
}
