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

## [2026-06-27] — Pedidos integrado + Nova Entrega real

### O que mudou
- **Backend PedidosService** completo: create, findAll (com filtros), findOne, confirmar, cancelar, updateStatus
- **PedidosController** com POST/GET/PATCH endpoints
- **Modal Nova Entrega** real no Controle de Carga:
  - Busca de clientes do banco (399 clientes importados) com pesquisa por nome/CNPJ
  - Seleção visual do cliente (card verde com dados)
  - Campos: Data Entrega, Período (Manhã/Tarde), Tipo Faturamento (NFe/Repo/NFC-e), Volumes, Peso, Região, Observações
  - Cria pedido real via API `POST /pedidos`
  - Pedido criado aparece na grade como linha vermelha (Impressão Pendente)
- **Integração completa**: Clientes → Pedidos → Grade de Carga
- Botão "Nova Entrega" abre modal ao invés de alert

### Arquivos modificados
- `backend/src/modules/pedidos/pedidos.service.ts` — CRUD completo
- `backend/src/modules/pedidos/pedidos.controller.ts` — endpoints
- `frontend/src/modules/logistica/pages/ControleCarga.tsx` — modal Nova Entrega (~200 linhas)

---

## [2026-06-27] — Controle de Carga 100% funcional

### O que mudou
- **Toolbar completa funcional**: Segmento dropdown (8 opções), Atualizar Lista, todos os checkboxes reativos
- **Mostrar Pedidos Finalizados**: checkbox filtra grade em tempo real
- **Mostrar grade de produtos**: checkbox funcional
- **Rota Pendente**: checkbox com ícone verde ✔
- **Somente Escolas**: filtra apenas pedidos com "ESCOLA" no nome
- **Permitir Desconto no Frete**: checkbox funcional
- **Rotear**: botão habilitado só com seleção, mostra alerta
- **Imprimir Selecionados**: abre nova janela com tabela formatada dos pedidos selecionados
- **Calendário**: campos `type="date"` para Carga e Entrega com seletor nativo
- **Legenda de cores**: Impresso / Impressão Pendente / Pedido Alterado / AurCarga Ok
- **Painel Entregas funcional**: mostra os pedidos SELECIONADOS (não mais vazio)
  - Data Entrega, Rota, Nome Fantasia, Id Mltvenda, Id Venda, Volumes, Peso, Empresa, Tipo Faturamento, Vlr Tot Pedido, Autorização de Carga
- **KPIs atualizados em tempo real**: Qtd Rotas=16, Peso Carga calculado dos selecionados, Qtd Entregas=selecionados, SLA%
- **Botões do rodapé todos funcionais**:
  - Remover Linha: remove pedidos selecionados da grade
  - Imprimir Bilhete: imprime selecionados
  - Nova Entrega: alerta de integração
  - Incluir na Autorização: muda status para AURCARGA_OK (verde)
  - Limpar a Grade: restaura dados originais
- **Contadores no rodapé**: Entregas, Peso, Valor Total, badge "X selecionados"
- **Busca de motoristas**: campo de pesquisa no painel de rotas
- **16 rotas** com motoristas reais (ANDRE LUIZ, MILTON SANTOS, SIDNEY, etc.)
- **Seleção múltipla**: checkbox no header seleciona/deseleciona todos

### Arquivos modificados
- `frontend/src/modules/logistica/pages/ControleCarga.tsx` — reescrito completo (~500 linhas)

---

## [2026-06-27] — Análise Estoque Físico 100% funcional

### O que mudou
- **Calendário**: campos `type="date"` com seletor nativo do browser
- **Família**: dropdown filtra ao trocar (BCA/Fruta/Citricos/Legumes/Verdura)
- **Grupo**: muda dinamicamente conforme família (Batatas/Cebolas/Tropical/etc.)
- **Tipo Item**: 8 opções (00-Mercadoria para Revenda até 10-Outros Insumos)
- **Unidade de Apuração**: radio buttons Estoque/Principal funcionais
- **Conferência Física**: checkbox liga/desliga colunas editáveis de contagem
- **Contagem Física**: campo numérico editável calcula diferença em tempo real (verde/vermelho)
- **Executar**: animação de processamento produto a produto, depois exibe grade
- **Imprimir**: abre nova janela com relatório formatado (cabeçalho Hetros, tabela, `window.print()`)
- **Exportar**: gera CSV com BOM UTF-8 e separador ponto-e-vírgula (abre correto no Excel BR)
- **Exportar detalhe**: exporta movimentações do drill-down também em CSV
- **Busca rápida**: campo de filtro por código/descrição após executar
- **Não Mostrar Ordens de Compra**: checkbox oculta coluna Ordens de Compra
- 27 produtos mock (BCA + Fruta + Citricos + Legumes + Verdura)
- Estado vazio com instrução "Clique em Executar" antes de rodar

### Arquivos modificados
- `frontend/src/modules/estoque/pages/AnaliseEstoqueFisico.tsx` — reescrito completo

---

## [2026-06-27] — Análise de Estoque Físico (Contagem)

### O que mudou
- Tela **Análise de Estoque Físico** replicando o NewOxxy exato
- Filtros: Período, Tipo Item, Família (BCA/Frutas/Citricos/etc.), Grupo, CD, Unidade de Apuração
- Grade com colunas: Código, Descrição, Família, Saldo Inicial, Entradas, Ordens de Compra, Saídas, Saldo Final, Und, Contagem Física, Diferença, Preço Custo, Valor Atual
- Cores: azul nos códigos/links, vermelho nos valores negativos, seleção azul escuro
- **Drill-down** (duplo clique): modal "Detalhamento do Registro" com todas as movimentações do produto (clientes, NFe, quantidades, preço médio)
- Modal "Processando... Aguarde..." com indicador de carregamento
- Campo de Contagem Física editável quando checkbox ativado
- 22 produtos mock (BCA + Frutas) com dados reais do NewOxxy (BATATA ASTERIX, CEBOLA, MANGA PALMER, etc.)
- 14 movimentações detalhadas para BATATA ASTERIX (drill-down)
- Totais no rodapé: Registros encontrados, Saldo Final, Diferença, Valor Total
- Rota `/wms/analise-estoque` no menu lateral com destaque

### Arquivos criados/modificados
- `frontend/src/modules/estoque/pages/AnaliseEstoqueFisico.tsx` — tela completa
- `frontend/src/App.tsx` — rota adicionada
- `frontend/src/components/layout/AppShell.tsx` — menu atualizado

---

## [2026-06-27] — Clientes importados + CRUD funcional + Carga corrigida

### O que mudou
- CRUD completo de Clientes (create, findAll com busca, findOne, update, delete)
- Importados **299 clientes** do arquivo CLIENTES.xlsx para o banco (total: 399 no banco)
- CargaService corrigido — erros TypeScript resolvidos (campos do Prisma)
- Backend e frontend rodando: `localhost:3002` (API) + `localhost:3000` (UI)
- Tela Controle de Carga acessível em `/logistica/carga`

### Arquivos modificados
- `backend/src/modules/clientes/clientes.service.ts` — CRUD real com Prisma
- `backend/src/modules/clientes/clientes.controller.ts` — endpoints POST/GET/PUT/DELETE
- `backend/src/modules/carga/carga.service.ts` — fix TypeScript (romaneios as any)

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
