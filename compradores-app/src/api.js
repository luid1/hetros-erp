import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

let token = null;
export const setToken = (t) => { token = t; };
export const getToken = () => token;

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  // Evita a tela intersticial do localtunnel (loca.lt) em túnel de teste
  headers: { 'Bypass-Tunnel-Reminder': 'true', 'User-Agent': 'HetrosCompradores' },
});

api.interceptors.request.use(async (cfg) => {
  const t = token || (await AsyncStorage.getItem('token'));
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// Cache local simples (offline) — última resposta boa de cada chave
export async function cacheGet(chave) {
  try { const v = await AsyncStorage.getItem('cache:' + chave); return v ? JSON.parse(v) : null; } catch { return null; }
}
export async function cacheSet(chave, valor) {
  try { await AsyncStorage.setItem('cache:' + chave, JSON.stringify(valor)); } catch {}
}

// GET com fallback pro cache (mostra últimos preços mesmo sem internet)
export async function getComCache(url, chave) {
  try {
    const { data } = await api.get(url);
    await cacheSet(chave, data);
    return { data, offline: false };
  } catch (e) {
    const cache = await cacheGet(chave);
    if (cache) return { data: cache, offline: true };
    throw e;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// OUTBOX (fila offline) — CIs digitadas sem internet ficam guardadas no aparelho
// e são enviadas sozinhas quando a conexão volta. Nada se perde na pedra.
// ───────────────────────────────────────────────────────────────────────────
const OUTBOX_KEY = 'outbox:compras';

// Erro "sem internet" = a requisição não chegou ao servidor (sem response HTTP).
// Um 4xx/5xx (com response) é rejeição real do servidor — esse NÃO vai pra fila.
export function ehErroDeRede(e) {
  return !e?.response;
}

async function outboxRead() {
  try { const v = await AsyncStorage.getItem(OUTBOX_KEY); return v ? JSON.parse(v) : []; } catch { return []; }
}
async function outboxWrite(lista) {
  try { await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(lista)); } catch {}
}

/** Quantas CIs estão aguardando envio. */
export async function outboxCount() {
  return (await outboxRead()).length;
}

/** Enfileira uma CI (payload do POST /compras) com um id local. */
export async function outboxAdd(payload) {
  const lista = await outboxRead();
  const item = {
    localId: 'loc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    criadoEm: new Date().toISOString(),
    payload: { ...payload, clientRef: payload.clientRef || ('cli_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)) },
  };
  lista.push(item);
  await outboxWrite(lista);
  return item;
}

/**
 * Tenta enviar tudo que está na fila. Só remove da fila o que o servidor aceitou
 * (ou rejeitou de forma definitiva com 4xx — não adianta reenviar payload inválido).
 * Erro de rede mantém na fila pra próxima tentativa.
 * Retorna { enviadas, restantes }.
 */
export async function flushOutbox() {
  let lista = await outboxRead();
  if (lista.length === 0) return { enviadas: 0, restantes: 0 };
  let enviadas = 0;
  const pendentes = [];
  for (const item of lista) {
    try {
      await api.post('/compras', item.payload);
      enviadas++;
    } catch (e) {
      if (ehErroDeRede(e)) {
        pendentes.push(item);            // ainda sem internet — mantém pra depois
      } else {
        // 4xx/5xx definitivo: descarta pra não travar a fila (payload inválido/duplicado).
        // (não conta como enviada; simplesmente sai da fila)
      }
    }
  }
  await outboxWrite(pendentes);
  return { enviadas, restantes: pendentes.length };
}
