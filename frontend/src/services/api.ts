import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wms_token');
  const filial = localStorage.getItem('wms_filial');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (filial) config.headers['x-filial-id'] = JSON.parse(filial).id;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      ['wms_token', 'wms_user', 'wms_filial', 'wms_filiais'].forEach((k) => localStorage.removeItem(k));
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;

// Estoque / WMS
export const estoqueApi = {
  posicao: (filialId: string, alertaValidade?: boolean) =>
    api.get(`/estoque/${filialId}/saldo`, { params: { alertaValidade } }),
  saldoProduto: (filialId: string, produtoId: string) =>
    api.get(`/estoque/${filialId}/saldo/${produtoId}`),
  alertasValidade: (filialId: string, dias?: number) =>
    api.get(`/estoque/${filialId}/alertas-validade`, { params: { dias } }),
  movimentacoes: (filialId: string, params?: object) =>
    api.get(`/estoque/${filialId}/movimentacoes`, { params }),
  ajuste: (data: object) => api.post('/estoque/ajuste', data),
  transferencia: (data: object) => api.post('/estoque/transferencia', data),
};

// NF-e
export const nfeApi = {
  list: (filialId: string, params?: object) => api.get(`/nfe/${filialId}`, { params }),
  get: (id: string) => api.get(`/nfe/documento/${id}`),
  gerarDePedido: (pedidoId: string, filialId: string) =>
    api.post(`/nfe/gerar-de-pedido/${pedidoId}`, { filialId }),
  emitir: (id: string) => api.post(`/nfe/${id}/emitir`),
  cancelar: (id: string, motivo: string) => api.patch(`/nfe/${id}/cancelar`, { motivo }),
};

// Pedidos
export const pedidosApi = {
  list: (filialId: string, params?: object) => api.get('/pedidos', { params: { filialId, ...params } }),
  get: (id: string) => api.get(`/pedidos/${id}`),
  create: (data: object) => api.post('/pedidos', data),
  updateStatus: (id: string, status: string) => api.patch(`/pedidos/${id}/status`, { status }),
  confirmar: (id: string) => api.patch(`/pedidos/${id}/confirmar`),
  reposicao: (id: string, data: object) => api.post(`/pedidos/${id}/reposicao`, data),
};

// Clientes
export const clientesApi = {
  list: (params?: object) => api.get('/clientes', { params }),
  get: (id: string) => api.get(`/clientes/${id}`),
  create: (data: object) => api.post('/clientes', data),
  update: (id: string, data: object) => api.put(`/clientes/${id}`, data),
};

// Produtos
export const produtosApi = {
  list: (params?: object) => api.get('/produtos', { params }),
  get: (id: string) => api.get(`/produtos/${id}`),
  create: (data: object) => api.post('/produtos', data),
  update: (id: string, data: object) => api.put(`/produtos/${id}`, data),
  buscarPorBarras: (codigo: string) => api.get('/produtos/barras/' + codigo),
};

