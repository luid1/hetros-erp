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

// Financeiro
export const financeiroApi = {
  receber: (params?: object) => api.get('/contas-receber', { params }),
  pagar: (params?: object) => api.get('/contas-pagar', { params }),
  baixarReceber: (id: string, data: object) => api.patch(`/contas-receber/${id}/baixar`, data),
  dre: (params?: object) => api.get('/dre', { params }),
};

// Auditoria
export const auditoriaApi = {
  logs: (params?: object) => api.get('/auditoria', { params }),
};
