// Catálogo central das telas do ERP — FONTE ÚNICA usada pelo menu (AppShell),
// pelo guard de rotas e pela tela de Perfis (Usuários & Acessos).
// A "key" é a própria rota. O menu deriva 100% desta lista.

import {
  LayoutDashboard, Users, Package, Warehouse, FileText,
  DollarSign, Truck, ClipboardList, BarChart3, Settings,
  Building2, AlertTriangle, Receipt, ShieldCheck, MapPin,
  PackageCheck, ShoppingCart, Coins, Landmark,
} from 'lucide-react';
import type { ElementType } from 'react';

export interface TelaDef {
  key: string;
  label: string;
  grupo: string;
  icon?: ElementType;
  /** Destaca o item (cor âmbar) no menu. */
  highlight?: boolean;
  /** Selo pequeno ao lado do rótulo (ex.: '!'). */
  badge?: string;
  badgeColor?: string;
  /** Fora do menu lateral, mas ainda acessível por rota/permissão. */
  oculto?: boolean;
}

export const TELAS: TelaDef[] = [
  // Visão geral
  { key: '/dashboard', label: 'Dashboard', grupo: 'Visão Geral', icon: LayoutDashboard },

  // A · Cadastros
  { key: '/cadastros/clientes', label: 'Clientes', grupo: 'A · Cadastros', icon: Users },
  { key: '/cadastros/fornecedores', label: 'Fornecedores', grupo: 'A · Cadastros', icon: Building2 },
  { key: '/cadastros/transportadoras', label: 'Transportadoras', grupo: 'A · Cadastros', icon: Truck },
  { key: '/cadastros/produtos', label: 'Produtos & NCM', grupo: 'A · Cadastros', icon: Package },
  { key: '/cadastros/filiais', label: 'Filiais / Boxes', grupo: 'A · Cadastros', icon: Warehouse },

  // B · Estoque / WMS
  { key: '/wms/posicao', label: 'Posição de Estoque', grupo: 'B · Estoque / WMS', icon: Warehouse },
  { key: '/wms/pereciveis', label: 'Perecíveis / FLV', grupo: 'B · Estoque / WMS', icon: AlertTriangle, badge: '!', badgeColor: 'bg-red-500' },
  { key: '/wms/compras', label: 'Ordens de Compra', grupo: 'B · Estoque / WMS', icon: ShoppingCart },
  { key: '/compras/app', label: 'App de Compras', grupo: 'B · Estoque / WMS', icon: ShoppingCart, highlight: true },
  { key: '/wms/entradas', label: 'Entradas (XML NF-e)', grupo: 'B · Estoque / WMS', icon: ClipboardList },
  { key: '/wms/movimentacoes', label: 'Movimentações', grupo: 'B · Estoque / WMS', icon: BarChart3 },
  { key: '/wms/inventario', label: 'Inventário', grupo: 'B · Estoque / WMS', icon: ClipboardList },
  { key: '/wms/analise-estoque', label: 'Análise Estoque Físico', grupo: 'B · Estoque / WMS', icon: BarChart3, highlight: true },

  // C · Logística
  { key: '/logistica/pedidos', label: 'Pedidos de Venda', grupo: 'C · Logística', icon: ClipboardList },
  { key: '/logistica/torre', label: 'Torre de Controle', grupo: 'C · Logística', icon: MapPin, highlight: true },
  // Despacho consolidado na Torre de Controle — Controle de Carga fora do menu, acessível por rota.
  { key: '/logistica/carga', label: 'Controle de Carga', grupo: 'C · Logística', icon: Truck, oculto: true },
  { key: '/logistica/motorista', label: 'App do Motorista', grupo: 'C · Logística', icon: Truck },
  { key: '/logistica/lider', label: 'Líder / Separação', grupo: 'C · Logística', icon: ClipboardList },
  { key: '/logistica/operacional', label: 'Operacional / Separação', grupo: 'C · Logística', icon: PackageCheck },
  { key: '/logistica/frete', label: 'Frete por Motorista', grupo: 'C · Logística', icon: DollarSign },
  { key: '/logistica/romaneios', label: 'Romaneios', grupo: 'C · Logística', icon: MapPin },
  { key: '/logistica/frotas', label: 'Frotas & Veículos', grupo: 'C · Logística', icon: Truck },

  // D · Fiscal / DFe
  { key: '/fiscal/emitir', label: 'Faturamento', grupo: 'D · Fiscal / DFe', icon: Receipt, highlight: true },
  { key: '/fiscal/gestao', label: 'Gestão Fiscal', grupo: 'D · Fiscal / DFe', icon: Receipt },
  { key: '/fiscal/matriz', label: 'Matriz Fiscal', grupo: 'D · Fiscal / DFe', icon: FileText },
  { key: '/fiscal/cte', label: 'CT-e / MDF-e', grupo: 'D · Fiscal / DFe', icon: FileText },
  // Painel de Faturamento (dashboard de gráficos) fundido na Gestão Fiscal — fora do menu, acessível por rota.
  { key: '/fiscal/painel', label: 'Painel de Faturamento', grupo: 'D · Fiscal / DFe', icon: BarChart3, oculto: true },
  // NF-e Emitidas: fundida na Gestão Fiscal — fora do menu, mas acessível.
  { key: '/fiscal/nfe', label: 'NF-e Emitidas', grupo: 'D · Fiscal / DFe', icon: Receipt, oculto: true },

  // E · Financeiro
  { key: '/financeiro/dre', label: 'DRE & Relatórios', grupo: 'E · Financeiro', icon: BarChart3, highlight: true },
  { key: '/financeiro/custos', label: 'Custos & Margem', grupo: 'E · Financeiro', icon: Coins },
  // Unificados dentro do hub DRE — fora do menu, mas acessíveis por rota.
  { key: '/financeiro/controladoria', label: 'Controladoria (Financeiro)', grupo: 'E · Financeiro', icon: Landmark, oculto: true },
  { key: '/financeiro/fluxo-caixa', label: 'Fluxo de Caixa', grupo: 'E · Financeiro', icon: Landmark, oculto: true },
  { key: '/financeiro/receber', label: 'Contas a Receber', grupo: 'E · Financeiro', icon: DollarSign, oculto: true },
  { key: '/financeiro/pagar', label: 'Contas a Pagar', grupo: 'E · Financeiro', icon: DollarSign, oculto: true },

  // F · Gerencial
  { key: '/gerencial/auditoria', label: 'Logs de Auditoria', grupo: 'F · Gerencial', icon: ShieldCheck },
  { key: '/gerencial/usuarios', label: 'Usuários & Acessos', grupo: 'F · Gerencial', icon: Users },
  { key: '/gerencial/configuracoes', label: 'Configurações', grupo: 'F · Gerencial', icon: Settings },
];

