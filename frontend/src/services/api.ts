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
  historicoProduto: (produtoId: string) => api.get(`/compras/produto/${produtoId}/historico`),
};

export const fornecedoresApi = {
  list: (params?: object) => api.get('/fornecedores', { params }),
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
  // Relatórios
  dre: (params?: object) => api.get('/dre', { params }),
  dreCompleto: (params?: object) => api.get('/dre/completo', { params }),
};

// Fluxo de Caixa (consolidado realizado)
export const fluxoCaixaApi = {
  consolidado: (params?: object) => api.get('/fluxo-caixa', { params }),
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
