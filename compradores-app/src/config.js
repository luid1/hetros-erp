import Constants from 'expo-constants';

// URL do backend HETROS. Trocar em app.json > expo.extra.apiUrl antes do build (eas build)
// para a URL pública (túnel ngrok/cloudflared em teste, ou o host de produção).
export const API_URL =
  (Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.apiUrl) ||
  'http://192.168.0.100:3002/api/v1';

export const CORES = {
  bg: '#0B0F17',
  card: '#131B29',
  card2: '#0E141F',
  borda: 'rgba(255,255,255,0.08)',
  texto: '#E2E8F0',
  sub: '#94A3B8',
  fraco: '#64748B',
  sky: '#38BDF8',
  amber: '#FBBF24',
  verde: '#34D399',
  vermelho: '#FB7185',
};
