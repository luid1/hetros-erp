# Backend HETROS (NestJS + Prisma) — deploy em Render/Railway/Fly
FROM node:20-bookworm-slim

WORKDIR /app

# Prisma precisa do openssl
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Dependências (usa o lockfile)
COPY package*.json ./
RUN npm ci

# Código + geração do client + build
COPY . .
RUN npx prisma generate && npm run build

EXPOSE 3002

# Ao subir: sincroniza o schema no banco gerenciado (db push) e inicia
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/src/main"]
