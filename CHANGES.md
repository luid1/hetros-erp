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

## [2026-07-06] — Módulo Financeiro (DRE), App de Compras e ordem livre de entregas

### O que mudou
- **Módulo Financeiro e Controladoria (`FinancialHub`, `/financeiro/dre`)**: hub com 4 abas —
  (1) **Dashboard DRE & Caixa** com KPIs oversized (Receita Bruta → Impostos → Receita Líquida →
  CMV → Despesas Operacionais → Lucro Líquido) e painéis de Contas a Receber/Pagar; (2)
  **Rentabilidade por Cliente** (grid denso com sticky header/coluna, colunas de valor líquido,
  CMV, frete, custos operacionais, resultado e margem % com cor semântica, linha totalizadora);
  (3) **Rentabilidade por Produto** (produtos agrícolas, preço/custo médio, lucro bruto, margem %,
  totalizador); (4) **Gestão de Títulos** (receitas + despesas, tags PAGO/PENDENTE/ATRASADO,
  ações Baixar Título / Ver Detalhes em drawer). Paleta off-white, cores semânticas emerald/rose.
- **App de Compras e Abastecimento (`AppComprador`, `/compras/app`)**: simulação de smartphone com
  3 abas — Dashboard & CIs (orçamento R$45.000, aprovação por swipe/botão com dedução em tempo real),
  Estoque & Nova CI (busca + FAB com formulário), Recebimento com **geofencing** (200m do CD).
- **App do Motorista — ordem livre de entregas**: motorista pode escolher qualquer cliente para
  entregar em qualquer ordem, pular uma parada e voltar depois; seletor de cliente no wizard de
  finalização e cartões clicáveis na Programação do Dia.

### Arquivos modificados
- `frontend/src/modules/financeiro/pages/FinancialHub.tsx` (novo)
- `frontend/src/modules/compras/pages/AppComprador.tsx` (novo)
- `frontend/src/modules/logistica/pages/AppMotorista.tsx`
- `frontend/src/App.tsx`, `frontend/src/components/layout/AppShell.tsx`, `frontend/src/config/telas.ts`

---

## [2026-07-05] — Logística Avançada: Rotas + Torre de Controle + App do Motorista + Ponte Fiscal SEFAZ

### O que mudou
- **Modelagem `Route` / `RouteStop`** (Prisma): rota com veículo/motorista/região, capacidade e
  cubagem (snapshot da otimização); paradas com **campos de auditoria de entrega** (latitude,
  longitude, dataHoraEntrega, linkFoto, stringAssinatura, recebedor) e retorno SEFAZ. Desacoplados
  via FKs escalares para não impactar os 6 modelos existentes. Enums `RouteStatus`/`RouteStopStatus`.
- **`RouteOptimizerService` (🤖 IA de roteirização)**: agrupa pedidos abertos por macro-zona de CEP,
  ordena por peso (First-Fit Decreasing), distribui em veículos respeitando capacidade (kg + caixas)
  e janela, sequencia paradas por proximidade e persiste tudo em **transação ACID** + `AuditLog`.
- **`DeliveryConfirmationService` (Ponte Fiscal SEFAZ)**: grava a prova de entrega (assinatura + GPS
  + foto) em transação; fecha a rota quando todas as paradas concluem; dispara o **Evento 110130
  (Comprovante de Entrega da NF-e)** para a **FocusNFe (homologação)** via REST (HTTP Basic com token),
  gravando protocolo/status de volta. Resiliente: falha fiscal não reverte a entrega.
- **Endpoints** `/rotas` (listar/detalhe/motorista), `/rotas/otimizar` (RBAC `LOGISTICA:OPERAR`),
  `/rotas/stops/:id/confirmar`. Módulo `RotasModule` registrado no `app.module.ts`.
- **Frontend — Torre de Controle** (`/logistica/torre`): paleta neutra (off-white/greige) + números
  oversized, lista de pedidos arrastáveis (drag-and-drop nativo), cards de motorista com barra de
  ocupação de peso e botão **🤖 Otimizar Rotas com IA**.
- **Frontend — App do Motorista** (`/logistica/motorista`, pronto p/ Capacitor): 3 telas — Timeline
  das paradas, foco na entrega com botão gigante Waze/Maps, e **Canhoto Digital** (HTML5 Canvas de
  assinatura + foto da mercadoria + captura de GPS real do navegador).
- **Config .env**: `FOCUS_NFE_URL` (default homologação) e `FOCUS_NFE_TOKEN`. Sem token, o evento
  110130 é apenas simulado (log), sem quebrar a confirmação de entrega.

### Arquivos modificados
- `backend/prisma/schema.prisma` (models `Route`/`RouteStop` + enums)
- `backend/src/modules/rotas/{route-optimizer,delivery-confirmation,rotas}.service.ts`
- `backend/src/modules/rotas/{rotas.controller,rotas.module}.ts`
- `backend/src/app.module.ts`
- `frontend/src/services/api.ts` (`rotasApi`)
- `frontend/src/modules/logistica/pages/{TorreControle,AppMotorista}.tsx`
- `frontend/src/App.tsx`, `frontend/src/components/layout/AppShell.tsx`, `frontend/src/config/telas.ts`

### Como aplicar
1. Pare o backend (libera a DLL do Prisma). 2. `npx prisma generate` + `npx prisma db push`.
3. (Opcional fiscal) adicione `FOCUS_NFE_TOKEN` no `backend/.env`. 4. Suba backend + frontend.

---

## [2026-07-05] — Módulo Financeiro + Fluxo de Caixa + Camada Fiscal (Invoice) + Seed de teste

### O que mudou
- **Módulo Financeiro completo**: Contas a Receber e Contas a Pagar (baixa transacional
  PAGO/PARCIAL, cancelamento, parcelamento sem drift de centavos), listeners idempotentes
  (`nfe.emitida` → ContaReceber; `estoque.entrada_compra` → ContaPagar) e trilha imutável
  `HistoricoFinanceiro` (usuário + timestamp + estados anterior/novo + valores).
- **Fluxo de Caixa consolidado** (`/fluxo-caixa`): entradas pagas − saídas pagas por competência
  (dia/mês) com saldo acumulado corrente + KPIs.
- **Camada Fiscal — Rodada 3** (`Invoice` / `InvoiceTax` / `InvoiceAuditLog`): geração de nota a
  partir do **pedido de venda real** (herda `valorTotal` e cliente do pedido, bloqueia duplicidade
  e pedido cancelado), impostos calculados **em centavos** (alíquota em pontos-base), transições
  DRAFT → ISSUED / ERRONEOUS / CANCELED com **audit log imutável**. Multi-tenant.
- **RBAC**: baixas financeiras exigem `FINANCEIRO:OPERAR`; operações fiscais exigem `FISCAL:OPERAR`.
- **Frontend**: telas `Fluxo de Caixa`, `Contas a Receber`, `Contas a Pagar` e `Gestão Fiscal`
  (KPIs com skeleton, filtros, modal de emissão com composição de impostos ao vivo, ações gated).
- **Seed de teste** (`prisma/seed-teste.ts`, script `npm run prisma:seed:teste`): popula 5 clientes,
  3 fornecedores, 3 transportadoras, 6 veículos (frotas), 6 pedidos de venda com itens, NF-es e
  notas fiscais (Invoices) — idempotente.

### Arquivos
- `backend/prisma/schema.prisma` (Invoice/InvoiceTax/InvoiceAuditLog + HistoricoFinanceiro)
- `backend/prisma/seed-teste.ts`, `backend/package.json`
- `backend/src/modules/{contas-receber,contas-pagar,fluxo-caixa,invoices}/*`
- `backend/src/common/{utils/money.util.ts,guards/permissoes.guard.ts,decorators/permissoes.decorator.ts}`
- `backend/src/app.module.ts`
- `frontend/src/modules/financeiro/pages/{FluxoCaixa,ContasReceber,ContasPagar}.tsx`
- `frontend/src/modules/fiscal/pages/GestaoFiscal.tsx`
- `frontend/src/{services/api.ts,App.tsx,config/telas.ts,components/layout/AppShell.tsx}`

### Verificado
- Backend `tsc --noEmit` exit 0; frontend `tsc --noEmit` exit 0.
- Pendente rodar na máquina (com o dev server parado): `npx prisma db push` e
  `npm run prisma:seed && npm run prisma:seed:teste`.

---

## [2026-07-03] — Aba Rentabilidade (cliente → produto) real e funcional

### O que mudou
- Nova aba **"Rentabilidade por cliente"** em Custos & Margem (agora é a aba padrão): grade por
  **cliente** (Nome Fantasia · Vlr Líquido Vendido · Result. Líquido · Total Custos/Desp. · % ·
  Peso Total), **expansível** — clicando abre a sub-grade dos **produtos** que o cliente comprou
  (Código · Produto · Qtd · Vlr Venda · Vlr CMV · Lucro Bruto · % Lucro), com **rodapé de totais**.
  Cores por margem (verde/âmbar/vermelho) e destaque azul/verde nos valores-chave — estilo do
  relatório NewOxxy.
- Novo endpoint `GET /custos/:filial/rentabilidade?dataIni&dataFim` — agrupa os itens de NF-e
  emitida por cliente e por produto, usando o **custo composto** (compra+frete+chapa) como CMV.

### Arquivos
- `backend/src/modules/custos/{custos.service.ts (getRentabilidade), custos.controller.ts}`
- `frontend/src/modules/financeiro/pages/Custos.tsx`

### Verificado no preview
- Grade de clientes renderiza, expande pra sub-grade de produtos com todas as colunas, e mostra
  o TOTAL GERAL. (Margem sai negativa nos dados de teste por custo composto alto; no real fica ok.)

---

## [2026-07-03] — Publicação no GitHub + referência da tela de Rentabilidade (cliente→produto)

### O que mudou
- **Código publicado no GitHub**: `https://github.com/luid1/hetros-erp` (branch `main`) — para
  outras pessoas verem. `.env` (senhas) e `node_modules` **não** foram enviados.
- **Sistema disponível pra demonstração externa** via túnel (build de produção): URL loca.lt +
  senha do túnel (o IP público da máquina). Só no ar enquanto o PC/backend/túnel estiverem ligados.
- **Direção do próximo passo dos Custos**: transformar a aba de custos numa **grade de
  Rentabilidade** estilo NewOxxy — linha por **cliente** (Nome Fantasia, Vlr Líquido Vendido,
  Resultado Líquido, Total Custos e Despesas, Peso Total) **expansível** para a sub-grade de
  **produtos** (Código, Produto, Referência, Tipo, Qtd, Vlr Total Venda, Vlr Total CMV, Lucro
  Bruto, % Lucro), com filtros por coluna, rodapé de totais e ações (Imprimir/Excel/E-mail).
  Mockup de referência gerado.

### Como está no ar (túneis de teste)
- Web (demonstração): build de produção servido em `vite preview` (3005) + túnel loca.lt.
- Backend (app mobile): túnel loca.lt → `localhost:3002` (configurado no app.json do compradores-app).

---

## [2026-07-02] — Roteirização por VEÍCULO real + não duplica pedidos já roteirizados

