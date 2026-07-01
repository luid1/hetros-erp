// Catálogo central das telas do ERP — usado pelo menu, pelo guard de rotas
// e pela tela de Perfis (Usuários & Acessos). A "key" é a própria rota.

export interface TelaDef { key: string; label: string; grupo: string }

export const TELAS: TelaDef[] = [
  // Visão geral
  { key: '/dashboard', label: 'Painel Operacional', grupo: 'Visão Geral' },
  // Cadastros
  { key: '/cadastros/clientes', label: 'Clientes', grupo: 'Cadastros' },
  { key: '/cadastros/fornecedores', label: 'Fornecedores', grupo: 'Cadastros' },
  { key: '/cadastros/transportadoras', label: 'Transportadoras', grupo: 'Cadastros' },
  { key: '/cadastros/produtos', label: 'Produtos & NCM', grupo: 'Cadastros' },
  { key: '/cadastros/filiais', label: 'Filiais / Boxes', grupo: 'Cadastros' },
  // Estoque / WMS
  { key: '/wms/posicao', label: 'Posição de Estoque', grupo: 'Estoque / WMS' },
  { key: '/wms/pereciveis', label: 'Perecíveis / FLV', grupo: 'Estoque / WMS' },
  { key: '/wms/entradas', label: 'Entradas (XML NF-e)', grupo: 'Estoque / WMS' },
  { key: '/wms/movimentacoes', label: 'Movimentações', grupo: 'Estoque / WMS' },
  { key: '/wms/inventario', label: 'Inventário', grupo: 'Estoque / WMS' },
  { key: '/wms/analise-estoque', label: 'Análise Estoque Físico', grupo: 'Estoque / WMS' },
  // Logística
  { key: '/logistica/pedidos', label: 'Pedidos de Venda', grupo: 'Logística' },
  { key: '/logistica/carga', label: 'Controle de Carga', grupo: 'Logística' },
  { key: '/logistica/lider', label: 'Líder / Separação', grupo: 'Logística' },
  { key: '/logistica/operacional', label: 'Operacional / Separação', grupo: 'Logística' },
  { key: '/logistica/frete', label: 'Frete por Motorista', grupo: 'Logística' },
  { key: '/logistica/romaneios', label: 'Romaneios', grupo: 'Logística' },
  { key: '/logistica/frotas', label: 'Frotas & Veículos', grupo: 'Logística' },
  // Fiscal
  { key: '/fiscal/nfe', label: 'NF-e Emitidas', grupo: 'Fiscal / DFe' },
  { key: '/fiscal/emitir', label: 'Faturamento', grupo: 'Fiscal / DFe' },
  { key: '/fiscal/painel', label: 'Painel de Faturamento', grupo: 'Fiscal / DFe' },
  { key: '/fiscal/matriz', label: 'Matriz Fiscal', grupo: 'Fiscal / DFe' },
  { key: '/fiscal/cte', label: 'CT-e / MDF-e', grupo: 'Fiscal / DFe' },
  // Financeiro
  { key: '/financeiro/receber', label: 'Contas a Receber', grupo: 'Financeiro' },
  { key: '/financeiro/pagar', label: 'Contas a Pagar', grupo: 'Financeiro' },
  { key: '/financeiro/dre', label: 'DRE & Relatórios', grupo: 'Financeiro' },
  // Gerencial
  { key: '/gerencial/auditoria', label: 'Logs de Auditoria', grupo: 'Gerencial' },
  { key: '/gerencial/usuarios', label: 'Usuários & Acessos', grupo: 'Gerencial' },
  { key: '/gerencial/configuracoes', label: 'Configurações', grupo: 'Gerencial' },
];

export const TELAS_POR_GRUPO = TELAS.reduce<Record<string, TelaDef[]>>((acc, t) => {
  (acc[t.grupo] ||= []).push(t);
  return acc;
}, {});

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
  const primeira = TELAS.find((t) => podeVerTela(telas, role, t.key));
  return primeira?.key || '/dashboard';
}
