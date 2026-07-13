# Deploy do backend Hetros no Railway

Objetivo: o backend rodar na nuvem com **URL fixa**, para o app do celular (e a web)
alcançarem de qualquer lugar. O offline-first do app continua — ele só passa a ter um
destino estável para sincronizar.

> O que **você** faz: criar a conta e clicar (só você pode autenticar).
> O que **eu** já deixei pronto: Dockerfile, migrations, seed no 1º boot, `railway.json`.

---

## Passo a passo (uma vez)

### 1. Conta + projeto
1. Acesse **https://railway.app** → **Login** com o **GitHub** (o mesmo do `luid1`).
2. **New Project** → **Deploy from GitHub repo** → autorize e escolha **`luid1/hetros-erp`**.

### 2. Apontar o serviço para a pasta do backend
3. Abra o serviço criado → **Settings** → **Source** → **Root Directory** = `backend`.
   (Assim o Railway usa o `backend/Dockerfile`.)

### 3. Banco de dados
4. No projeto: **New** → **Database** → **PostgreSQL**. O Railway cria o Postgres.

### 4. Variáveis de ambiente (no serviço do backend → aba **Variables**)
Adicione:
| Variável | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referência ao banco criado acima) |
| `JWT_SECRET` | uma string longa e aleatória (ex.: 40+ caracteres) |
| `SEED_ON_BOOT` | `true` **(só no 1º deploy)** — popula tenant/usuários/produtos |
| `NFE_PROVIDER` | `mock` |
| `NODE_ENV` | `production` |

> O `PORT` o Railway injeta sozinho — não precisa definir.

### 5. Domínio público
5. Serviço do backend → **Settings** → **Networking** → **Generate Domain**.
   Isso gera algo como `https://hetros-backend-production.up.railway.app`.

### 6. Deploy e verificação
6. O Railway builda e sobe. Nos **Logs**, aguarde:
   - `✅ Tenant criado / Usuário criado …` (o seed rodou)
   - `Nest application successfully started`
7. Teste no navegador: `https://SEU-DOMINIO/api/docs` (deve abrir o Swagger).

### 7. Desligar o seed
8. Depois do 1º deploy dar certo, **mude `SEED_ON_BOOT` para `false`** (ou apague a
   variável) e faça um redeploy. Assim o seed não roda de novo a cada subida.

---

## Depois que estiver no ar
Me passe a **URL do domínio** (`https://…up.railway.app`). Eu:
- aponto o app do celular para ela (`app.json > extra.apiUrl`),
- **rebuildo o APK** — e aí a CI criada no celular sobe pra nuvem de verdade
  (na hora, se online; pela fila, se offline).

## Login inicial (do seed)
- **Admin:** luid@hetros.com.br / admin123
- **Compradores:** leide@hetros.com.br / 123456 · guilherme@hetros.com.br / 123456
- ⚠️ Troque as senhas depois do primeiro acesso.

## Observações
- **Custo:** o Railway cobra por uso (~US$5/mês no plano Hobby). Confira o preço atual no painel.
- **NF-e** continua em simulação na nuvem (emissão real depende do certificado A1 — F.2).
- **Redis** não é necessário para o boot; se algum recurso de fila for ativado no futuro,
  adiciona-se um Redis no projeto e a variável `REDIS_HOST`/`REDIS_PORT`.
