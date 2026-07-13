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

# Ao subir: aplica migrations e inicia. Se SEED_ON_BOOT=true (1ª subida num banco
# vazio, ex.: Railway), roda o seed idempotente antes — popula tenant/usuários/produtos.
# Depois do 1º deploy, deixe SEED_ON_BOOT em branco/false.
# 1ª subida sobre um banco pré-existente (criado por db push): rode uma vez
#   `npx prisma migrate resolve --applied 20260708000000_baseline` para baselinar.
CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$SEED_ON_BOOT\" = \"true\" ]; then npx ts-node prisma/seed.ts || true; fi && node dist/src/main"]