function agrupar(lista: TelaDef[]) {
  return lista.reduce<Record<string, TelaDef[]>>((acc, t) => {
    (acc[t.grupo] ||= []).push(t);
    return acc;
  }, {});
}

/** Todas as telas agrupadas — usado pela matriz de permissões (Usuários & Acessos). */
export const TELAS_POR_GRUPO = agrupar(TELAS);

/** Só os itens que aparecem no menu lateral (exclui ocultos). */
export const TELAS_MENU = TELAS.filter((t) => !t.oculto);

/** Telas do menu agrupadas — usado pela sidebar (AppShell). */
export const TELAS_MENU_POR_GRUPO = agrupar(TELAS_MENU);

/** Um usuário com telas ['*'] (ou role ADMIN) enxerga tudo. */
export function podeVerTela(telas: string[] | undefined, role: string | undefined, key: string): boolean {
  if (role === 'ADMIN') return true;
  if (!telas || telas.length === 0) return false;
  return telas.includes('*') || telas.includes(key);
}

export type AcaoTela = 'CRIAR' | 'EDITAR' | 'EXCLUIR';
export const ACOES: { key: AcaoTela; label: string }[] = [
  { key: 'CRIAR', label: 'Criar' },
  { key: 'EDITAR', label: 'Editar' },
  { key: 'EXCLUIR', label: 'Excluir' },
];

/**
 * Pode executar uma ação (criar/editar/excluir) numa tela?
 * ADMIN sempre pode. Se o perfil não tem `acoes` configurado, ou a tela não foi
 * restringida individualmente, libera (padrão). Só bloqueia quando o admin
 * desmarca explicitamente a ação daquela tela.
 */
export function podeAcao(
  role: string | undefined,
  acoes: Record<string, string[]> | undefined,
  key: string,
  acao: AcaoTela,
): boolean {
  if (role === 'ADMIN') return true;
  if (!acoes) return true;
  const lista = acoes[key];
  if (lista === undefined) return true;
  return lista.includes(acao);
}

/** Resolve a rota inicial do usuário (telaInicial, 1ª tela permitida, ou /dashboard). */
export function rotaInicial(telas: string[] | undefined, role: string | undefined, telaInicial: string | null | undefined): string {
  if (role === 'ADMIN' || telas?.includes('*')) return telaInicial || '/dashboard';
  if (telaInicial && podeVerTela(telas, role, telaInicial)) return telaInicial;
  const primeira = TELAS_MENU.find((t) => podeVerTela(telas, role, t.key));
  return primeira?.key || '/dashboard';
}
