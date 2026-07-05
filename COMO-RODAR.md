# ▶️ Como rodar o Hetros ERP (guia rápido)

Guia direto dos comandos para subir o sistema na sua máquina (Windows / PowerShell).

> **Caminho do projeto:** `C:\Users\Luid\Desktop\hetros-erp\hetros-erp-main`
> Sempre que um passo pedir `cd`, use o caminho completo acima.

---

## ✅ Pré-requisitos (instalar uma vez)

- **Node.js** 18+ → https://nodejs.org
- **PostgreSQL** rodando (local ou Docker)
- Arquivo **`backend/.env`** com a `DATABASE_URL`, ex:
  ```
  DATABASE_URL="postgresql://postgres:senha@localhost:5432/hetros?schema=public"
  JWT_SECRET="algum-segredo"
  ```

Instalar dependências (uma vez, ou quando o `package.json` mudar):
```powershell
cd C:\Users\Luid\Desktop\hetros-erp\hetros-erp-main\backend
npm install
cd C:\Users\Luid\Desktop\hetros-erp\hetros-erp-main\frontend
npm install
```

---

## 1️⃣ Preparar o banco + dados de teste (rodar UMA vez)

Faça isso com os servidores **parados**. Na raiz do projeto:

```powershell
cd C:\Users\Luid\Desktop\hetros-erp\hetros-erp-main
.\setup-teste.ps1
```

Isso executa, em ordem:
1. `prisma db push` — cria as tabelas
2. `prisma generate` — atualiza o client
3. `prisma:seed` — tenant, filial, usuários e produtos
4. `prisma:seed:teste` — clientes, fornecedores, transportadoras, frotas, pedidos, NF-es e notas fiscais

> Se o Windows bloquear o script:
> ```powershell
> powershell -ExecutionPolicy Bypass -File .\setup-teste.ps1
> ```

**Alternativa manual** (se preferir não usar o script):
```powershell
cd C:\Users\Luid\Desktop\hetros-erp\hetros-erp-main\backend
npx prisma db push
npx prisma generate
npm run prisma:seed
npm run prisma:seed:teste
```

---

## 2️⃣ Subir o sistema (toda vez que for usar)

Precisa de **2 terminais abertos ao mesmo tempo**. Se fechar, o site cai.

### Terminal 1 — Backend (porta 3002)
```powershell
cd C:\Users\Luid\Desktop\hetros-erp\hetros-erp-main\backend
npm run start:dev
```
Aguarde: **`Nest application successfully started`**

### Terminal 2 — Frontend (porta 3000)
```powershell
cd C:\Users\Luid\Desktop\hetros-erp\hetros-erp-main\frontend
npm run dev
```
Aguarde: **`Local: http://localhost:3000/`**

---

## 3️⃣ Acessar

Abra no navegador: **http://localhost:3000**

**Login:** `luid@hetros.com.br`  ·  **Senha:** `admin123`

Outros usuários de teste (mesmo padrão de senha):
| Perfil        | E-mail                      | Senha         |
|---------------|-----------------------------|---------------|
| Admin         | luid@hetros.com.br          | admin123      |
| Operador WMS  | operador@hetros.com.br      | operador123   |
| Comercial     | comercial@hetros.com.br     | comercial123  |
| Financeiro    | financeiro@hetros.com.br    | financeiro123 |
| Fiscal        | fiscal@hetros.com.br        | fiscal123     |

---

## 🔧 Problemas comuns

| Sintoma | Causa / Solução |
|---|---|
| `ERR_CONNECTION_REFUSED` em localhost:3000 | O frontend não está rodando. Rode o **Terminal 2**. |
| Erros de API / login não funciona | O backend não está rodando. Rode o **Terminal 1**. |
| `prisma db push` falha com DLL travada (EPERM) | Pare o backend antes de rodar o setup. |
| `Can't reach database server` | Postgres não está rodando ou `DATABASE_URL` errada no `backend/.env`. |
| Porta 3000/3002 "em uso" | Feche o processo antigo (ou o terminal que já estava rodando). |

---

## 📚 Outros arquivos úteis

- `CHANGES.md` — histórico de alterações do projeto
- `setup-teste.ps1` — script que prepara banco + seed (passo 1)
