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
