# Frontend HETROS (Vite/React) — build estático servido por nginx.
# O nginx também faz proxy de /api -> backend, então frontend e API ficam na MESMA
# origem (sem CORS). Usado no "CD node" (docker-compose.cd.yml) e em deploy web.

# ── Estágio 1: build ──
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Estágio 2: runtime (nginx) ──
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