// Compras (Ordens de Compra) + Fornecedores + sugestão de reposição
export const comprasApi = {
  list: (params?: object) => api.get('/compras', { params }),
  get: (id: string) => api.get(`/compras/${id}`),
  create: (data: object) => api.post('/compras', data),
  update: (id: string, data: object) => api.put(`/compras/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch(`/compras/${id}/status`, { status }),
  aComprar: (filialId: string) => api.get(`/estoque/${filialId}/a-comprar`),
  produtosStatus: (filialId: string) => api.get(`/estoque/${filialId}/produtos-status`),
  historicoProduto: (produtoId: string) => api.get(`/compras/produto/${produtoId}/historico`),
};

export const fornecedoresApi = {
  list: (params?: object) => api.get('/fornecedores', { params }),
};

// Entradas de mercadoria (recebimento)
export const entradasApi = {
  list: (params?: object) => api.get('/entradas', { params }),
  get: (id: string) => api.get(`/entradas/${id}`),
};

// Documentos de transporte MDF-e / CT-e (Frente F.1 — persistidos, modo simulação)
export const documentosTransporteApi = {
  list: (params?: { filialId?: string; tipo?: 'MDFE' | 'CTE' }) =>
    api.get('/documentos-transporte', { params }),
  create: (dto: {
    filialId: string;
    tipo: 'MDFE' | 'CTE';
    placa: string;
    motorista?: string;
    ufIni: string;
    ufFim: string;
    valor?: number;
    nfes?: { numero: number; valor: number }[];
  }) => api.post('/documentos-transporte', dto),
  atualizarStatus: (id: string, status: 'ENCERRADO' | 'CANCELADO') =>
    api.patch(`/documentos-transporte/${id}/status`, { status }),
};

// Financeiro
export const financeiroApi = {
  // Contas a Receber
  receber: (params?: object) => api.get('/contas-receber', { params }),
  receberResumo: (params?: object) => api.get('/contas-receber/resumo', { params }),
  receberDetalhe: (id: string) => api.get(`/contas-receber/${id}`),
  criarReceber: (data: object) => api.post('/contas-receber', data),
  baixarReceber: (id: string, data: object) => api.patch(`/contas-receber/${id}/baixar`, data),
  cancelarReceber: (id: string, motivo?: string) =>
    api.patch(`/contas-receber/${id}/cancelar`, { motivo }),
  // Contas a Pagar
  pagar: (params?: object) => api.get('/contas-pagar', { params }),
  pagarResumo: (params?: object) => api.get('/contas-pagar/resumo', { params }),
  pagarDetalhe: (id: string) => api.get(`/contas-pagar/${id}`),
  criarPagar: (data: object) => api.post('/contas-pagar', data),
  baixarPagar: (id: string, data: object) => api.patch(`/contas-pagar/${id}/baixar`, data),
  cancelarPagar: (id: string, motivo?: string) =>
    api.patch(`/contas-pagar/${id}/cancelar`, { motivo }),
  // Plano de Contas
  planoContas: {
    list: (incluirInativas?: boolean) =>
      api.get('/plano-contas', { params: incluirInativas ? { incluirInativas: 'true' } : {} }),
    analiticas: () => api.get('/plano-contas/analiticas'),
    criar: (data: object) => api.post('/plano-contas', data),
    atualizar: (id: string, data: object) => api.patch(`/plano-contas/${id}`, data),
    remover: (id: string) => api.delete(`/plano-contas/${id}`),
    semear: () => api.post('/plano-contas/semear'),
  },
  // Relatórios
  dre: (params?: object) => api.get('/dre', { params }),
  dreCompleto: (params?: object) => api.get('/dre/completo', { params }),
};

// Fluxo de Caixa (consolidado realizado)
export const fluxoCaixaApi = {
  consolidado: (params?: object) => api.get('/fluxo-caixa', { params }),
};

// Vendedores (Frente B)
export const vendedoresApi = {
  list: (incluirInativos?: boolean) =>
    api.get('/vendedores', { params: incluirInativos ? { incluirInativos: 'true' } : {} }),
  get: (id: string) => api.get(`/vendedores/${id}`),
  criar: (data: object) => api.post('/vendedores', data),
  atualizar: (id: string, data: object) => api.patch(`/vendedores/${id}`, data),
  remover: (id: string) => api.delete(`/vendedores/${id}`),
};

// Comissões (Frente B)
export const comissoesApi = {
  list: (params?: object) => api.get('/comissoes', { params }),
  resumo: () => api.get('/comissoes/resumo'),
  fechar: (data: object) => api.post('/comissoes/fechar', data),
};

// Tesouraria — contas financeiras, caixa e conciliação (Frente G)
export const tesourariaApi = {
  // Contas financeiras
  contas: (incluirInativas?: boolean) =>
    api.get('/tesouraria/contas', { params: incluirInativas ? { incluirInativas: 'true' } : {} }),
  conta: (id: string) => api.get(`/tesouraria/contas/${id}`),
  criarConta: (data: object) => api.post('/tesouraria/contas', data),
  atualizarConta: (id: string, data: object) => api.patch(`/tesouraria/contas/${id}`, data),
  removerConta: (id: string) => api.delete(`/tesouraria/contas/${id}`),
  resumo: () => api.get('/tesouraria/resumo'),
  // Movimentos
  movimentos: (params?: object) => api.get('/tesouraria/movimentos', { params }),
  movimentoAvulso: (data: object) => api.post('/tesouraria/movimentos', data),
  transferir: (data: object) => api.post('/tesouraria/transferencias', data),
  // Conciliação (OFX)
  extratos: (contaId?: string) => api.get('/tesouraria/extratos', { params: contaId ? { contaId } : {} }),
  itensExtrato: (extratoId: string) => api.get(`/tesouraria/extratos/${extratoId}/itens`),
  importarExtrato: (data: object) => api.post('/tesouraria/extratos/importar', data),
  conciliar: (data: object) => api.post('/tesouraria/conciliar', data),
};

// Despesas recorrentes (Frente I)
export const recorrenciasApi = {
  listar: (ativo?: boolean) =>
    api.get('/recorrencias', { params: ativo === undefined ? {} : { ativo: String(ativo) } }),
  get: (id: string) => api.get(`/recorrencias/${id}`),
  preview: (id: string, quantidade = 6) =>
    api.get(`/recorrencias/${id}/preview`, { params: { quantidade } }),
  criar: (data: object) => api.post('/recorrencias', data),
  atualizar: (id: string, data: object) => api.patch(`/recorrencias/${id}`, data),
  remover: (id: string) => api.delete(`/recorrencias/${id}`),
  gerar: () => api.post('/recorrencias/gerar', {}),
};

// Pessoas / Funcionários (Frente C)
export const pessoasApi = {
  list: (params?: object) => api.get('/funcionarios', { params }),
  get: (id: string) => api.get(`/funcionarios/${id}`),
  criar: (data: object) => api.post('/funcionarios', data),
  atualizar: (id: string, data: object) => api.patch(`/funcionarios/${id}`, data),
  remover: (id: string) => api.delete(`/funcionarios/${id}`),
};

// Folha de pagamento (Frente C)
export const folhaApi = {
  list: (params?: object) => api.get('/folha', { params }),
  get: (id: string) => api.get(`/folha/${id}`),
  criar: (data: object) => api.post('/folha', data),
  atualizar: (id: string, data: object) => api.patch(`/folha/${id}`, data),
  remover: (id: string) => api.delete(`/folha/${id}`),
  gerarPadrao: (id: string) => api.post(`/folha/${id}/gerar-padrao`, {}),
  adicionarItem: (id: string, data: object) => api.post(`/folha/${id}/itens`, data),
  removerItem: (id: string, itemId: string) => api.delete(`/folha/${id}/itens/${itemId}`),
  fechar: (id: string, data: object) => api.post(`/folha/${id}/fechar`, data),
  reabrir: (id: string) => api.post(`/folha/${id}/reabrir`, {}),
};

// Pagamentos de motorista — diária/frete (Frente D)
export const pagamentosMotoristaApi = {
  list: (params?: object) => api.get('/pagamentos-motorista', { params }),
  get: (id: string) => api.get(`/pagamentos-motorista/${id}`),
  criar: (data: object) => api.post('/pagamentos-motorista', data),
  atualizarValor: (id: string, valor: number) => api.patch(`/pagamentos-motorista/${id}/valor`, { valor }),
  aprovar: (id: string, data: object) => api.post(`/pagamentos-motorista/${id}/aprovar`, data),
  cancelar: (id: string, motivo?: string) => api.post(`/pagamentos-motorista/${id}/cancelar`, { motivo }),
  sincronizar: () => api.post('/pagamentos-motorista/sincronizar', {}),
};


// Rotas / Logística avançada (Torre de Controle + App do Motorista)
export const rotasApi = {
  listar: (filialId: string, dataRota?: string) =>
    api.get('/rotas', { params: { filialId, dataRota } }),
  get: (id: string) => api.get(`/rotas/${id}`),
  doMotorista: (nome: string) => api.get(`/rotas/motorista/${encodeURIComponent(nome)}`),
  otimizar: (data: { filialId: string; dataRota: string; pedidoIds?: string[]; folgaCapacidade?: number }) =>
    api.post('/rotas/otimizar', data),
  confirmarEntrega: (
    stopId: string,
    data: {
      latitude: number;
      longitude: number;
      assinaturaBase64: string;
      fotoBase64?: string;
      recebedorNome: string;
      recebedorDoc?: string;
    },
  ) => api.post(`/rotas/stops/${stopId}/confirmar`, data),
};

// Auditoria
export const auditoriaApi = {
  logs: (params?: object) => api.get('/auditoria', { params }),
};

// Relatórios gerenciais (Frente L)
export const relatoriosApi = {
  curvaABC: (params: { tipo?: 'produto' | 'cliente'; de?: string; ate?: string; filialId?: string }) =>
    api.get('/relatorios/curva-abc', { params }),
  giroEstoque: (params: { de?: string; ate?: string; filialId?: string }) =>
    api.get('/relatorios/giro-estoque', { params }),
  ranking: (params: { tipo?: 'vendedor' | 'cliente' | 'produto'; de?: string; ate?: string; filialId?: string }) =>
    api.get('/relatorios/ranking', { params }),
  agingFinanceiro: (params?: { filialId?: string }) =>
    api.get('/relatorios/aging-financeiro', { params }),
};

// Notificações (Frente K)
export const notificacoesApi = {
  list: (params?: { naoLidas?: boolean; limit?: number }) =>
    api.get('/notificacoes', {
      params: { naoLidas: params?.naoLidas ? 'true' : undefined, limit: params?.limit },
    }),
  naoLidas: () => api.get('/notificacoes/nao-lidas'),
  marcarLida: (id: string) => api.post(`/notificacoes/${id}/lida`, {}),
  marcarTodasLidas: () => api.post('/notificacoes/marcar-todas-lidas', {}),
  remover: (id: string) => api.delete(`/notificacoes/${id}`),
  gerar: () => api.post('/notificacoes/gerar', {}),
};

// Precificação por tabela (Frente M.2)
export const precificacaoApi = {
  listar: (params?: { produtoId?: string; tabela?: string; search?: string }) =>
    api.get('/precificacao/tabelas', { params }),
  resolver: (params: { produtoId: string; tabela?: string; clienteId?: string; data?: string }) =>
    api.get('/precificacao/resolver', { params }),
  resolverLote: (dto: { produtoIds: string[]; tabela?: string; clienteId?: string; data?: string }) =>
    api.post('/precificacao/resolver-lote', dto),
  upsert: (dto: {
    produtoId: string;
    tabela: string;
    preco: number;
    promoAtiva?: boolean;
    promoPreco?: number | null;
    promoInicio?: string | null;
    promoFim?: string | null;
    ativo?: boolean;
  }) => api.post('/precificacao/tabelas', dto),
  remover: (id: string) => api.delete(`/precificacao/tabelas/${id}`),
};

// Devoluções de compra ao fornecedor (Frente M.1)
export const devolucoesCompraApi = {
  list: (params?: { fornecedorId?: string; status?: string }) =>
    api.get('/devolucoes-compra', { params }),
  get: (id: string) => api.get(`/devolucoes-compra/${id}`),
  create: (dto: {
    filialId: string;
    fornecedorId?: string;
    entradaId?: string;
    motivo?: string;
    observacoes?: string;
    itens: { produtoId: string; descricao?: string; quantidade: number; valorUnitario?: number; loteId?: string }[];
  }) => api.post('/devolucoes-compra', dto),
};