### O que mudou
- **Fim da lista de motoristas fictícia** no modal Nova Entrega: os 16 "motoristas" mock (com
  números de rota fake #3519, #3515…) saíram. Agora você **escolhe um veículo real da frota**
  (Frotas & Veículos), que já traz **motorista padrão + capacidade** num passo só. Escolher o
  veículo = atribuir a rota.
- **Pedidos já roteirizados somem da lista**: o modal exclui os pedidos que já estão em alguma
  rota do dia (Entregas Programadas) → **não dá mais pra roteirizar 2× nem duplicar rota**.
- O romaneio criado grava placa/modelo/tipo/motorista do **veículo real** + o frete digitado.
- Removido o código morto do mock (`MOCK_ROTAS`, `RotaMotorista`, `frota`).
- Seed inicial: 6 veículos da frota criados a partir dos motoristas reais (ANDRE, ELTON, GENIVAL,
  MILTON, HENRIQUE, WILLIAN) — placas `FROTA0x` provisórias para ajustar em Frotas & Veículos.

### Arquivos
- `frontend/src/modules/logistica/pages/ControleCarga.tsx`

### Verificado no preview
- Lista mostra veículos reais (sem números fake); barra de capacidade responde ao veículo; coluna
  Peso e campo Frete presentes; pedidos já em rota aparecem como **0 disponíveis** (não duplica).

---

## [2026-07-02] — Controle de Carga: rodapé de KPIs limpo + peso/frete na roteirização

### O que mudou
- **Rodapé de KPIs redesenhado** (estava feio): o bloco cinza com ícone gigante virou 4 mini-cards
  de vidro (Qtd Rotas · Peso Carga · Qtd Entregas · SLA) com número oversized, alinhado ao tema.
- **Modal "Nova Entrega — Roteirizar"**:
  - **Coluna "Peso (kg)"** por pedido na tabela + a barra de capacidade já soma o peso dos
    selecionados × capacidade do veículo escolhido (vê se cabe no caminhão).
  - **Campo "Frete da rota (R$)"** editável no resumo, com **% sobre a nota** calculada na hora.
    Ao roteirizar, o frete é gravado no romaneio (`valorFrete`) e **já aparece no Frete por
    Motorista** (que calcula o % frete/NF por rota).
- Backend `criarRomaneio` passou a aceitar e gravar `valorFrete`.

### Arquivos
- `backend/src/modules/carga/carga.service.ts` (valorFrete no romaneio)
- `frontend/src/modules/logistica/pages/ControleCarga.tsx`

### Observação (sobre o fluxo)
- A lista de motoristas do modal ainda é **mock** (16 rotas fixas), separada do seletor de veículo
  real. O ideal é unificar: escolher **um veículo real** (que já traz motorista padrão + capacidade)
  num passo só. Fica como próximo ajuste do fluxo, se você quiser.

---

## [2026-07-02] — Análise de Estoque: sai a coluna Perdas, fica só Quebra

### O que mudou
- Na **Análise de Estoque Físico**, removida a coluna **Perdas** — agora existe **uma coluna
  única "Quebra"** (editável). Fórmula: `Saldo Final = Saldo Inicial + Entrada + Chão − Quebra`.
- O que já foi baixado no sistema como `PERDA` **entra somado na Quebra** (não some da conta).
- Botão renomeado para **"Faturar Quebra"**: o valor digitado além do já baixado gera a
  movimentação **AVARIA** (baixa real). Valor perdido no rodapé considera só a Quebra.
- Verificado no preview: headers sem "Perdas", botão "Faturar Quebra".

### Arquivos
- `frontend/src/modules/estoque/pages/AnaliseEstoqueFisico.tsx`

---

## [2026-07-02] — Redesign visual "Dark Tech / Glass" — sistema inteiro repaginado

### O que mudou
- **Nova identidade visual** (glassmorphism cirúrgico + minimalismo): canvas espacial `#0B0F17`
  (quase preto, não preto puro) com **glow ambiente** sutil (radiais sky/indigo desfocados).
- **Sidebar e Topbar viram placas de vidro**: `bg-white/[0.02] backdrop-blur-xl` + **borda de
  cristal 1px** (`border-white/[0.05]`). Item ativo com **indicador cirúrgico** (traço de 2px
  sky) em vez de caixa pesada; tooltips do menu recolhido em vidro.
- **Cards e tabelas flutuantes**: `.card` e `TableCard` do kit ganharam vidro (blur 20–24px),
  sombra espalhada `0 8px 32px rgba(0,0,0,0.37)` e **hover que sobe 2px** com brilho interno.
- **Modais cinematográficos**: overlay `bg-black/50 backdrop-blur-md` (fundo desfoca de verdade)
  e painel entrando com **fade-in-up** (0.32s cubic-bezier). Vale pro kit (`Modal`) e pros
  confirm/prompt/toast do `feedback.tsx`.
- **Microinterações táteis globais**: todo botão tem `transition 200-300ms` e **`active:scale(0.98)`**
  (clique físico); botões primários sobem 1px no hover.
- **Tipografia**: fonte **Inter** (Google Fonts), números dos KPIs **oversized**
  (`text-3xl font-extrabold tracking-tight tabular-nums`), rótulos pequenos em uppercase
  espaçado; **ícones vazados soltos** (sem caixas coloridas atrás).
- **Remap global atualizado** (`index.css`): telas legadas migram sozinhas pra paleta nova
  (superfícies `#0E141F/#131B29`, bordas rgba brancas translúcidas). Scrollbar de 5px translúcida.
- **Verificado no preview** (porta 3010): login, dashboard, Romaneios (tabela vidro), modal de
  Frotas (pop-up com blur) e Análise Estoque Físico (legada) — tudo ok, console limpo.

### Arquivos
- `frontend/src/index.css` (design system), `frontend/index.html` (fonte Inter)
- `frontend/src/components/layout/AppShell.tsx` (sidebar/topbar vidro + glow)
- `frontend/src/modules/cadastros/ui.tsx` (kit: TopBar, FilterBar, Chips, TableCard, Modal, inputs)
- `frontend/src/components/ui/feedback.tsx` (toasts/dialogs cinematográficos)
- `frontend/src/pages/DashboardPage.tsx` (KPIs oversized, ícones limpos)

### Observação
- A DANFE e impressos térmicos **não são afetados** (abrem em janela própria, fundo branco).
- O acento continua **sky/azul elétrico** usado cirurgicamente (ação principal, foco, item ativo).

---

## [2026-07-02] — Faturamento: SEM estoque físico agora BLOQUEIA (era só aviso)

### O que mudou
- A checagem "Estoque de <produto>" na validação de faturamento passou de **AVISO** para
  **BLOQUEIO**: se o **estoque físico não cobrir a quantidade do item, não fatura** (a NF-e não é
  emitida). Reverte a permissão anterior de faturar com saldo negativo ("a comprar").
- Já reflete em toda a cadeia: o modal **Conferir** mostra o item em vermelho (bloqueio) e o
  `POST /nfe/:id/emitir` barra a emissão citando os produtos sem estoque.

### Arquivos
- `backend/src/modules/fiscal/fiscal.service.ts`

### Observação
- Consequência prática: pedidos com produto faltando **precisam de entrada/ajuste de estoque
  antes de faturar**. A aprovação do pedido continua permitindo saldo negativo (regra "a comprar"),
  mas o **faturamento** agora exige o físico.

---

## [2026-07-03] — App dos Compradores (Expo/RN) recriado + túnel: cotações e Nova OC

### O que mudou
- **App `compradores-app` recriado do zero** (Expo SDK 57, mesmo pacote `com.hetros.compradores`
  e projectId EAS) — o APK anterior estava em branco. Empacota sem erro (841 módulos).
- Telas: **Login** (auth do ERP), **Cotações** (lê `GET /custos/:filial/cotacoes`, só preço, com
  **cache offline** AsyncStorage), **Nova OC** (puxa fornecedores + 316 produtos do banco, escolhe
  **unidade KG/UN/CX/BJ/PC/BD/MC/SC/DZ**, qtd e preço → `POST /compras`), **Minhas OCs** (lista +
  botão **Aprovar** pra quem tem o módulo Compras — ex.: Leide/líder).
- **Mesma base**: o app consome a mesma API/PostgreSQL do Web (sem Supabase). Fornecedores e
  produtos aparecem automáticos porque vêm de `GET /fornecedores` e `GET /produtos`.
- **Ordem de Compra** no backend já tinha **aprovação** (`PATCH /compras/:id/status` → APROVADA) e
  **unidade** no item — nada a mudar ali.
- **Túnel de teste** (localtunnel) expõe o backend numa URL pública pra o celular alcançar
  (localhost não funciona no celular). Configurado em `app.json > extra.apiUrl`.

### Arquivos
- `compradores-app/*` (novo projeto Expo): App.js, src/{config,api,auth}.js, src/screens/*, README

### Como usar
- Testar já: `cd compradores-app && npx expo start` → Expo Go no celular (QR).
- APK: `eas build -p android --profile preview`.
- ⚠️ Túnel só vale com o PC + backend + túnel ligados; p/ definitivo, publicar o backend.

---

## [2026-07-03] — Cotações persistidas no banco (base única Web ↔ app dos compradores)

### O que mudou
- Nova tabela **`Cotacao` (historico_cotacoes)**: guarda o preço do dia por produto definido no Web.
- Endpoints no módulo custos:
  - `POST /custos/:filial/cotacao` — salva as cotações (chamado ao exportar no WhatsApp).
  - `GET /custos/:filial/cotacoes?data=` — lista as cotações do dia **só com o preço final** (sem
    custo nem margem) — é o que o **app dos compradores** vai consumir na pedra da CEAGESP.
- O Web (gaveta de cotação) agora **persiste as cotações** ao clicar em "Copiar para WhatsApp",
  além de copiar o texto. Assim o preço fica na **mesma base** (PostgreSQL) que o app lê.

### Arquivos
- `backend/prisma/schema.prisma` (model Cotacao), `backend/src/modules/custos/*`
- `frontend/src/modules/financeiro/pages/Custos.tsx`

### Verificado
- POST salvou 2 cotações; GET retornou só o preço (custo interno **não** exposto). ✔️

### Observação (app mobile)
- O `compradores-app` é **Expo/React Native** (não Flutter) e **não tem fonte no repositório** —
  o APK baixado está em branco (sem backend). Para o app mostrar as cotações: (1) criar/recuperar
  o fonte + tela que consome `GET /custos/:filial/cotacoes`, (2) **expor o backend numa URL
  pública** (o celular não alcança `localhost`), (3) `eas build` do novo APK.

---

## [2026-07-03] — Custos: cotação em LOTE (multi-seleção) + Motivo da Execução + export WhatsApp

### O que mudou
- **Seleção múltipla** na tabela de composição: checkbox por linha + "selecionar todos" no
  cabeçalho; ao marcar itens aparece **"Cotar Selecionados (X)"** que abre a gaveta em **modo lote**.
- **Gaveta adaptável**: 1 produto → painel individual detalhado; N produtos → **lista rolável
  compacta**, cada item com preço, **margem % e lucro R$ em tempo real** (vermelho se negativo) e
  mini-switch de "cobrir preço" individual. Estado por produto num único objeto keyado (performático).
- **Motivo da Execução (obrigatório)**: ao cobrir preço abaixo do custo composto, badge
  "Atenção: venda abaixo do custo composto!" + **select obrigatório** (Garantir Cliente / Desovar
  Estoque / Combater Concorrência). O export é bloqueado se faltar o motivo num item em prejuízo.
- **Exportar para WhatsApp**: gera **uma única mensagem** formatada (data + emoji + nome +
  preço final), copiada pro clipboard. **Nunca expõe custo nem margem** — só o preço ao cliente.
  Formato verificado: `*HETROS WMS - Cotação do Dia (dd/mm/aaaa)* … 🍍 *PRODUTO* -> R$ XX,XX`.

### Arquivos
- `frontend/src/modules/financeiro/pages/Custos.tsx`

### Verificado no preview
- Multi-seleção (316 checkboxes), botão "Cotar Selecionados (3)", gaveta em lote com margens ao
  vivo por item, e formato do WhatsApp conferido (sem custo/margem).

---

## [2026-07-02] — Custos: custo base composto (auto) + gaveta de cotação e "cobrir preço"

### O que mudou
- **Fim da digitação manual de custo**: o custo agora é **herdado/calculado automaticamente**:
  **Custo Base Composto = Aquisição (custo médio das entradas) + Frete rateado (romaneios) +
  Chapa/descarga**. Novo endpoint `GET /custos/:filial/composicao` (todos os produtos).
  - Frete rateado: Σ frete dos romaneios ÷ peso entregue, com guarda (só ≥200 kg) e **teto FLV
    R$ 0,40/kg** (dados incompletos de peso não inflam mais o rateio).
- **Aba "Custos por produto (cotação)"**: lista todos os produtos com as colunas **Aquisição ·
  Frete · Chapa · Custo composto · Preço venda · Margem** — clicar abre a gaveta.
- **Gaveta lateral (Drawer) de cotação**:
  - Cabeçalho com **Custo Base Composto** + breakdown (aquisição/frete/chapa).
  - **Bloco 1 · Cotação rápida**: digita o preço sugerido → **Margem, Markup e Lucro/un em tempo
    real** (antes de fechar o pedido na pedra).
  - **Bloco 2 · Cobrir preço**: switch → "Preço alvo do cliente" → margem instantânea; se ficar
    **abaixo do custo**, badge crítico **"VENDA COM PREJUÍZO −X%"** exigindo liberação do gerente.
- **Tabela de Lucratividade** agora usa **Custo Composto Médio** (compra+frete+chapa) na coluna de
  custo e no lucro/margem, e as linhas abrem a mesma gaveta de cotação.

### Arquivos
- `backend/src/modules/custos/{custos.service.ts, custos.controller.ts}`
- `frontend/src/modules/financeiro/pages/Custos.tsx`

### Verificado no preview
- 316 produtos com composição; gaveta abre; cotação calcula margem/markup ao vivo; "cobrir preço"
  com alvo abaixo do custo dispara **"VENDA COM PREJUÍZO −24,5%"** + flag de gerente.

---

## [2026-07-02] — Custos: aba "Custos por produto" (edita TODOS os produtos) + item no menu

### O que mudou
- **Custos & Margem** ganhou **abas**: **Margem & Lucratividade** (análise das vendas) e
  **Custos por produto (editar)** — que lista **TODOS os produtos ativos** (não só os que
  venderam) com o **custo editável** (salva ao sair do campo, com ✓ de confirmação) + margem
  estimada (preço de venda × custo).
- Corrigido o backend: `PUT /produtos/:id` **não salvava `precoCusto`** — agora salva.
- Corrigido: o item **Custos & Margem** não aparecia no menu lateral (a lista do AppShell é fixa) —
  adicionado em **E · Financeiro**.

### Arquivos
- `backend/src/modules/produtos/produtos.service.ts` (update salva precoCusto)
- `frontend/src/modules/financeiro/pages/Custos.tsx` (abas + edição), `frontend/src/components/layout/AppShell.tsx`

---

## [2026-07-02] — Custos & Margem: área do Financeiro separada da Análise Estoque Físico

### O que mudou
- Nova tela **E • Financeiro → Custos & Margem** (`/financeiro/custos`), **separada** da Análise
  de Estoque Físico: a contagem física é do pessoal de estoque; **custo/margem é do Financeiro**
  (perfil diferente, o menu já respeita quem vê o quê).
- **KPIs**: **CMV** (custo das vendas), **Receita**, **Perdas monetizadas** e **Margem média %**.
- **Tabela de lucratividade por produto**: Produto · Qtd vendida · Preço médio de venda · Custo
  médio atual · Lucro bruto R$ · **Margem %** (verde ≥25 / âmbar 10–25 / **vermelho <10 ou
  negativa**). O custo vem das saídas de venda (custo do momento), então já reflete perdas absorvidas.
- Novo módulo backend **`custos`**: `GET /custos/:filialId/margem?dataIni&dataFim`.

### Arquivos
- `backend/src/modules/custos/*` (novo), `backend/src/app.module.ts`
- `frontend/src/modules/financeiro/pages/Custos.tsx` (novo), `frontend/src/App.tsx`, `frontend/src/config/telas.ts`

### Observação
- A **Análise Estoque Físico** segue como está (para o pessoal de estoque). O custo virou tela
  própria do Financeiro. Se quiser, dá pra tirar as colunas de custo da Análise para deixá-la 100%
  operacional.

---

## [2026-07-02] — Romaneios: tela real (era placeholder) — lista, detalhe e checklist de impressão

### O que mudou
- A aba **Logística → Romaneios** virou tela real (dark). **Lista** as viagens (filtro por período e
  status) com nº, veículo/placa, motorista, período, **entregas X/Y**, peso (com % de ocupação),
  valor e **status** (Em montagem / Em trânsito / Parcial / Concluído).
- **Detalhe** da viagem: pedidos consolidados **ordenados por sequência de entrega**, com endereço,
  volumes, peso e valor; **checkbox de entregue** por parada (ao marcar todas, conclui o romaneio).
- Ações: **Iniciar trânsito** (ABERTO→EM_ROTA), **Concluir** (→ENTREGUE) e **Imprimir** um
  **checklist A4** para o motorista (sequência, cliente, endereço, volumes, peso, [ ] entregue,
  assinatura, km inicial/final).
- Backend `romaneios` (era stub) implementado: `GET /romaneios` (com filtros), `GET /romaneios/:id`,
  `PATCH /romaneios/:id/status`, `PATCH /romaneios/item/:itemId/entrega`.

### Arquivos
- `backend/src/modules/romaneios/{romaneios.service.ts, romaneios.controller.ts}`
- `frontend/src/modules/logistica/pages/Romaneios.tsx` (novo), `frontend/src/App.tsx`

---

## [2026-07-02] — Controle de Carga: barra de capacidade do veículo em tempo real

### O que mudou
- No modal **Nova Entrega — Roteirizar**, novo seletor de **veículo** (da frota real) + **duas
  barras de capacidade** que atualizam ao selecionar pedidos: **Peso** (soma `pesoTotal` ÷
  `capacidadeKg`) e **Caixas** (soma `volumes` ÷ `capacidadeCaixasH`).
- Cores por nível: **verde < 90%**, **âmbar 90–100%**, **vermelho > 100%**, com selo
  "🚚 X% ocupado". Se passar de 100%, o **Roteirizar pede confirmação** (trava/alerta) informando
  se estourou no peso ou nas caixas.

### Arquivos
- `frontend/src/modules/logistica/pages/ControleCarga.tsx`

---

## [2026-07-02] — Frotas & Veículos: tela CRUD real (era placeholder) + campos FLV

### O que mudou
- A aba **Logística → Frotas & Veículos** deixou de ser placeholder e virou **CRUD real** (dark):
  placa, modelo, tipo, **motorista padrão**, **propriedade (Próprio/Terceiro)**, **capacidade em kg**,
  **capacidade em caixas H** (padrão FLV), refrigerado ❄️, ano. Busca por placa/modelo/motorista;
  inativar em vez de apagar (preserva romaneios históricos).
- `Veiculo` ganhou os campos: `propriedade`, `capacidadeCaixasH`, `motoristaPadrao`, `refrigerado`
  e `transportadoraId` passou a ser opcional (veículo próprio não exige transportadora).
- Novo módulo backend **`veiculos`** (CRUD) em `/veiculos`.

### Arquivos
- `backend/prisma/schema.prisma` (Veiculo), `backend/src/modules/veiculos/*` (novo), `backend/src/app.module.ts`
- `frontend/src/modules/logistica/pages/FrotasVeiculos.tsx` (novo), `frontend/src/App.tsx`

### Observação
- Aplicado com `prisma db push` no banco `erp_wms`. Base para a **barra de capacidade** no Controle
  de Carga (usa `capacidadeKg`/`capacidadeCaixasH`) e para o fechamento de frete.

---

## [2026-07-02] — CC-e: mensagem clara da regra 15–1000 caR (não era bug, era validação)

### O que mudou
- A **Carta de Correção (CC-e)** parecia "não funcionar": na verdade o backend valida a regra da
  SEFAZ (**mín. 15, máx. 1000 caracteres**) e recusava correções curtas, só mostrando um toast
  rápido. Agora o prompt **explica a regra + dá exemplo**, e o front **valida antes de enviar**
  dizendo quantos caracteres faltam. Toasts de erro/sucesso com tom correto.
- Verificado que a rota, a tabela `CartaCorrecao` e a gravação funcionam ponta a ponta (o CC-e
  aparece no detalhe da nota após registrar).

### Arquivos
- `frontend/src/modules/fiscal/pages/NotasEmitidas.tsx`

---

## [2026-07-02] — Painel de Faturamento redesenhado (minimalista, dark, perdas discretas)

### O que mudou
- **Reestruturação visual** do Painel de Faturamento (`/fiscal/painel`) pra ficar limpo e gerencial:
  - **Perdas & Quebras** deixou de ser um bloco vermelho agressivo no centro. Agora é **azul-escuro
    padrão** (slate), com o **vermelho só nos números**. A linha foi dividida **50/50**: à esquerda
    **Maiores clientes faturados** (mini barras) e à direita **Perdas por produto** (resumo compacto
    perda × quebra + top produtos).
  - **Gráfico de faturamento** com **barras finas em pill, centralizadas** (não estica mais com
    poucos dias) e verde **menta pastel** (`emerald-300/70`). Novo **insight "% de Perda sobre o
    Faturamento"** no canto do gráfico.
  - **KPIs** com número **extrabold marcante**, rótulo de apoio menor/uppercase, ícone em chip suave.
  - Paddings maiores (p-6 / gap-4-6) e paleta slate coerente pra tela respirar.

### Arquivos
- `frontend/src/modules/fiscal/pages/PainelFaturamento.tsx`

---

## [2026-07-02] — Painel Operacional (dashboard): KPI de Perdas/Quebras Hoje (R$)

### O que mudou
- No **Painel Operacional** (dashboard inicial), novo KPI **"Perdas/Quebras Hoje"** com o **valor
  perdido do dia em R$** (fica cinza se zero, vermelho se houver perda) + subtítulo com a
  quantidade baixada. Bate o olho sem precisar entrar no fiscal.
- Backend `dashboard` agrega as movimentações `PERDA`/`AVARIA` do dia (valor = qtd × custo).

### Arquivos
- `backend/src/modules/dashboard/dashboard.service.ts` (perdaHojeValor/perdaHojeQtd)
- `frontend/src/pages/DashboardPage.tsx`

---

## [2026-07-02] — Painel de Faturamento mostra Perdas & Quebras (R$) do período

### O que mudou
- No **Painel de Faturamento** (`/fiscal/painel`), abaixo dos KPIs, novo bloco **"Perdas &
  Quebras no período"** (vermelho) com **total perdido em R$**, split **Perdas × Quebras (avaria)**
  e um **top de produtos** que mais geraram prejuízo. Deixa claro que é **baixa de estoque, não
  faturamento** (some quando não há perda no período).
- Puxa das movimentações reais `PERDA`/`AVARIA` — inclusive as geradas pelo botão **Faturar
  Perdas** da Análise de Estoque. Valor = quantidade × custo unitário da baixa.
- Novo endpoint `GET /estoque/:filialId/perdas?dataInicio&dataFim` → `{ perda, quebra, total,
  porProduto }`.

### Arquivos
- `backend/src/modules/estoque/{estoque.service.ts, estoque.controller.ts}` (getResumoPerdas)
- `frontend/src/modules/fiscal/pages/PainelFaturamento.tsx`

### Observação
- Faturamento = venda/NF-e (entra dinheiro); Perda/Quebra = prejuízo de mercadoria (baixa de
  estoque). São números separados; o painel agora mostra os dois lado a lado.

---

## [2026-07-02] — Fix Inventário: categoria vinha fixa (FRUTA/LEGUME/VERDURA) e dava erro

### O que mudou
- O modal **Novo Inventário** oferecia as categorias fixas **FRUTA/LEGUME/VERDURA**, mas os
  produtos no banco usam outras (`FLV`, `FRUTA`). Escolher **VERDURA/LEGUME** filtrava 0 produtos
  e o abrir estourava ("Erro ao abrir inventário").
- Agora o dropdown carrega **as categorias que existem de verdade** (produtos ativos), via novo
  endpoint `GET /produtos/categorias`. Some a opção que não tem produto → sem erro.

### Arquivos
- `backend/src/modules/produtos/{produtos.service.ts, produtos.controller.ts}` (endpoint categorias)
- `frontend/src/modules/estoque/pages/Inventario.tsx` (dropdown dinâmico)

---

## [2026-07-02] — Agente Local (.exe): balança + impressão térmica ESC/POS num serviço só

### O que mudou
- Novo **Agente Local HETROS** (`agente-local/`): um único serviço Node.js, **empacotável em
  `.exe` clicável**, que roda em cada máquina do galpão e faz a ponte com o hardware:
  - **Balança PRIX TI200 → WebSocket `8765`** — porta fiel do `balanca_ws.py` (mesmo parser de
    frame, mesmo formato `"peso,estavel"`), então o `useBalanca.ts` do ERP conecta **sem mudar nada**.
  - **Impressão térmica → HTTP `3131`** — recebe a nota em **JSON** do navegador e manda os bytes
    crus em **ESC/POS** pra impressora USB. Endpoints `POST /imprimir/{cupom,bilhete,raw}` e
    `GET /status`. Layouts espelham o `notaTermica.ts` (**Cupom NFC-e** com QR nativo + **Bilhete
    Separador**).
  - **3 modos de impressão** (config): `share` (impressora compartilhada do Windows — recomendado,
    via `copy /b`, sem driver especial), `serial` (COM/LPT) e `tcp` (rede 9100). Acentos via CP860.
- **Front-end**: helper `agenteImpressao.ts` (`imprimirCupomAgente`, `imprimirBilheteAgente`,
  `agenteStatus`) pra o ERP mandar direto pra térmica, com **fallback** pro diálogo do navegador
  se o agente não estiver rodando.
- Config em `config.json` **ao lado do exe** (porta da balança, nome do compartilhamento, colunas,
  dados da empresa) — dá pra editar sem recompilar. README com o passo a passo do `pkg` (gerar o
  `.exe`) e de iniciar junto com o Windows.

### Arquivos
- `agente-local/*` (novo): `index.js`, `src/{balanca,servidor,notas,escpos,impressora}.js`,
  `config.json`, `package.json`, `HETROS Agente.bat`, `README.md`
- `frontend/src/modules/logistica/agenteImpressao.ts` (novo)

### Observação
- Substitui o `balanca_ws.py` (Python) + a impressão via janela do navegador por **um serviço só**.
- O `serialport` é módulo nativo; o `pkg` já embute os `prebuilds` (ver README). A impressão em
  `share`/`tcp` **não usa serialport** e funciona mesmo sem ele.
- Notas continuam **"SEM VALOR FISCAL"** (modo teste) — nada é transmitido à SEFAZ.

---

## [2026-07-02] — Análise de Estoque: Faturar Perdas/Quebras (baixa real + valor perdido em R$)

### O que mudou
- Na **Análise de Estoque Físico**, as colunas **Perdas** e **Quebra** deixaram de ser só
  anotação no navegador: agora dá pra **faturar** (dar baixa de verdade no estoque).
- Botão **"Faturar Perdas"** na barra de ações (com badge da quantidade de itens pendentes):
  digita a perda/quebra nas linhas → clica → gera a movimentação **real** (`PERDA` e `AVARIA`)
  via `POST /estoque/ajuste`, reduzindo o saldo. Pede confirmação mostrando **quantos itens,
  quantidade total e o valor perdido em R$**.
- **Valor perdido aparece**: total em **R$** no rodapé (perdas + quebra × preço de custo) e no
  toast de conclusão / na confirmação. Ex.: baixou 10kg a R$ 5,00 → "valor perdido R$ 50,00".
- **Não duplica**: registra só o **delta** (o que foi digitado além do que já tinha sido baixado);
  após faturar, o total real passa a vir do backend e o valor manual salvo é limpo. Clicar de
  novo sem digitar mais nada não gera baixa nova.

### Arquivos
- `frontend/src/modules/estoque/pages/AnaliseEstoqueFisico.tsx`

### Observação
- Usa o endpoint que já existia (`POST /estoque/ajuste` → `EstoqueService.movimentar`). A baixa
  cai como `PERDA`/`AVARIA` e aparece nas **Movimentações** e nos **Perecíveis**.

---

## [2026-07-02] — Separação touch: teclado numérico + navegação anterior/próximo

- Na fila da **Separação (Operacional)**: botão **lupa** abre um **teclado numérico** (touch)
  pra pesquisar o pedido pelo número (filtra e já abre se achar); botões **← anterior / próximo →**
  navegam pela fila. Pensado pra chão de separação sem teclado físico.
- Arquivo: `frontend/src/modules/logistica/pages/Operacional.tsx`.

---

## [2026-07-02] — Análise de Estoque Físico conectada ao banco real

- A tela **deixou de usar dados fixos (mock)** e passou a puxar do banco: lista de **todos os
  produtos ativos** (os novos aparecem sozinhos), **Saldo Inicial** (calculado do período),
  **Entrada** (movimentações reais), **Saídas**, **Ordem de Compra** (OCs pendentes), **Perdas/
  Quebra** (lançamentos reais). Novo endpoint `GET /estoque/:filialId/analise`.
- **Colunas**: Saldo Inicial (só leitura) · Entrada (já soma a OC) · Chão (manual) · Ordem de
  Compra (só leitura, informativa) · Perdas · Quebra · **= Saldo Final** (calculado sozinho).
  Fórmula: `Saldo Inicial + Entrada + Chão − Perdas − Quebra`.
- **Carrega automático** ao abrir e **salva os valores editados** (Chão/Perdas/Quebra) no
  navegador (localStorage) — persistem ao recarregar. Contraste corrigido no dark.
- Arquivos: `backend/src/modules/estoque/{estoque.service.ts, estoque.controller.ts}`,
  `frontend/src/modules/estoque/pages/AnaliseEstoqueFisico.tsx`.

---

## [2026-07-01] — Painel Operacional vira dashboard real (KPIs + gráficos)

- Backend agrega do banco: KPIs (estoque, alertas de validade, pedidos por status, NF-e/faturado
  hoje, a receber 7 dias, movimentações), **série de faturamento de 7 dias**, **pedidos por status**
  e **fluxo do dia**. Frontend com KPIs reais + gráfico de barras + barras por status.
- Arquivos: `backend/src/modules/dashboard/*`, `frontend/src/pages/DashboardPage.tsx`.

---

## [2026-07-01] — Notas térmicas 80mm: Bilhete Separador + Cupom fiscal (NFC-e)

- **Bilhete Separador** (picking) e **Cupom fiscal estilo NFC-e** (com preços, total, forma de
  pagamento, tributos Lei 12.741, chave + QR), ambos 80mm com a **logo da Hetros**, pra sair na
  térmica (ex.: Benetech MP-4200 TH). Botões **Nota** (cupom) e **Bilhete** no Líder e na Separação.
- Impressão **fecha a janela sozinha** após imprimir (`onafterprint`); atalho `.bat`
  `HETROS - Imprimir Direto` com Chrome `--kiosk-printing` (imprime direto na padrão, sem diálogo).
- Arquivo: `frontend/src/modules/logistica/notaTermica.ts` + páginas do Líder/Separação.

---

## [2026-07-01] — Operacional: nota térmica (bilhete de separação 80mm) + cartões melhorados

### O que mudou
- **Nota de Separação térmica (80mm)**: novo módulo `notaTermica.ts` que imprime a "notinha"
  no formato de bobina (ex.: **Benetech MP-4200 TH**) — cabeçalho HETROS/CEASA, pedido, cliente,
  **observação em destaque**, itens (descrição, qtd, un, peso), total de itens e peso, linhas de
  separador/conferente. Abre já chamando a impressão (o operador escolhe a impressora térmica).
- Botão **Nota** na **Operacional** (por pedido na fila) e no **painel de Separação** (ao lado de
  Finalizar).
- Cartões da fila da Operacional mostram mais dados (peso, data de entrega, período), aproximando
  do layout do sistema antigo (NewOxxy).

### Arquivos
- `frontend/src/modules/logistica/notaTermica.ts` (novo)
- `frontend/src/modules/logistica/pages/{Operacional.tsx, SeparacaoPesagem.tsx}`

### Observação
- A impressão abre o diálogo do navegador; para sair direto na MP-4200 TH, defina-a como
  impressora padrão (ou selecione no diálogo). Papel 80mm; layout já vem com `@page size: 80mm`.

---

## [2026-07-01] — Permissões por perfil: telas que vê + ações (criar/editar/excluir)

### O que mudou
- Na tela **Usuários & Acessos → Perfis**, além de marcar **quais telas** o perfil vê, agora dá
  pra ligar/desligar por tela o que ele pode fazer: **C**riar, **E**ditar, e**X**cluir (chips ao
  lado de cada tela). Padrão = tudo permitido; o admin desmarca o que quiser bloquear.
- **Botões somem** para quem não tem permissão: o botão **"Novo"** (via TopBar, vale pra todas
  as telas do kit) e **Editar/Excluir** nas 5 telas de Cadastros. ADMIN sempre vê tudo.

### Backend / schema
- `Role.acoes Json?` — mapa `{ "<rota>": ["CRIAR","EDITAR","EXCLUIR"] }`.
- `usuarios` (roles) salva/retorna `acoes`; `auth.login` e `login-por-id` devolvem `acoes`.

### Frontend
- `config/telas.ts`: helper `podeAcao(...)` + catálogo de ações.
- `AuthContext`: expõe `pode(rota, acao)`.
- `cadastros/ui.tsx` (TopBar) e as 5 telas de Cadastros aplicam o gating.
- `gerencial/pages/UsuariosAcessos.tsx`: editor de ações por tela.

### Observação
- Enforcement de **botão** aplicado às Cadastros + "Novo" global; dá pra estender o
  Editar/Excluir às demais telas quando quiser. (O bloqueio no backend por ação fica como
  próximo passo, se necessário.)

### Arquivos
- `backend/prisma/schema.prisma`, `backend/src/modules/{usuarios/usuarios.service.ts, auth/auth.service.ts}`
- `frontend/src/config/telas.ts`, `frontend/src/contexts/AuthContext.tsx`, `frontend/src/modules/cadastros/ui.tsx`
- `frontend/src/modules/cadastros/pages/{Clientes,Fornecedores,Transportadoras,Produtos,Filiais}.tsx`
- `frontend/src/modules/gerencial/pages/UsuariosAcessos.tsx`

---

## [2026-07-01] — Tema dark global + Separação enxuta com observações destacadas

### O que mudou
- **Tema dark global**: bloco de CSS em `index.css` uniformiza as telas que ainda eram claras
  (Dashboard, Faturamento, NF-e Emitidas, Pedidos, Controle de Carga, Posição, Análise, etc.)
  para o azul-escuro/branco, remapeando `bg-white/bg-gray-*`, textos e bordas. As telas já dark
  não são afetadas; a DANFE continua branca (abre em janela própria p/ impressão).
- **Separação / Pesagem**:
  - **Observações do pedido** agora aparecem num **destaque amarelo** no topo (📌), pra o
    separador não perder recado (PESAR, NOIVA, etc.).
  - **Reduzidos os tamanhos** (fontes, avatares, botões, modal de pesagem) — a tela estava
    grande demais; agora cabe mais item por vez sem perder legibilidade no touch.

### Arquivos
- `frontend/src/index.css`
- `frontend/src/modules/logistica/pages/SeparacaoPesagem.tsx`

---

## [2026-07-01] — Receber Ordem de Compra passa pela tela de Entrada (NF/lote/validade)

### O que mudou
- Na **Ordem de Compra**, o botão **Receber** agora **leva para a tela de Entradas** com a OC
  já pré-preenchida (fornecedor + itens com produto/qtd/preço), em vez de dar entrada "às cegas".
  Lá o usuário confere e completa **NF, chave, lote e validade** e clica em **Dar entrada**.
- Ao salvar a entrada vinda de uma OC, a **OC é marcada como Entregue** (com `entradaId` e
  `quantidadeRecebida`), e a entrada faz a baixa no estoque + Contas a Pagar normalmente
  (sem duplicar).

### Arquivos
- `frontend/src/modules/estoque/pages/{Compras.tsx, Entradas.tsx}`
- `backend/src/modules/entradas/entradas.service.ts` (aceita `ordemCompraId` e conclui a OC)

---

## [2026-07-01] — Fim dos alert/confirm/prompt do navegador + inventário lista todos os produtos

### O que mudou
- **Adeus caixinhas feias do navegador**: criado um sistema interno de feedback
  (`components/ui/feedback.tsx`) com **toast** (notificação que some), **confirmDialog** e
  **promptDialog** (modais dark), montado via `<FeedbackHost />` no AppShell. Substituídos os
  **49 usos** de `alert/confirm/prompt` em 15 telas.
- **Inventário** agora **lista todos os produtos ativos** (mesmo com saldo 0) ao abrir, em vez de
  só os que tinham saldo — a tela nunca fica vazia e permite achar estoque físico não registrado.
  Removidos os inventários de teste que ficaram vazios.
- Corrigido: o `abrir` do inventário rodava, mas o processo do backend às vezes ficava defasado
  (tsc-watch recompila sem reiniciar o Nest) — reinício limpo aplicado.

### Arquivos
- `frontend/src/components/ui/feedback.tsx` (novo), `frontend/src/components/layout/AppShell.tsx`
- 15 telas em `frontend/src/modules/**/pages/*` (troca dos diálogos nativos)
- `backend/src/modules/inventario/inventario.service.ts`

---

## [2026-07-01] — Módulo Compras / Suprimentos: Ordem de Compra (OC) com recebimento no estoque

### O que mudou
- Novo fluxo de **Ordem de Compra** (`/wms/compras`, menu Estoque):
  - Criar OC: fornecedor, condição de pagamento, entrega prevista e **N itens** (produto,
    quantidade, preço unitário). **Subtotal por item e total da OC** calculados automaticamente.
  - **Status**: Pendente → Aprovada → (Parcial) → Entregue / Cancelada.
  - **Receber** (ou mudar status para ENTREGUE): **dá entrada no estoque** de cada item
    (ENTRADA_COMPRA, com custo) e **gera o Contas a Pagar** pela condição de pagamento.
  - CRUD completo (criar/editar/excluir) — edição/exclusão bloqueadas após entrega.
  - Itens puxam NCM/descrição/unidade/preço do cadastro do produto (igual à Entrada).

### Backend / schema
- Models **`OrdemCompra`** 1:N **`ItemOrdemCompra`** + enum `StatusOrdemCompra`
  (PENDENTE, APROVADA, PARCIAL, ENTREGUE, CANCELADA). Back-relations em Fornecedor e Produto.
- Novo módulo **`compras`** (service + controller): CRUD, `mudarStatus`, `receber`
  (integra EstoqueService + ContaPagar). Arquitetura: lógica no service, controller fino.

### Arquivos
- `backend/prisma/schema.prisma`, `backend/src/modules/compras/*` (novo), `backend/src/app.module.ts`
- `frontend/src/modules/estoque/pages/Compras.tsx` (novo)
- `frontend/src/App.tsx`, `frontend/src/components/layout/AppShell.tsx`

---

## [2026-07-01] — FEFO automático: separação sugere o lote e a baixa consome por validade

### O que mudou
- **Baixa por FEFO** (First Expired, First Out): ao faturar, o sistema agora **consome o lote que
  vence primeiro**, alocando a quantidade entre os lotes por ordem de validade (sobra sem
  cobertura sai do último lote, podendo ficar negativo — regra "a comprar").
- **Separação sugere o lote certo**: na tela de Separação/Pesagem, cada item mostra uma badge
  **"📦 Pegar lote X · vence dd/mm (Nd)"**, colorida por urgência (vermelho vencido, laranja ≤2d,
  azul no prazo). O separador pega o lote que o sistema aponta, evitando perda.

### Backend
- `EstoqueService.getFefoLotes()` — lotes do produto na filial com saldo, ordenados por validade.
- `EstoqueService.baixarFefo()` — baixa alocando FEFO (uma movimentação por lote).
- Novo endpoint `GET /estoque/:filialId/fefo/:produtoId` (sugestão para a separação).
- `nfe.emitida` passou a usar `baixarFefo` no lugar do `movimentar` simples.

### Arquivos
- `backend/src/modules/estoque/{estoque.service.ts, estoque.controller.ts}`
- `backend/src/modules/nfe/nfe.service.ts`
- `frontend/src/modules/logistica/pages/SeparacaoPesagem.tsx`

---

## [2026-07-01] — Módulo Estoque / WMS em dark mode: Perecíveis, Entradas, Movimentações, Inventário

### O que mudou
Detalhamento completo das 4 telas que eram placeholder no grupo **B · Estoque / WMS**
(dark, reusando o kit de UI de Cadastros):

- **Perecíveis / FLV** (`/wms/pereciveis`): controle **FEFO** por validade. Filtro de janela
  (3/7/15/30 dias), KPIs (vencidos, vencendo ≤2d, lotes em alerta), dias restantes coloridos e
  ações de baixa por **Perda/Avaria** (gera ajuste de estoque). Usa `GET /estoque/:filial/alertas-validade`.
- **Entradas (XML NF-e)** (`/wms/entradas`): recebimento de mercadoria. **Importa o XML da NF-e
  do fornecedor** (parse no navegador, preenche itens/NCM/qtd/valor + chave/nº), vínculo de
  produtos por item, lote e validade, e opção de **gerar Contas a Pagar**. Dá **entrada no estoque**
  (ENTRADA_COMPRA) com criação de **lote/validade** (rastreabilidade).
- **Movimentações** (`/wms/movimentacoes`): extrato filtrável (tipo, período, produto) com KPIs
  de entradas × saídas, saldo antes→depois, custo e usuário. Usa `GET /estoque/:filial/movimentacoes`.
- **Inventário** (`/wms/inventario`): fluxo **abrir → contar → fechar**. Ao abrir, congela o saldo
  do sistema; a contagem salva sozinha; ao fechar, **gera os ajustes** (+/−) automaticamente.

### Backend
- Novo módulo **`entradas`** (service + controller): registra entrada, cria lote/validade e
  movimenta o estoque; opcional Contas a Pagar.
- Módulo **`inventario`** implementado de verdade (era stub): abrir (snapshot), contar, fechar
  (gera AJUSTE_POSITIVO/NEGATIVO via EstoqueService).
- Seed de lotes com validade (vencido, hoje, 5d, 20d) para testar os perecíveis.

### Arquivos
- `backend/src/modules/entradas/*` (novo), `backend/src/modules/inventario/*`, `backend/src/app.module.ts`
- `frontend/src/modules/estoque/pages/{Pereciveis, Entradas, Movimentacoes, Inventario}.tsx` (novos)
- `frontend/src/App.tsx`

### Observação
- As telas novas de WMS usam **dark**; **Posição de Estoque** e **Análise Estoque Físico**
  (as 2 que já existiam) seguem no tema claro — dá pra migrar depois pra uniformizar.

---

## [2026-06-30] — Módulo Cadastros (FLV) em dark mode: 5 telas + campos de nicho

### O que mudou
- Novo **kit de UI dark** (`modules/cadastros/ui.tsx`) — shell, topbar, filtros, tabela, modal,
  badges, barra de ocupação — visual sofisticado alinhado à sidebar.
- **Clientes** (real + dark): + campo **exige rastreabilidade** (etiqueta QR/órgãos) com ícone
  na tabela. Mantém CRUD real (399 clientes).
- **Fornecedores** (novo, real): produtor rural — Inscrição de Produtor Rural, Localização da
  propriedade, **Tipo de Parceria** (Compra Direta / Consignação), Pix e dados bancários para
  acerto. Filtro por tipo de parceria. CRUD completo no backend (antes era stub).
- **Transportadoras** (novo, real): Placa principal, Tipo de veículo, Região de atuação, Frete
  base por kg. Filtro por região. CRUD completo no backend.
- **Produtos & NCM** (real + dark): + **Classificação/Calibre** (Tipo 1, Graúdo…), **Caixaria**
  (Caixa Madeira 20kg, Plástica H…) e **peso líquido médio/caixa**. Tabela com ícone do produto
  e **estoque em kg e caixas**. Agora com create/inativar (POST/DELETE).
- **Filiais / Boxes** (novo, real): identificação do box, responsável, **capacidade de paletes**
  + **barra de ocupação** colorida, **câmara fria**. CRUD (POST/PUT).
- Seed de mock: 3 produtores, 3 transportadoras, capacidade/ocupação nos boxes.

### Backend / schema
- FLV: `Cliente.exigeRastreabilidade`; `Fornecedor.{inscricaoRural, localizacaoPropriedade,
  tipoParceria, pix, dadosBancarios}`; `Transportadora.{placaPrincipal, tipoVeiculo,
  regiaoAtuacao, freteBaseKg}`; `Produto.{classificacao, tipoCaixaria, pesoCaixaria}`;
  `Filial.{responsavel, capacidadePaletes, ocupacaoPaletes, camaraFria}`.
- CRUD implementado: **Fornecedores** e **Transportadoras** (eram stubs); **Produtos** ganhou
  create/delete + lista de unidades + estoque no findAll; **Filiais** ganhou create/update.

### Arquivos
- `backend/prisma/schema.prisma`
- `backend/src/modules/{fornecedores,transportadoras,produtos,filiais}/*`
- `frontend/src/modules/cadastros/ui.tsx` (novo)
- `frontend/src/modules/cadastros/pages/{Clientes, Fornecedores (novo), Transportadoras (novo), Produtos, Filiais (novo)}.tsx`
- `frontend/src/App.tsx`

### Observação
- As 5 telas de Cadastros usam **tema dark** (o resto do app segue claro por enquanto).

---

## [2026-06-30] — Fix baixa no faturamento + telas fiscais (filtros, painel, CT-e/MDF-e, regime)

### Correção (importante)
- **Faturar não dava baixa**: o handler `nfe.emitida` estourava na baixa de estoque quando o
  produto estava com saldo físico abaixo do necessário (ex.: MAMÃO físico 0), **abortando** a
  geração da conta a receber e a mudança do pedido para FATURADO. Resultado: o pedido continuava
  na fila e gerava NF-e duplicadas a cada clique.
  - `EstoqueService.movimentar` ganhou `permitirNegativo` — a baixa de venda pode deixar o saldo
    **negativo** (regra "a comprar", já usada na aprovação do pedido).
  - O handler passa `permitirNegativo: true` e **blinda cada item**: falha pontual não impede
    mais o financeiro/status. Limpeza das NF-e fantasma geradas no teste.

### Novas telas / melhorias fiscais
- **NF-e Emitidas**: barra de **filtros** (período, status e busca global por chave/nº/cliente).
- **Painel de Faturamento** (`/fiscal/painel`, novo): dashboard gerencial com KPIs (faturamento,
  impostos, qtd notas, ticket médio), **gráfico por dia** e **faturamento por cliente** — sem
  mexer na tela de emitir.
- **CT-e / MDF-e** (`/fiscal/cte`): UI com abas (MDF-e/CT-e), simular manifesto **vinculando
  NF-e reais**, tabela de documentos e ações Encerrar/Cancelar (mock em localStorage).
- **Matriz Fiscal**: card da **filial emitente** no topo para definir **regime tributário**,
  CRT, CNPJ e IE (salva via `PATCH /filiais/:id/regime`).
- **DANFE**: logo da Hetros como **marca d'água** preenchendo a folha inteira (em pé), e altura
  de folha A4.

### Arquivos
- `backend/src/modules/estoque/estoque.service.ts`, `backend/src/modules/nfe/nfe.service.ts`
- `backend/src/modules/filiais/{filiais.service.ts, filiais.controller.ts}`
- `frontend/src/modules/fiscal/pages/{NotasEmitidas, MatrizFiscal, PainelFaturamento (novo), CteMdfe (novo)}.tsx`
- `frontend/src/modules/fiscal/danfe.ts`
- `frontend/src/App.tsx`, `frontend/src/components/layout/AppShell.tsx`, `frontend/src/config/telas.ts`

---

## [2026-06-30] — Logo oficial da Hetros no sistema e nos impressos

### O que mudou
- Adicionada a **logo oficial da Hetros** (ícone mão+folhas e logo completa) em:
  - **Login**: logo completa num badge branco no topo + ícone na barra superior.
  - **Sidebar**: ícone no topo (expandida e recolhida), no lugar do raio (`Zap`).
  - **DANFE**: ícone no cabeçalho, no lugar do emoji 🍃.
  - **Capa de Rota** e **Espelho** (impressos): ícone/logo no cabeçalho.
  - **Favicon** e título da aba.

### Arquivos
- `frontend/public/{logo-hetros.png, logo-hetros-icone.png, favicon.png}` (novos)
- `frontend/index.html`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/modules/fiscal/danfe.ts`
- `frontend/src/modules/logistica/pages/ControleCarga.tsx`

---

## [2026-06-30] — Faturamento aprofundado: motor fiscal, validação, parcelas, CC-e e devolução (modo teste)

### O que mudou
- **Motor de Regras Fiscais** (novo módulo `fiscal`): matriz fiscal por **NCM/UF/operação**
  que resolve **CFOP** (interno × interestadual), **CST/CSOSN** e calcula **ICMS, ICMS-ST,
  IPI, PIS e COFINS** item a item. Nova tela **Matriz Fiscal** (`/fiscal/matriz`) com CRUD
  das regras + botão "Regras-padrão" (semeia FLV/Simples Nacional). Fallback para as alíquotas
  do próprio produto quando não há regra.
  - Detecta **interestadual** (UF filial × UF cliente) e **consumidor final** (cliente sem IE),
    com suporte a **DIFAL** e **ICMS-ST** (MVA).
- **Validação anti-erro** antes de faturar: checklist (status, cliente ativo, CNPJ/CPF, endereço,
  IE/Sintegra, **bloqueio de crédito**, **estoque físico** por item, NCM válido, CNPJ do emitente).
  Bloqueios impedem o faturamento; avisos só alertam. A geração da NF-e **roda a validação no
  backend** e barra se houver bloqueio. Tela de Faturamento ganhou botão **Conferir** (modal com
  o checklist + **preview dos impostos** calculados).
- **Desdobramento financeiro (parcelas)**: a NF-e gera **duplicatas** conforme a condição de
  pagamento (`30/60/90` ou `numeroParcelas` em passos de 30 dias; à vista vence hoje). Na emissão,
  cria **uma Conta a Receber por parcela**, com **boleto/PIX fake** (modo teste).
- **Eventos de exceção**:
  - **Cancelamento**: agora **estorna o estoque** (entrada de devolução), **cancela os títulos**
    em aberto e devolve o pedido para SEPARADO (via evento `nfe.cancelada`).
  - **Carta de Correção Eletrônica (CC-e)**: registra correções (15–1000 caR, máx. 20/nota),
    com sequência e histórico exibido no detalhe da nota.
  - **Nota Fiscal de Devolução**: gera NF-e espelho de **entrada** (finalidade 4, CFOP 5202/6202)
    referenciando a original; ao emitir, **reentra o estoque** e **anula o financeiro**
    (evento `nfe.devolvida`).
- **NF-e Emitidas** reformulada: clique abre **detalhe** (impostos, duplicatas, CC-e) com ações
  DANFE, Enviar e-mail (mock), CC-e, Devolução e Cancelar. Coluna Tipo (Venda/Devolução) e badge CC-e.
- **XML** de teste agora sai com itens e impostos (antes era um stub).

### Backend / schema
- `Filial`: + `regimeTributario`, `crt`.
- `NFe`: + `tipoOperacao`, `finalidade`, `nfeReferenciadaId`/`chaveReferenciada` (self-relation
  devolução), `valorIcmsSt`, `valorIpi`, relação `cartasCorrecao`.
- `ItemNFe`: usa `origemProd`, bases e CST de PIS/COFINS calculados.
- Novos models: **`RegraFiscal`** (matriz fiscal) e **`CartaCorrecao`** (CC-e). Aplicado via `prisma db push`.
- Arquitetura **Event-Driven** mantida: `nfe.emitida`, `nfe.cancelada`, `nfe.devolvida`.

### Arquivos
- `backend/prisma/schema.prisma`
- `backend/src/modules/fiscal/*` (novo módulo: service + controller + module)
- `backend/src/modules/nfe/{nfe.service.ts, nfe.controller.ts, nfe.module.ts}`
- `backend/src/app.module.ts`
- `frontend/src/modules/fiscal/pages/{Faturamento.tsx, NotasEmitidas.tsx, MatrizFiscal.tsx (novo)}`
- `frontend/src/App.tsx`, `frontend/src/components/layout/AppShell.tsx`, `frontend/src/config/telas.ts`

### Observação
- Continua **modo teste**: nada é transmitido à SEFAZ, sem certificado A1/A3. Chave, protocolo,
  XML, boleto e PIX são gerados de forma fictícia (sem validade fiscal).
- A validação exige **CNPJ na filial emitente** (bloqueio). A filial 1001 (CEAGESP Box 42) foi
  configurada com CNPJ/IE de teste e regime Simples Nacional para liberar o faturamento.
- Para acesso pelo **monitor touch** na rede: front exposto com `vite --host` em
  `http://<IP-da-maquina>:3000` (o proxy do Vite repassa `/api` ao backend `:3002` localmente).
  Pode ser necessário liberar a porta 3000 no Firewall do Windows (regra de entrada TCP).

---

## [2026-06-30] — Área de Usuários & Acessos (perfis + controle de telas)

### O que mudou
- Nova tela **Usuários & Acessos** (`/gerencial/usuarios`) com duas abas:
  - **Usuários**: criar / editar / inativar usuário (nome, e-mail, senha, perfil, filiais,
    ativo) + trocar senha.
  - **Perfis**: criar / editar perfis e **marcar quais telas cada perfil vê** (checkboxes
    agrupados) + definir a **tela inicial** (onde o usuário cai ao logar). ADMIN = todas.
- **Controle de acesso por tela**: o menu lateral e as rotas passam a respeitar as telas do
  perfil. Quem não tem acesso a uma tela nem a vê no menu nem consegue abrir por URL
  (redireciona pra tela inicial dele).
- **Login inteligente**: usuário restrito cai **direto na sua tela** (ex.: Operador WMS abre
  já na Separação, sem ver o resto). Ideal pro touch do galpão.
- Perfis semeados: ADMIN (tudo), OPERADOR_WMS (só Separação), COMERCIAL (pedidos/clientes/
  carga), FINANCEIRO (contas/DRE), FISCAL (NF-e/CT-e).

### Backend / schema
- `Role`: novos campos `telas String[]` (rotas permitidas; `["*"]` = todas) e `telaInicial`.
- Novo módulo **`usuarios`**: CRUD de usuários (`/usuarios`) e de perfis (`/usuarios/roles`),
  incluindo reset de senha e inativação.
- `auth.login` / `login-por-id` passam a devolver `telas` e `telaInicial` do perfil.

### Arquivos
- `backend/prisma/schema.prisma`
- `backend/src/modules/usuarios/*` (novo módulo), `backend/src/app.module.ts`
- `backend/src/modules/auth/auth.service.ts`
- `frontend/src/config/telas.ts` (novo — catálogo de telas)
- `frontend/src/contexts/AuthContext.tsx`, `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/pages/LoginPage.tsx`, `frontend/src/App.tsx`
- `frontend/src/modules/gerencial/pages/UsuariosAcessos.tsx` (novo)

---

## [2026-06-30] — Separação com pesagem na balança (estilo NewOxxy)

### O que mudou
- Nova tela de **Separação / Pesagem** integrada à **Operacional · Separação**, inspirada na
  tela dos separadores do NewOxxy, com cara moderna (full-screen, touch).
  - Botão **"Iniciar Separação / Pesar"** no painel da Operacional abre a tela (e marca o
    pedido como EM_SEPARACAO).
  - **Balança ao vivo via WebSocket** (`ws://<host>:8765`, a ponte `balanca_ws.py`):
    peso gigante, estável/instável, reconexão automática, indicador conectado/offline e
    ajuste de host (caso o ERP rode em máquina diferente da balança).
  - Por item: **Peso Vendido (kg de referência)** × **Peso Aferido (balança)** com
    **divergência colorida** (verde acima / vermelho abaixo).
    - Itens em **KG** usam a balança; itens em **UN/CX** são conferência (pesagem opcional).
    - "Peso Vendido" de itens não-KG = qtd × peso unitário do produto (pesoLiquido/pesoBruto).
  - Ações: **Capturar Peso**, **Confirmar Item**, **Cortar item** (sem estoque), navegação
    (primeiro/anterior/próximo/último), atalhos de teclado (Enter confirma, espaço captura,
    setas navegam), totais (vendido × aferido) e **Liberar p/ Faturamento** quando todos os
    itens estão conferidos ou cortados.

### Backend / schema
- `ItemPedido`: novos campos `pesoAferido` (kg), `separado` (bool), `cortado` (bool).
  Aplicado via `prisma db push`.
- `pedidos.findOne`: passa a incluir `pesoLiquido`/`pesoBruto` do produto e ordena itens.
- Novo endpoint `PATCH /pedidos/:id/itens/:itemId/separacao` — grava peso aferido / conferência
  / corte e **recalcula o peso total real** do pedido (soma dos aferidos, exceto cortados).

### Arquivos
- `backend/prisma/schema.prisma`
- `backend/src/modules/pedidos/{pedidos.service.ts, pedidos.controller.ts}`
- `frontend/src/hooks/useBalanca.ts` (novo)
- `frontend/src/modules/logistica/pages/SeparacaoPesagem.tsx` (novo)
- `frontend/src/modules/logistica/pages/Operacional.tsx`

### Observação
- A balança só mostra peso ao vivo se a ponte `balanca_ws.py` estiver rodando no PC do touch
  (COM4 / PRIX TI200). Sem ela, a tela funciona em modo conferência (mostra "balança offline").
- Produtos sem `pesoLiquido` cadastrado mostram peso esperado 0 — cadastrar o peso unitário
  para a divergência ficar correta em itens UN/CX.

---

## [2026-06-30] — Pedidos do dia, correção de fuso, frete fora do pedido e fix tela branca

### O que mudou
- **Pedidos de Venda — filtro "do dia"**: a tela abre filtrando pela **data de entrega = hoje**.
  - Novo seletor de data na barra + botões **Hoje** e **Todos** (histórico completo quando quiser).
  - Subtítulo mostra o contexto (ex.: "1 pedido · entrega 30/06/2026").
  - Usa os parâmetros `dataInicio`/`dataFim` que o backend já suportava.
- **Bug de fuso (off-by-one)**: a coluna **Entrega** mostrava 1 dia a menos (data gravada à
  meia-noite UTC convertida pra BRT caía no dia anterior). Passou a formatar a data em UTC,
  então a coluna bate com o dia real e com o filtro.
- **Frete removido do Pedido de Venda**: tirados **Tipo de Frete** e **Valor do Frete** da
  seção C e o **Frete** do rodapé de totais. O frete é definido na logística (Controle de
  Carga). Pedido continua sendo salvo com `frete = 0`. Nota explicativa no lugar dos campos.
- **Controle de Carga**:
  - Removido o botão **"Atualizar Lista"** (a grade já recarrega ao trocar a data).
  - Campos **Carga** e **Entrega** agora abrem pré-preenchidos com a **data de hoje**
    (antes "Entrega" vinha vazia).
- **Fix tela branca ao abrir "Nova Entrega"**: o ícone `ClipboardList` era usado no estado
  vazio do modal mas **não estava importado** do `lucide-react` — quando não havia pedido
  CONFIRMADO no dia, o modal quebrava. Import corrigido.

### Arquivos
- `frontend/src/modules/logistica/pages/PedidosVenda.tsx`
- `frontend/src/modules/logistica/pages/ControleCarga.tsx`

### Pendente (decisão do usuário)
- Controle de Carga abre em "hoje"; rotas antigas (3501/3502) ainda aparecem 1 dia antes por
  terem sido gravadas à meia-noite UTC. Aguardando decisão: abrir no último dia com rotas /
  manter hoje / migrar as 2 rotas antigas no banco.

---

## [2026-06-29] — Roteirizado fica verde + tela Frete por Motorista

### O que mudou
- **Controle de Carga**: pedidos já roteirizados aparecem em **VERDE** (status "ROTA",
  com rota e motorista preenchidos); só os não roteirizados ficam vermelhos. A grade agora
  carrega via `/carga/grade` (sabe quem tem romaneio).
- Nova tela **Frete por Motorista** (`/logistica/frete`), estilo planilha (dourada):
  colunas DATA, MOTORISTA, VEÍCULO, CLIENTE, FRETE (editável), NF-E, PERCENTUAL + linha TOTAL.
  - Uma linha por rota (romaneio) do dia. NF-E = soma dos pedidos da rota.
  - Frete digitado por rota, **salvo automaticamente** (PATCH /carga/romaneio/:id/frete).
  - Percentual = frete ÷ NF-E (calculado na hora).
- Schema: `valorFrete` no Romaneio. Backend: `getFechamentoFrete` + `setFrete`.

### Arquivos
- `backend/prisma/schema.prisma`, `backend/src/modules/carga/{service,controller}.ts`
- `frontend/src/modules/logistica/pages/{ControleCarga,FreteMotoristas}.tsx`
- `frontend/src/App.tsx`, `frontend/src/components/layout/AppShell.tsx`

---

## [2026-06-29] — Pedido: preço só leitura + desconto bloqueado por senha

### O que mudou
- **Preço unitário** no item do pedido agora é **somente leitura** (definido pela área de
  custo) — não há mais input editável, só o valor exibido.
- **Descontos bloqueados**: campos de desconto por item, o toggle R$/% e o Desconto Geral
  ficam desabilitados. Só liberam após senha.
  - Botão "Liberar descontos (senha)" na seção de itens; pede senha (`SENHA_DESCONTO`,
    padrão `hetros2026`, trocável no topo de PedidosVenda.tsx).
  - Senha correta → campos habilitam e botão vira "Descontos liberados".

### Arquivos
- `frontend/src/modules/logistica/pages/PedidosVenda.tsx`

---

## [2026-06-29] — Tela Operacional (separação) + endereços fictícios

### O que mudou
- **Endereços fictícios** preenchidos em 398 clientes que estavam sem endereço
  (script `prisma/seed-enderecos.ts`) — a Capa de Rota e o Espelho saem completos.
- Nova tela **Operacional / Separação** (`/logistica/operacional`):
  - Lista os pedidos do dia por status de separação, com cores (NewOxxy):
    Pendente (CONFIRMADO/vermelho), Separando (EM_SEPARACAO/azul),
    Liberado p/ Faturamento (SEPARADO/verde), Faturado (cinza).
  - Chips com contagem por status + filtro.
  - Painel direito: itens do pedido selecionado (picking) + ações
    **Iniciar Separação** → **Liberar para Faturamento**, e **Imprimir Espelho**.
  - Persiste via `PATCH /pedidos/:id/status`.
- Backend `getGrade`: expõe `statusPedido` e `qtdItens`.
- Item no menu lateral: "Operacional / Separação".

### Fluxo completo agora
Pedido (com itens) → Aprovar → Controle de Carga (roteirizar → Capa de Rota) →
Operacional (separar → liberar) → [Faturamento].

### Arquivos
- `backend/prisma/seed-enderecos.ts` (novo), `backend/src/modules/carga/carga.service.ts`
- `frontend/src/modules/logistica/pages/Operacional.tsx` (novo)
- `frontend/src/App.tsx`, `frontend/src/components/layout/AppShell.tsx`

---

## [2026-06-29] — Roteirização persistida + Capa de Rota + Espelho

### O que mudou
**Schema (Romaneio)**: + codigoCondutor, foneCondutor, placaVeiculo, modeloVeiculo,
tipoVeiculo, refrigerado, periodo, dataMovimento, dataEntrega, autorizacaoCarga (db push).

**Backend (carga.service reescrito)**:
- `getGrade` corrigido (não usa mais colunas removidas; marca roteirizado/peso/valor reais).
- `getRotas` agora retorna os **romaneios reais do dia** (Entregas Programadas) com entregas,
  peso, valor e qtd — filtra por `dataEntrega`.
- `POST /carga/romaneio` — **cria a rota (Romaneio = Capa de Rota)** com motorista/veículo +
  pedidos, gera número e autorização de carga. **Persiste a roteirização.**
- `GET /carga/romaneio/:id/capa` — dados completos da Capa de Rota.
- `DELETE /carga/romaneio/:id` — desfaz a rota.
- Corrigido **bug de fuso horário** no filtro de dia (janela caía 1 dia antes em BRT).

**Frontend (Controle de Carga)**:
- "Entregas Programadas" agora mostra **só as rotas já montadas** (reais), expansíveis com
  as entregas e valor; botão **Imprimir Capa de Rota** (layout igual ao NewOxxy).
- Nova Entrega → Roteirizar agora **salva no backend** (não some mais ao fechar).
- KPIs (Qtd Rotas / Peso / Qtd Entregas) vêm das rotas reais.
- Botão **Espelho** por pedido no painel inferior (picking sheet com itens, layout NewOxxy).
- Frota de motoristas (16) segue como lista para escolher no modal.

### Observação
A Capa de Rota mostra endereço/bairro vazios para clientes sem endereço cadastrado —
preencher em Cadastros → Clientes para sair completa.

### Arquivos
- `backend/prisma/schema.prisma`
- `backend/src/modules/carga/{service,controller}.ts`
- `frontend/src/modules/logistica/pages/ControleCarga.tsx`

---

## [2026-06-29] — Aprovar com estoque negativo + avisos "a comprar/repor"

### O que mudou
- **Aprovar pedido NÃO bloqueia mais por falta de estoque.** Ao aprovar, reserva os itens
  permitindo o disponível ficar **negativo** (sinaliza que precisa comprar). Continua
  bloqueando só por crédito.
- Ao aprovar com saldo negativo, mostra **alerta** listando os produtos e quanto falta.
- Novo `GET /estoque/:filialId/a-comprar` — produtos com disponível negativo OU abaixo do
  mínimo, com sugestão de compra (mínimo − disponível).
- **Caixinha de aviso** no topo de **Pedidos de Venda** e da **Análise de Estoque Físico**
  listando os produtos em falta/a repor.

### Arquivos
- `backend/src/modules/pedidos/pedidos.service.ts` (confirmar)
- `backend/src/modules/estoque/{service,controller}.ts` (getAComprar)
- `frontend/src/modules/logistica/pages/PedidosVenda.tsx`
- `frontend/src/modules/estoque/pages/AnaliseEstoqueFisico.tsx`

### Pendente (aguardando imagens do cliente)
- Capa de rota / espelhos do NewOxxy para implementar: salvar a roteirização (Nova Entrega →
  Roteirizar persistindo no backend) e mostrar em "Entregas Programadas" só rotas já roteirizadas.

---

## [2026-06-29] — Módulo Pedido de Venda completo (itens, estoque, crédito)

### O que mudou
**Schema (Pedido)**: + formaPagamento, condicaoPagamento, numeroParcelas, periodo, regiao,
pesoTotal, volumes, enderecoEntregaJson, observacoesNf, dataEmissao, bloqueioCredito,
motivoBloqueio. **ItemPedido**: + descontoTipo (VALOR/PERCENT) e descontoPercent.
(Aplicado via `prisma db push`.)

**Seed**: 4 unidades de medida + 12 produtos FLV (BATATA, TOMATE, CEBOLA, BANANA, MAÇÃ,
LARANJA, CENOURA, ALFACE, MAMÃO, MELANCIA, OVO, PIMENTÃO) com saldo de estoque na filial.

**Backend**:
- `GET /produtos/search?q=&filialId=` — autocomplete por nome/código/cód. barras, já com
  estoque disponível (quantidade − reservada).
- `pedidos.service` reescrito: cria/edita pedido COM itens, calcula subtotal por linha
  (qtd × preço − desconto %/R$), total líquido = itens − desconto geral + frete, peso total.
- **Análise de crédito**: ao salvar, checa duplicatas vencidas e limite de crédito do cliente
  → marca `bloqueioCredito` + motivo.
- **Validação de estoque** ao aprovar (CONFIRMADO): bloqueia se faltar saldo; bloqueia se
  houver bloqueio de crédito.
- `PUT /pedidos/:id` para editar rascunho.

**Frontend** (`PedidosVenda.tsx` reescrito) — modal em 4 seções:
- A · Dados gerais (cliente lookup com limite, emissão, entrega, período, região)
- B · Itens: busca de produto (autocomplete) + grid editável (qtd com aviso de estoque,
  preço, desconto R$/%, subtotal por linha, remover)
- C · Pagamento e entrega (forma, parcelas conforme forma, CIF/FOB, frete, endereço — puxa
  o endereço do cliente)
- D · Observações internas e da NF
- Rodapé fixo com **totais reativos**: total dos itens, desconto geral, frete, TOTAL LÍQUIDO.
- Lista com Editar/Aprovar, selo "Crédito bloqueado", status CONFIRMADO exibido como APROVADO.

### Resolve
A pendência dos valores zerados: agora o pedido tem itens e valor real, que somam no
Controle de Carga e na Nova Entrega.

### Arquivos
- `backend/prisma/schema.prisma`, `backend/prisma/seed.ts`
- `backend/src/modules/produtos/{service,controller}.ts`
- `backend/src/modules/pedidos/{service,controller}.ts`
- `frontend/src/modules/logistica/pages/PedidosVenda.tsx`

---

## [2026-06-29] — Fluxo Nova Entrega: motorista 1º + soma do valor total

### O que mudou
- Modal "Nova Entrega" agora segue o fluxo: **1º escolhe o motorista**, depois clica
  nos pedidos do dia para incluir na rota dele.
- Bloqueio: enquanto não escolher motorista, clicar num pedido avisa "Escolha o motorista primeiro".
- Conforme clica nos pedidos, soma em tempo real: **Pedidos na rota**, **Frete total**
  e **VALOR TOTAL da entrega** (destaque verde no resumo e no rodapé).
- Modal carrega só os pedidos CONFIRMADOS **do dia da carga** (antes trazia todos).
- Botão "Roteirizar" só habilita com motorista escolhido + ao menos 1 pedido.

### Arquivos
- `frontend/src/modules/logistica/pages/ControleCarga.tsx`

---

## [2026-06-29] — Controle de Carga usa pedidos REAIS (fim do mock)

### O que mudou
- A grade do **Controle de Carga** não usa mais os 22 pedidos fictícios fixos.
- Agora carrega da API (`GET /pedidos`) só os pedidos da **data de carga** selecionada,
  com status CONFIRMADO / EM_SEPARACAO / SEPARADO / FATURADO.
- Trocar a data de carga recarrega a lista automaticamente; "Atualizar Lista" também.
- Cor da linha por status: faturado = verde (AurCarga Ok), separado = impresso, demais = impressão pendente.
- Mensagem amigável quando não há pedidos para a data.
- "Limpar a Grade" agora esvazia a grade (não recarrega o mock).

### Pendência conhecida
- Coluna **Peso** mostra 0,0 — o peso (Kg) informado no Pedido de Venda ainda não é
  persistido no backend (campo não existe no create). Corrigir em etapa futura.

### Arquivos
- `frontend/src/modules/logistica/pages/ControleCarga.tsx`

---

## [2026-06-29] — Tela de Clientes com edição (CRUD completo)

### O que mudou
- Nova tela **Clientes** (`/cadastros/clientes`) — antes era placeholder.
  - Lista os 399 clientes com busca (razão social / fantasia / CNPJ-CPF).
  - **Editar**: modal com todos os campos (tipo PF/PJ, CNPJ/CPF, razão social,
    nome fantasia, IE, telefone, celular, e-mail, contato/cargo, endereço completo,
    limite de crédito, prazo médio, situação ativo/inativo, observações).
  - **Novo Cliente** e **Excluir** (com confirmação).
  - Usa endpoints já existentes: GET/POST/PUT/DELETE `/clientes`.

### Arquivos
- `frontend/src/modules/cadastros/pages/Clientes.tsx` (novo)
- `frontend/src/App.tsx` (rota cadastros/clientes)

---

## [2026-06-29] — Frete sai do Pedido de Venda → só na Logística

### O que mudou
- **Valor Frete (R$)** e **Percentual (%)** removidos do modal "Novo Pedido de Venda".
  - Motivo: somente quem faz o **Controle de Carga** (logística) define o frete.
  - No lugar dos campos, aparece a nota: "O frete é definido no Controle de Carga (logística)."
  - Pedido agora é criado com `valorFrete: 0`; o valor é atribuído depois na roteirização.
- Limpeza: estado `valorFrete`/`percentual` e import `DollarSign` removidos (sem uso).

### Arquivos
- `frontend/src/modules/logistica/pages/PedidosVenda.tsx`

---

## [2026-06-28] — Pedidos de Venda + Carga só roteiriza

### O que mudou
- **Tela Pedidos de Venda** (`/logistica/pedidos`) — onde o comercial lança tudo:
  - Busca de clientes (399 do banco)
  - Campos: Data Entrega, Período, Tipo Faturamento, Peso (Kg), Volumes, Região
  - Valor Frete (R$), Percentual (%), Forma de Pagamento (Boleto/PIX/Dinheiro/Cartão/Cheque/Depósito/A Prazo)
  - Observações (PESAR, NOIVA, etc.)
  - Tabela com filtro por status (Rascunho/Confirmado/Separado/Faturado/Cancelado)
  - Botão Confirmar e Cancelar por pedido
- **Controle de Carga redesenhado** — agora é SÓ para roteirizar:
  - Modal "Roteirizar Pedidos" busca pedidos CONFIRMADOS do banco
  - Tabela com checkbox para selecionar múltiplos pedidos
  - Coluna direita com motoristas para atribuir
  - Botão "Roteirizar N Pedidos" move para a grade com motorista atribuído
  - NÃO tem mais campos de peso/frete/pagamento (isso vem do pedido)
- **Separação clara de responsabilidades**:
  - Comercial lança pedido em Pedidos de Venda → confirma
  - Logística roteiriza em Controle de Carga → atribui motorista

### Arquivos criados/modificados
- `frontend/src/modules/logistica/pages/PedidosVenda.tsx` — tela nova completa
- `frontend/src/modules/logistica/pages/ControleCarga.tsx` — modal reescrito para roteirização
- `frontend/src/App.tsx` — rota `/logistica/pedidos` conectada

---

## [2026-06-27] — Nova Entrega: Peso obrigatório + Frete + % + Pagamento

### O que mudou
- **Peso obrigatório**: campo destacado em vermelho quando vazio, bloqueia adição sem peso
- **Valor do Frete (R$)**: campo por cliente na barra de adição
- **Percentual (%)**: campo por cliente para comissão/markup
- **Forma de Pagamento**: dropdown por cliente (Boleto, PIX, Dinheiro, Cartão, Cheque, Depósito, A Prazo)
- **Lista acumulada** mostra todos os dados: peso, volumes, região, frete (tag azul), % (tag roxa), pagamento (tag cinza), tipo faturamento
- **Totais** incluem frete total acumulado
- Labels descritivos na barra de adição (Peso *, Vol)
- Erro inline quando tenta adicionar sem peso

### Arquivos modificados
- `frontend/src/modules/logistica/pages/ControleCarga.tsx`

---

## [2026-06-27] — Nova Entrega: múltiplos clientes na mesma rota

### O que mudou
- **Redesenho total do modal** em 3 colunas:
  - Coluna 1 (esquerda): Motorista fixo + Data/Período/Recebimento
  - Coluna 2 (centro): Busca de clientes + campos Peso/Volumes/Região por cliente
  - Coluna 3 (direita): Lista acumulada de entregas com totais
- **Fluxo**: seleciona motorista UMA VEZ → vai adicionando clientes em sequência
- Cada cliente adicionado: peso, volumes e região independentes
- **Lista acumulada** mostra todos os clientes já adicionados com X para remover
- **Totais em tempo real**: nº clientes, peso total, volumes, motorista
- **"Criar N Entregas"**: cria todos os pedidos de uma vez via API
- Clientes já adicionados aparecem em verde com "Adicionado" (não duplica)
- Badge no header: "3 clientes · 450.0Kg"
- Campos Peso e Região pré-preenchidos no formulário de cada cliente

### Arquivos modificados
- `frontend/src/modules/logistica/pages/ControleCarga.tsx` — modal reescrito (~300 linhas)

---

## [2026-06-27] — Modal Nova Entrega com motoristas SEMPRE visíveis

### O que mudou
- **Layout split na etapa 2**: coluna esquerda (dados) + coluna direita (motoristas)
- **Lista de motoristas sempre aberta** como radio buttons — 16 rotas visíveis
- Clique para selecionar, clique em outro para trocar — sem precisar de botão "Trocar"
- Motorista selecionado destaca em **azul escuro** com radio preenchido
- **Resumo do motorista** no rodapé da coluna direita (nome, veículo, rota, peso)
- Opção "Sem motorista (rotear depois)" no topo da lista
- Cada motorista mostra: nome, tipo veículo, peso carregado, entregas, nº rota
- VAN REFRIGERADA com ícone cyan diferenciado
- Modal mais largo (max-w-4xl) para acomodar as duas colunas

### Arquivos modificados
- `frontend/src/modules/logistica/pages/ControleCarga.tsx` — modal reescrito com layout split

---

## [2026-06-27] — Nova Entrega com Motorista/Rota integrado

### O que mudou
- **Modal Nova Entrega redesenhado** em 2 etapas:
  - Etapa 1: Busca e seleciona cliente (lista com avatar, busca em tempo real)
  - Etapa 2: Dados da entrega + atribuição de motorista/rota
- **Seleção de Motorista**: lista dos 16 motoristas reais com tipo de veículo, peso carregado e nº de entregas
  - ANDRE LUIZ CELESTINO (VAN)
  - ELTON DE OLIVEIRA (VAN REFRIGERADA ❄️)
  - GENIVAL BEZERRA (KOMBI)
  - MILTON SANTOS (VAN)
  - Etc.
- **Opção "Sem motorista"**: para rotear depois
- **Indicador de steps** (1 → 2) no header do modal
- **Botão "Voltar para clientes"** na etapa 2
- Motorista e rota selecionados aparecem na grade na coluna "Motorista" e "Rota"
- Campo de horário de recebimento adicionado
- Auto-detecção de região baseada na cidade do cliente

### Arquivos modificados
- `frontend/src/modules/logistica/pages/ControleCarga.tsx` — modal reescrito com motoristas

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
