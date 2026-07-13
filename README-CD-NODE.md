# CD NODE — rodar o Hetros ERP no mini-PC do CD

Fase **P1** do Jeito B (ver `PLANO-JEITO-B-SERVIDOR-LOCAL.md`): sobe o sistema inteiro
localmente no mini-PC do CD, para os PCs do galpão usarem pela rede interna — **mesmo sem
internet**. (A sincronização com a nuvem é P2/P3, ainda não implementada.)

## Pré-requisitos (no mini-PC)
- **Docker Desktop** (Windows/Mac) ou **Docker Engine + Compose** (Linux) instalado.
- Estar na **mesma rede** dos outros PCs do CD. Anote o **IP local** do mini-PC
  (ex.: `192.168.0.50`). No Windows: `ipconfig` → "Endereço IPv4".

## Subir (um comando)
```bash
# 1) uma vez: crie o .env a partir do exemplo e edite (senha + JWT_SECRET)
cp .env.cd.example .env

# 2) sobe tudo (build na 1ª vez pode levar alguns minutos)
docker compose -f docker-compose.cd.yml up -d --build
```

## Acessar dos PCs do CD
No navegador de qualquer PC do galpão:
```
http://<IP-do-mini-PC>        (ex.: http://192.168.0.50)
```
Login inicial (do seed): **luid@hetros.com.br / admin123** — troque a senha depois.

## Operação
```bash
docker compose -f docker-compose.cd.yml ps        # status
docker compose -f docker-compose.cd.yml logs -f    # logs
docker compose -f docker-compose.cd.yml down       # parar (mantém os dados no volume)
docker compose -f docker-compose.cd.yml up -d      # subir de novo
```
Os dados ficam nos volumes `cd_postgres_data` / `cd_redis_data` (persistem entre reinícios).

## Notas
- **NF-e fica em simulação** no CD node (emissão fiscal real é só na nuvem/online) — por design.
- `SEED_ON_BOOT=true` popula dados de teste na 1ª subida. Quando a sincronização com a nuvem
  entrar (P2), mude para `false` no `.env` para os dados virem da nuvem.
- O mini-PC deve ficar **sempre ligado**; o Docker reinicia os serviços sozinho
  (`restart: unless-stopped`).
