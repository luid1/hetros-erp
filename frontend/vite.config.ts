import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    // Libera acesso externo via túnel (localtunnel/ngrok/cloudflare) para demonstração
    allowedHosts: ['.loca.lt', '.ngrok-free.app', '.trycloudflare.com'],
    proxy: {
      '/api': { target: 'http://localhost:3002', changeOrigin: true },
    },
  },
  // Servidor de PRODUÇÃO (npm run build + npm run preview) — usado para demonstrar via túnel
  preview: {
    port: 3005,
    allowedHosts: ['.loca.lt', '.ngrok-free.app', '.trycloudflare.com'],
    proxy: {
      '/api': { target: 'http://localhost:3002', changeOrigin: true },
    },
  },
});
