import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Users, Package, Warehouse, FileText,
  DollarSign, Truck, ClipboardList, BarChart3, Settings,
  ChevronLeft, ChevronRight, LogOut, Building2, AlertTriangle,
  Receipt, ShieldCheck, Menu, X, Zap,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

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
      { to: '/cadastros/clientes', icon: Users, label: 'Clientes' },
      { to: '/cadastros/fornecedores', icon: Building2, label: 'Fornecedores' },
      { to: '/cadastros/transportadoras', icon: Truck, label: 'Transportadoras' },
      { to: '/cadastros/produtos', icon: Package, label: 'Produtos & NCM' },
      { to: '/cadastros/filiais', icon: Warehouse, label: 'Filiais / Boxes' },
    ],
  },
  {
    group: 'B · Estoque / WMS',
    items: [
      { to: '/wms/posicao', icon: Warehouse, label: 'Posição de Estoque' },
      { to: '/wms/pereciveis', icon: AlertTriangle, label: 'Perecíveis / FLV', badge: '!', badgeColor: 'bg-red-500' },
      { to: '/wms/entradas', icon: ClipboardList, label: 'Entradas (XML NF-e)' },
      { to: '/wms/movimentacoes', icon: BarChart3, label: 'Movimentações' },
      { to: '/wms/inventario', icon: ClipboardList, label: 'Inventário' },
    ],
  },
  {
    group: 'C · Logística',
    items: [
      { to: '/logistica/pedidos', icon: ClipboardList, label: 'Pedidos de Venda' },
      { to: '/logistica/romaneios', icon: Truck, label: 'Romaneios de Carga' },
      { to: '/logistica/frotas', icon: Truck, label: 'Frotas & Veículos' },
    ],
  },
  {
    group: 'D · Fiscal / DFe',
    items: [
      { to: '/fiscal/nfe', icon: Receipt, label: 'NF-e Emitidas' },
      { to: '/fiscal/emitir', icon: FileText, label: 'Emitir NF-e' },
      { to: '/fiscal/cte', icon: FileText, label: 'CT-e / MDF-e' },
    ],
  },
  {
    group: 'E · Financeiro',
    items: [
      { to: '/financeiro/receber', icon: DollarSign, label: 'Contas a Receber' },
      { to: '/financeiro/pagar', icon: DollarSign, label: 'Contas a Pagar' },
      { to: '/financeiro/dre', icon: BarChart3, label: 'DRE & Relatórios' },
    ],
  },
  {
    group: 'F · Gerencial',
    items: [
      { to: '/gerencial/auditoria', icon: ShieldCheck, label: 'Logs de Auditoria' },
      { to: '/gerencial/usuarios', icon: Users, label: 'Usuários & Acessos' },
      { to: '/gerencial/configuracoes', icon: Settings, label: 'Configurações' },
    ],
  },
];

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, filialAtiva, logout } = useAuth();
  const navigate = useNavigate();

  const sidebarW = collapsed ? 'w-16' : 'w-64';

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed lg:relative z-50 h-full flex flex-col bg-gray-950 border-r border-gray-800
        transition-all duration-200 ease-in-out shrink-0
        ${sidebarW}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Logo */}
        <div className={`flex items-center border-b border-gray-800 h-14 px-3 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 bg-sky-500 rounded-lg flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold leading-none truncate">Hetros WMS</p>
                <p className="text-gray-500 text-[10px] truncate">{filialAtiva?.nome || 'Selecione filial'}</p>
              </div>
            </div>
          )}
          {collapsed && <Zap className="h-5 w-5 text-sky-400" />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors shrink-0"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Nav scrollável */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-3">
          {navigation.map((group) => (
            <div key={group.group}>
              {!collapsed && (
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-2 mb-1">
                  {group.group}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label, badge, badgeColor }) => (
                  <NavLink
                    key={to}
                    to={to}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) => `
                      flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs font-medium
                      transition-all group relative
                      ${isActive
                        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-transparent'
                      }
                      ${collapsed ? 'justify-center' : ''}
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-sky-400' : ''}`} />
                        {!collapsed && <span className="truncate">{label}</span>}
                        {badge && !collapsed && (
                          <span className={`ml-auto h-4 w-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center ${badgeColor}`}>
                            {badge}
                          </span>
                        )}
                        {/* Tooltip quando collapsed */}
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
        <div className={`px-2 py-3 border-t border-gray-800 ${collapsed ? 'flex justify-center' : ''}`}>
          {!collapsed ? (
            <div>
              <div className="flex items-center gap-2 px-1 mb-2">
                <div className="h-7 w-7 rounded-full bg-sky-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {user?.nome?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium truncate">{user?.nome}</p>
                  <p className="text-gray-500 text-[10px]">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-xs w-full px-2 py-1.5 rounded hover:bg-gray-800 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" /> Sair
              </button>
            </div>
          ) : (
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-gray-500 hover:text-gray-300 p-1.5 rounded hover:bg-gray-800 transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Filial selector */}
            <FilialSelector />
          </div>

          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Sistema online" />
            <span className="text-xs text-gray-400 hidden sm:block">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function FilialSelector() {
  const { filiais, filialAtiva, setFilialAtiva } = useAuth();
  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-gray-400" />
      <select
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        value={filialAtiva?.id || ''}
        onChange={(e) => {
          const f = filiais?.find((f) => f.id === e.target.value);
          if (f) setFilialAtiva(f);
        }}
      >
        {filiais?.map((f) => (
          <option key={f.id} value={f.id}>{f.codigo} — {f.nome}</option>
        ))}
      </select>
    </div>
  );
}
