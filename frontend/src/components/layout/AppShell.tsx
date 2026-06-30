import { useState, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { podeVerTela, rotaInicial } from '../../config/telas';
import {
  LayoutDashboard, Users, Package, Warehouse, FileText,
  DollarSign, Truck, ClipboardList, BarChart3, Settings,
  ChevronLeft, ChevronRight, LogOut, Building2, AlertTriangle,
  Receipt, ShieldCheck, Menu, X, MapPin, PackageCheck,
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
      { to: '/fiscal/matriz', icon: FileText,  label: 'Matriz Fiscal' },
      { to: '/fiscal/cte',    icon: FileText,  label: 'CT-e / MDF-e' },
    ],
  },
  {
    group: 'E · Financeiro',
    items: [
      { to: '/financeiro/receber', icon: DollarSign, label: 'Contas a Receber' },
      { to: '/financeiro/pagar',   icon: DollarSign, label: 'Contas a Pagar' },
      { to: '/financeiro/dre',     icon: BarChart3,  label: 'DRE & Relatórios' },
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
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:relative z-50 h-full flex flex-col bg-gray-950 border-r border-gray-800 transition-all duration-200 shrink-0 ${sw} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Logo */}
        <div className={`flex items-center border-b border-gray-800 h-12 px-3 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <img src="/logo-hetros-icone.png" alt="Hetros" className="h-7 w-7 object-contain shrink-0" />
              <div className="min-w-0">
                <p className="text-white text-xs font-bold leading-none truncate">Hetros WMS</p>
                <p className="text-gray-600 text-[10px] truncate">{filialAtiva?.nome || '—'}</p>
              </div>
            </div>
          )}
          {collapsed && <img src="/logo-hetros-icone.png" alt="Hetros" className="h-6 w-6 object-contain" />}
          <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors shrink-0">
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-2">
          {navVisivel.map((group) => (
            <div key={group.group}>
              {!collapsed && (
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest px-1.5 mb-0.5">{group.group}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label, badge, badgeColor, highlight }) => (
                  <NavLink
                    key={to}
                    to={to}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) => `
                      flex items-center gap-2 rounded-md px-1.5 py-1.5 text-[11px] font-medium
                      transition-all group relative border
                      ${isActive
                        ? 'bg-sky-500/15 text-sky-400 border-sky-500/20'
                        : highlight
                          ? 'text-amber-300 hover:bg-amber-500/10 border-amber-500/20 bg-amber-500/5'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-transparent'
                      }
                      ${collapsed ? 'justify-center' : ''}
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-sky-400' : highlight && !isActive ? 'text-amber-400' : ''}`} />
                        {!collapsed && <span className="truncate">{label}</span>}
                        {badge && !collapsed && (
                          <span className={`ml-auto h-3.5 w-3.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center ${badgeColor}`}>
                            {badge}
                          </span>
                        )}
                        {collapsed && (
                          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-gray-200 text-xs rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
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
        <div className={`px-1.5 py-2 border-t border-gray-800 ${collapsed ? 'flex justify-center' : ''}`}>
          {!collapsed ? (
            <div>
              <div className="flex items-center gap-2 px-1 mb-1.5">
                <div className="h-6 w-6 rounded-full bg-sky-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {user?.nome?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-[11px] font-medium truncate">{user?.nome}</p>
                  <p className="text-gray-600 text-[9px]">{user?.role}</p>
                </div>
              </div>
              <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-[10px] w-full px-1.5 py-1 rounded hover:bg-gray-800 transition-colors">
                <LogOut className="h-3 w-3" /> Sair
              </button>
            </div>
          ) : (
            <button onClick={() => { logout(); navigate('/login'); }} className="text-gray-500 hover:text-gray-300 p-1.5 rounded hover:bg-gray-800 transition-colors" title="Sair">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <FilialSelector />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Online" />
            <span className="text-xs text-gray-400 hidden sm:block">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </span>
            <span className="text-xs font-mono text-gray-500 hidden sm:block">
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <TelaGuard><Outlet /></TelaGuard>
        </main>
      </div>
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
      <Building2 className="h-3.5 w-3.5 text-gray-400" />
      <select
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        value={filialAtiva?.id || ''}
        onChange={(e) => { const f = filiais?.find((f) => f.id === e.target.value); if (f) setFilialAtiva(f); }}
      >
        {filiais?.map((f) => <option key={f.id} value={f.id}>{f.codigo} — {f.nome}</option>)}
      </select>
    </div>
  );
}
