# 📋 CHANGES — ERP WMS Industrial Hetros

> Arquivo de controle de alterações do projeto.
> Atualizar sempre que fizer mudanças, mesmo pequenas.

---

## Como usar este arquivo

Adicione uma entrada no topo a cada alteração, seguindo o formato:

```
## [AAAA-MM-DD] — Descrição curta
### O que mudou
- Item 1
- Item 2
### Arquivos modificados
- `caminho/do/arquivo.ts`
```

---

## [2026-06-26] — Scaffold inicial completo + Login Kiosk

### O que mudou
- Criado projeto ERP WMS industrial completo (multi-tenant, multi-filial)
- Schema Prisma com 22+ tabelas cobrindo todos os módulos (A a F)
- Backend NestJS com Event-Driven Architecture (EventEmitter2)
- Login visual tipo kiosk: seleciona usuário por card, depois digita senha
- Usuário **LUID** criado como Admin Master via seed
- 5 usuários base no seed: LUID (Admin), Operador WMS, Comercial, Financeiro, Fiscal
- Frontend com sidebar retrátil (66 rotas mapeadas)
- Tela de Posição de Estoque com alertas FEFO/validade para FLV
- Dashboard operacional com KPIs em tempo real
- Motor de estoque com CMV, reserva, FEFO, transferência entre filiais
- NF-e service com integração SEFAZ (mock para dev) + evento automático de baixa de estoque

### Arquivos principais criados
- `backend/prisma/schema.prisma` — schema completo
- `backend/prisma/seed.ts` — seed com LUID + demais usuários
- `backend/src/modules/auth/auth.service.ts` — login por ID + listagem para kiosk
- `backend/src/modules/auth/auth.controller.ts` — endpoints públicos de auth
- `backend/src/modules/estoque/estoque.service.ts` — motor WMS
- `backend/src/modules/nfe/nfe.service.ts` — emissão + evento automático
- `frontend/src/pages/LoginPage.tsx` — tela kiosk de seleção de usuário
- `frontend/src/components/layout/AppShell.tsx` — sidebar retrátil 6 módulos
- `frontend/src/modules/estoque/pages/PosicaoEstoque.tsx` — estoque com alertas FLV
- `CHANGES.md` — este arquivo
- `.gitignore` — proteção de .env e node_modules

### Credenciais padrão (ambiente de desenvolvimento)
| Usuário | E-mail | Senha |
|---|---|---|
| LUID (Admin) | luid@hetros.com.br | admin123 |
| Operador WMS | operador@hetros.com.br | operador123 |
| Comercial | comercial@hetros.com.br | comercial123 |
| Financeiro | financeiro@hetros.com.br | financeiro123 |
| Fiscal | fiscal@hetros.com.br | fiscal123 |

> ⚠️ Troque as senhas antes de colocar em produção!

---

## Próximas implementações (backlog)

- [ ] Tela de Clientes com validação CNPJ/Sintegra
- [ ] Tela de Produtos com leitor de código de barras (câmera)
- [ ] Entrada de mercadorias por XML de NF-e (upload + parser)
- [ ] Pedido de venda com picking guiado (FEFO automático)
- [ ] Romaneio de carga com mapa de rota
- [ ] Emissão de NF-e com integração real Focus NFe
- [ ] DRE por filial/período
- [ ] Conciliação bancária via OFX
- [ ] Tela de Auditoria com filtros avançados
- [ ] App mobile para conferência de estoque (câmera + leitor)
- [ ] Integração com balança de pesagem (serial/TCP)
- [ ] Relatório de CMV e margem por produto/filial

---

## Como rodar o projeto

### Pré-requisitos
- Node.js 20+
- Docker Desktop
- Git

### Primeira vez
```bash
# 1. Sobe o banco e Redis
cd erp-wms
docker compose up postgres redis -d

# 2. Backend
cd backend
cp .env.example .env
# edite .env com suas configurações
npm install
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts   # cria LUID e demais usuários
npm run start:dev             # porta 3002

# 3. Frontend
cd ../frontend
npm install
npm run dev                   # porta automática (3000/3001/3003)
```

### Depois do primeiro setup (dia a dia)
```bash
docker compose up postgres redis -d
cd backend && npm run start:dev &
cd frontend && npm run dev
```

---

## Estrutura do projeto

```
erp-wms/
├── backend/                  NestJS + Prisma
│   ├── prisma/
│   │   ├── schema.prisma     Banco de dados completo
│   │   └── seed.ts           Dados iniciais (LUID, filial, etc.)
│   └── src/
│       ├── common/           Guards, interceptors, decorators
│       ├── modules/
│       │   ├── auth/         Login kiosk + JWT
│       │   ├── estoque/      Motor WMS (CMV, FEFO, reserva)
│       │   ├── nfe/          DFe + evento automático
│       │   ├── pedidos/      Pedidos + picking
│       │   ├── financeiro/   CR/CP + DRE
│       │   └── ...           Demais módulos
│       └── events/           Event-Driven listeners
├── frontend/                 React + Tailwind
│   └── src/
│       ├── pages/            Login (kiosk), Dashboard
│       ├── modules/
│       │   ├── estoque/      Posição de estoque + alertas FLV
│       │   └── ...           Demais módulos
│       └── components/
│           └── layout/       AppShell (sidebar retrátil)
├── docker-compose.yml        PostgreSQL 16 + Redis 7
├── .gitignore
└── CHANGES.md                Este arquivo
```
