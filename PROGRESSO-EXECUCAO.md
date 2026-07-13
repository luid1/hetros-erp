# PROGRESSO DE EXECUÇÃO — Hetros ERP

> **Para que serve este arquivo:** registro vivo do que já foi feito, do que está em andamento e do que falta.
> Se a execução for interrompida, **comece lendo a seção "▶️ ONDE PARAMOS"** e retome pelo próximo item `⏳`.
> O plano detalhado de cada frente está em **`ROADMAP-OPERACAO-COMPLETA.md`** (seções X.5 "Sequência de execução").

**Legenda:** ✅ feito · 🔄 em andamento · ⏳ a fazer (próximo) · ⏸️ adiado (atrás de flag) · ❌ bloqueado

**Última atualização:** 2026-07-11

---

## ▶️ ONDE PARAMOS

- **Concluído nesta rodada:** Fase 2 (modais do dashboard com listas reais) e a maior parte da **Frente E** (menu de contexto ⋮ + flyouts de submenu na sidebar). Roadmap 100% detalhado (todas as frentes com schema + passos).
- **Próximo item a executar (quando você autorizar código de backend):** **Frente A — passo A.5.2 (`seedPlanoContas`)**. ✅ Auditoria concluída: `PlanoContas` + `LancamentoFinanceiro` **já existem no schema** — Frente A **NÃO precisa de migration** e pode começar **sem parar o `nest --watch`**. **Aguardando seu "pode codar a Frente A".**
- **Regra de ouro:** nunca rodar `prisma migrate`/`npm run build` do backend com o `nest --watch` (start-hetros.bat) ativo — matar o node, rodar, subir `start:dev` de novo. `frontend: npx tsc --noEmit` é seguro a qualquer momento.

---

## Painel geral das frentes

| Frente | Tema | Status | Observação |
|---|---|---|---|
| Fase 2 | Modais do dashboard com listas reais | ✅ | Concluída |
| E | UX: menu ⋮ + flyouts de submenu | 🔄 | Base pronta + aplicada (Produtos + 5 hubs da sidebar); falta espalhar em mais tabelas |
| A | Plano de Contas + DRE real | ⏳ | **Próxima a codar** — detalhada em A.5. Auditado: models já existem, **sem migration** |
| B | Vendedor + comissão automática | ⏳ | Detalhada em B.5 |
| G | Tesouraria (contas/caixa) + conciliação | ⏳ | Detalhada em G.5 |
| I | Despesas recorrentes | ✅ | Concluída em I.5 |
| C | Pessoas + folha simples | ✅ | Concluída em C.5 |
| D | Diária/frete de motorista | ✅ | Concluída em D.5 |
| K | Notificações e alertas | ✅ | Concluída em K.3 |
| L | Relatórios avançados | ✅ | Concluída em L.2 |
| M | Devolução de compra + preço por tabela | ✅ | Roadmap M |
| F.1 | Selo "simulação" + persistir MDF-e/CT-e | ✅ | Roadmap F.1 |
| F.1b | Corrigir cálculo fiscal (regime/CST/CSOSN/FCP/origem) | ✅ | Roadmap F.1b |
| N | Qualidade (testes/backup/LGPD) | 🔄 | Transversal — `tsc` verde mantido a cada mudança |
| F.2 | SEFAZ real + certificado | ⏸️ | Atrás de flag (falta certificado A1) |
| F.2b | NFS-e / serviços | ⏸️ | Só se faturar serviço |
| O | PDV + NFC-e (modelo 65) | ⏸️ | Só se vender balcão |
| P | Contabilidade partida dobrada | ⏸️ | Base (`LancamentoFinanceiro`) já nasce na Frente A |
| Q | Importação direta (DI/DUIMP) | ⏸️ | Cenário (a): só marcar `Produto.origem = 2` |
| J | Obrigações acessórias + guias | ⏸️ | Desenhar com o contador; depende de A/F |
| H | Cobrança real (boleto/PIX/CNAB) | ⏸️ | Default: gateway Asaas quando ativar |

**Ordem de trabalho ativa:** A → B → G → I → C → D → K → L → M, com F.1b como bloco fiscal prioritário e N transversal.

---

## ✅ CONCLUÍDO — detalhe

### Fase 2 — Modais do dashboard com listas reais ✅
- `frontend/src/components/dashboard/DetalheModal.tsx` — carregamento sob demanda (`carregarLista`), skeleton, erro, vazio, lista clicável.
- `frontend/src/pages/DashboardPage.tsx` — `carregarLista` ligado a: Faturamento (NF-e), A Receber, A Pagar, Ruptura, Validade, Pedidos por status.
- Verificado: `tsc --noEmit` verde.

### Frente E — Menu de contexto + flyouts (parcial) 🔄
**Feito:**
- `frontend/src/components/ui/Menu.tsx` (NOVO) — menu ⋮ reutilizável via portal: clique para abrir, **submenu no hover**, itens com ícone/atalho/perigo/desabilitado/separador/título, reposiciona nas bordas, fecha com ESC/clique-fora.
- `frontend/src/modules/cadastros/pages/Produtos.tsx` — linha da tabela usa `Menu` (Editar · Copiar › Código/NCM/Cód.barras · Inativar). Função `copiar()` + clipboard.
- **Sidebar (`AppShell.tsx` + `config/telas.ts`)** — flyout de submenu ao passar o mouse, via portal, com permissão herdada e rota ativa. Campo `submenu` na fonte única `telas.ts`. Hubs com submenu:
  - Posição de Estoque → Movimentações · Inventário · Análise Estoque Físico
  - Gestão Fiscal → NF-e Emitidas · Painel de Faturamento
  - Faturamento → Matriz Fiscal · CT-e/MDF-e
  - DRE & Relatórios → Controladoria · Fluxo de Caixa · Contas a Receber · Contas a Pagar
  - Usuários & Acessos → Configurações · Logs de Auditoria
  - (Removido de Torre de Controle o "Controle de Carga" a pedido)
- Verificado: `tsc --noEmit` verde.

**Falta (⏳) na Frente E:**
- [ ] Espalhar o `Menu` ⋮ nas demais tabelas: Clientes, Fornecedores, Transportadoras, Filiais, Pedidos.
- [ ] `Menu` acionável por **clique-direito** na linha (context menu) além do ⋮.
- [ ] Ações mais ricas por contexto (Pedidos: Faturar/Cancelar/Ver NF-e; Financeiro: Baixar/Ver origem) — algumas dependem de endpoints das frentes financeiras.
- [ ] Popover/HoverCard de **resumo** ao passar o mouse (ex.: produto → saldo por lote; cliente → limite/títulos).

---

## ⏳ A FAZER — checklist granular (marque conforme avança)

> Referência completa (schema + explicação) em `ROADMAP-OPERACAO-COMPLETA.md`, seção da frente.

### Frente A — Plano de Contas + DRE (A.5)
- [x] A.1 — **auditado: já existe no schema.** `PlanoContas` (~1098: `id, tenantId, codigo, descricao, tipo=TipoLancamento, nivel, pai (String código), analitica, ativo`) e `LancamentoFinanceiro` (~1182, já com `planoContasId`). **NÃO precisa de migration** — usar `descricao` (não `nome`), `tipo=TipoLancamento` (não `TipoConta`), `pai` como código String. Frente A pode começar **sem parar o `nest --watch`**.
- [x] A.2 — `seedPlanoContas(tenantId)` idempotente (grupo 3.x) + const `CONTA` (códigos semânticos) em `plano-contas.seed.ts`; lazy-seed no `findAll`.
- [x] A.3 — módulo `plano-contas` (service CRUD + `lancar`/`estornar`/`despesasPorConta`, controller com guard `FINANCEIRO:CONFIGURAR`, bloqueios de conta não-analítica / com lançamento); registrado no `app.module.ts`.
- [x] A.4 — `contas-pagar` aceita `planoContasCodigo` → lança despesa no razão (competência) na criação e estorna no cancelamento (idempotente por tag `ORIGEM=CP:<id>`). Entrada de compra não carimba (evita duplicar CMV).
- [x] A.5 — `dre.service.ts` usa `despesasPorConta()`: blocos Despesas Operacionais/Financeiras (drill-down) + Outras Receitas + Resultado Líquido + margem líquida.
- [x] A.6 — frontend: `financeiroApi.planoContas.*`; tela **Plano de Contas** (`PlanoContas.tsx` + rota `/financeiro/plano-contas` + menu); selector de categoria no modal "Nova despesa" (`ContasPagar.tsx`); DRE (`FinancialHub.tsx`) com novos KPIs + linhas com drill-down (`LinhaDre`).
- [ ] A.7 — verificação (critérios A.4): lançar "Aluguel R$3.000" aparece no DRE; sem regressão no fluxo compra→venda.

### Frente B — Vendedor + comissão (B.5)
- [x] schema `Vendedor`/`Comissao` (+ enum `StatusComissao`) + `vendedorId`/`percentualComissao` em Pedido. `prisma validate` verde. **Migration pendente** (aguarda parar o `nest --watch`).
- [x] módulo `vendedores` (CRUD, guard `FINANCEIRO:CONFIGURAR`, soft-delete).
- [x] Pedido: seletor de vendedor + % no passo Pagamento (auto-preenche % padrão); DTO/service gravam `vendedorId`/`percentualComissao`.
- [x] módulo `comissoes`: listener `nfe.emitida` → cria `Comissao` PENDENTE (idempotente por `@@unique[tenantId,nfeId,vendedorId]`, base = subtotal − desconto).
- [x] listener `nfe.cancelada` → `updateMany` PENDENTE → CANCELADA.
- [x] `POST /comissoes/fechar` → agrupa PENDENTE por vendedor → `ContasPagar.create` (categoria `CONTA.COMISSOES` = 3.4.03) + marca FECHADA/contaPagarId.
- [x] frontend: telas **Vendedores** e **Comissões** (+ rotas/menu), `vendedoresApi`/`comissoesApi`. Card dashboard: pendente.
- [x] migration `20260712000000_frente_b_vendedor_comissao` aplicada (migrate deploy, gerada via `migrate diff` por ambiente não-interativo) + `prisma generate` + `tsc --noEmit` backend **verde** + backend reiniciado (rotas `/vendedores` e `/comissoes` mapeadas). ✅ **Frente B concluída.**

### Frente G — Tesouraria (G.5) ✅ CONCLUÍDA
- [x] schema `ContaFinanceira`/`MovimentoCaixa`/`ExtratoBancario`/`ItemExtrato` (+ enums `TipoContaFinanceira`/`TipoMovimento`/`OrigemMovimento`); migration `20260712010000_frente_g_tesouraria` aplicada + `generate` + backend `tsc` verde + rotas `/tesouraria/*` mapeadas.
- [x] módulo `tesouraria` (CRUD contas c/ saldo incremental, `registrarMovimentoTx` como ponto único de caixa, avulso, transferência entre contas).
- [x] baixa de título aceita `contaId` opcional → gera `MovimentoCaixa` (ENTRADA no receber, SAIDA no pagar) e atualiza saldo dentro da mesma tx (retrocompatível: sem `contaId` não movimenta caixa).
- [x] conciliação OFX: importação idempotente por `fitId` + auto-conciliação por valor/data (±3d) + conciliação manual (vincula ou cria AJUSTE).
- [x] frontend: tela **Tesouraria** (abas Contas & Saldos / Movimentos / Conciliação), KPIs de saldo consolidado, modais Nova Conta / Transferência / Lançamento avulso / Importar OFX (parser client-side), seletor de conta nas baixas de Receber/Pagar. `tsc` front verde.

### Frente I — Despesas recorrentes (I.5) ✅ CONCLUÍDA
- [x] schema `DespesaRecorrente` (periodicidade, diaVencimento, valorVariavel, proximaGeracao, ultimoPeriodoGerado como chave de idempotência); enum `PeriodicidadeRecorrencia`; migration `20260712030000_frente_i_recorrencias` (diff+deploy).
- [x] módulo `recorrencias` (CRUD + `preview` das próximas ocorrências).
- [x] scheduler interno (setInterval 1h + varredura ~30s após boot; sem dependência de @nestjs/schedule) + `POST /recorrencias/gerar` manual → gera Conta a Pagar via `ContasPagarService.create` com categoria do plano; **idempotente** por `ultimoPeriodoGerado` (chave AAAA-MM-DD); valor variável → rascunho (placeholder mínimo p/ ajuste). Avança `proximaGeracao` respeitando dia de vencimento (clamp ao último dia do mês).
- [x] frontend: tela **Despesas Recorrentes** (KPIs ativas/estimativa mensal/vencidas, tabela com status, pausar/reativar, modal criar/editar com categoria+fornecedor, modal preview das próximas 6, botão "Gerar agora"). `recorrenciasApi` + rota + menu. `tsc` back verde.

### Frente C — Pessoas + folha (C.5)
- [x] schema `Funcionario`/`Folha`/`ItemFolha` + enums (`StatusFuncionario`/`StatusFolha`/`TipoItemFolha`); migration `20260712040000_frente_c_d_...` (diff+deploy).
- [x] módulo `pessoas` (CRUD `funcionarios`; desliga em vez de excluir se já usado em folha).
- [x] módulo `folha` (competência única; itens provento/desconto; `gerar-padrao` semeia salário-base dos ativos; **fechar** → 1 Conta a Pagar por funcionário no **líquido**, categoria `CONTA.SALARIOS` 3.4.01; **reabrir** cancela as contas geradas estornando o DRE; totais recalculados).
- [x] frontend: **Funcionários** (CRUD + KPIs) e **Folha** (master-detail: itens, gerar salários, fechar/reabrir). `recorrenciasApi`/`pessoasApi`/`folhaApi` + rotas + menu. `tsc` front verde.

### Frente D — Diária motorista (D.5) ✅ CONCLUÍDA
- [x] schema `PagamentoMotorista` (`@@unique(tenant,routeId)` p/ idempotência) + enum `StatusPagamentoMotorista`; migration junto de C.
- [x] listener `@OnEvent('rota.concluida')` (emitido pelo `DeliveryConfirmationService` ao fechar a rota) cria pagamento **PENDENTE**; `POST /pagamentos-motorista/sincronizar` cobre rotas já concluídas. **Aprovar** → Conta a Pagar (`CONTA.FRETE_MOTORISTA` 3.4.04) + status A_PAGAR; **cancelar** estorna a conta. Idempotente.
- [x] frontend: **Diárias de Motorista** (KPIs, filtro por status, aprovar com valor+vencimento, cancelar, sincronizar rotas, criar manual). `pagamentosMotoristaApi` + rota + menu. `tsc` front verde.
- [x] verificação: backend `tsc` verde, boot mapeia `/funcionarios`, `/folha`, `/pagamentos-motorista`.

### Frente K — Notificações e alertas (K.3) ✅ CONCLUÍDA
- [x] schema `Notificacao` (+ enums `TipoNotificacao`/`SeveridadeNotificacao`; alvo por `usuarioId` pessoal ou broadcast filtrado por `permissao`; idempotência via `@@unique[tenantId, chaveDedup]`); migration `20260712162931_frente_k_notificacoes` (diff+deploy).
- [x] módulo `notificacoes`: `emitir()` idempotente (dedup por chave), listar/contar-não-lidas/marcar-lida/marcar-todas/remover, filtro de broadcast por permissão do usuário (ADMIN vê tudo).
- [x] **geradores automáticos** (scheduler interno setInterval 1h + varredura ~40s após boot; sem @nestjs/schedule) + `POST /notificacoes/gerar` manual: títulos a pagar/receber vencendo (≤3d) ou vencidos, estoque abaixo do mínimo (agrega `EstoqueSaldo` vs `Produto.estoqueMinimo`), validade próxima de lotes com saldo (≤15d). Dedup diário/por-vencimento evita spam.
- [x] frontend: **sino** (`NotificacoesSino.tsx`) no topo (badge de não-lidas com polling 60s, dropdown via portal, marcar lida/todas, navegação pelo `link`, severidade com ícone/cor). `notificacoesApi` no `api.ts`. `tsc` back+front verde; boot mapeia `/api/v1/notificacoes`.

### Frente L — Relatórios gerenciais (L.2) ✅ CONCLUÍDA
- [x] módulo `relatorios` (somente leitura — **sem migration**): `curvaABC` (produto/cliente, Pareto 80/95, com classe A/B/C + resumo), `giroEstoque` (consumo SAIDA_VENDA vs saldo, giro anualizado, cobertura em dias, itens parados), `ranking` (vendedor/cliente/produto por faturamento + ticket médio), `agingFinanceiro` (a receber vs a pagar por faixa: a vencer, 1–30, 31–60, 61–90, 90+). Base de venda = pedidos FATURADO/ENTREGUE por `dataEmissao`.
- [x] controller `GET /relatorios/{curva-abc,giro-estoque,ranking,aging-financeiro}` (filtros de período + filialId); registrado no `app.module.ts` (hot-reload mapeou `/api/v1/relatorios`).
- [x] frontend: tela **Relatórios Gerenciais** (`gerencial/pages/Relatorios.tsx`) com 4 abas, KPIs, filtros de período/dimensão, tabelas e **exportação CSV** (BOM + `;` p/ Excel pt-BR). `relatoriosApi` no `api.ts`, rota `/gerencial/relatorios` no App.tsx e item no menu (`telas.ts`). `tsc` back+front verde.

### Frente M — Devolução de compra + precificação por tabela ✅ CONCLUÍDA
- [x] **migration** `frente_m_devolucao_precificacao` (aplicada via `migrate diff`+`deploy`): `DevolucaoCompra` + `ItemDevolucaoCompra` (vínculo por `entradaId` String, sem FK p/ evitar churn) e `PrecoTabela` (unique `[tenantId,produtoId,tabela]`, com promoção por período `promoAtiva/promoPreco/promoInicio/promoFim`).
- [x] **M.1 devolução de compra** (`devolucoes-compra`): `POST /devolucoes-compra` resolve custo (dto → item da entrada → `precoCusto`), baixa estoque via `estoque.baixarFefo` com `SAIDA_DEVOLUCAO_FORNECEDOR` (FEFO, lote preferido), e **ajusta o Contas a Pagar da entrada**: cancela se a devolução cobre o saldo, senão reduz `valorOriginal` proporcionalmente (seguro no DRE pois o CP da entrada não carrega lançamento). Numeração sequencial atômica (`proximoNumero`). `GET` lista/detalha com nome do fornecedor.
- [x] **M.2 motor de precificação** (`precificacao`): `resolverPreco/resolverLote` com precedência **promoção vigente > preço da tabela do cliente > `Produto.precoVenda`**, retorna origem + margem sobre custo + flag `abaixoMargem`. CRUD de `PrecoTabela` (`GET/POST /precificacao/tabelas`, `DELETE /precificacao/tabelas/:id`, `GET /precificacao/resolver`, `POST /precificacao/resolver-lote`). **Integrado ao `PedidosService.montarItensETotais`**: item sem `precoUnitario` (ou 0) puxa automaticamente o preço da tabela do cliente.
- [x] frontend: **Tabelas de Preço** (`cadastros/pages/TabelasPreco.tsx` — CRUD com busca de produto, tabela A/B/Especial, preço, promoção por período, coluna de margem) e **Devoluções ao Fornecedor** (`estoque/pages/DevolucoesCompra.tsx` — filial/fornecedor, prefill opcional pela entrada de origem, itens com custo, total). `precificacaoApi`/`devolucoesCompraApi`/`entradasApi` no `api.ts`; rotas `/cadastros/tabelas-preco` e `/wms/devolucoes-compra` no App.tsx; itens no menu (`telas.ts`). `tsc` back+front verde; boot mapeou `/api/v1/precificacao` e `/api/v1/devolucoes-compra`.

### Frente F.1 — Selo "simulação" + persistir MDF-e/CT-e ✅ CONCLUÍDA
- [x] **Selo reutilizável** `components/ui/SeloSimulacao.tsx` (variantes `banner`/`chip`, texto "MODO SIMULAÇÃO — sem valor fiscal", ícone `FlaskConical`), aplicado nas 3 telas fiscais: **Faturamento** (substituiu o aviso âmbar solto), **NF-e Emitidas** e **CT-e/MDF-e** — deixa explícito que nada é transmitido à SEFAZ.
- [x] **MDF-e/CT-e agora persistidos no backend** (antes 100% mock em `localStorage`): migration `20260712181019_f1_documentos_transporte` com model `DocumentoTransporte` (enums `TipoDocTransporte` MDFE/CTE, `StatusDocTransporte` ABERTO/ENCERRADO/CANCELADO; `nfesJson`, `serie`, `simulacao=true` para a futura F.2, numeração sequencial atômica por filial+tipo).
- [x] **backend** `fiscal/documentos-transporte.service.ts` + `.controller.ts` (`GET /documentos-transporte`, `POST`, `PATCH :id/status`) registrados no `FiscalModule`. Validações: placa obrigatória, MDF-e exige ≥1 NF-e, bloqueia mudança de status em documento CANCELADO.
- [x] **frontend** `documentosTransporteApi` no `api.ts`; `CteMdfe.tsx` migrado de `localStorage` → API (list/create/atualizarStatus), estado `salvando`, botão "Emitir (simulação)". `tsc` back+front verde; boot mapeou `GET/POST /api/v1/documentos-transporte` e `PATCH /:id/status` + "Nest application successfully started".

### Frente F.1b — Cálculo tributário por regime + validações ✅ CONCLUÍDA
> Bloco fiscal obrigatório antes de qualquer emissão real (F.2): emitir com imposto errado é passivo fiscal.
- [x] **migration `20260712184908_f1b_fcp_fiscal`** (aplicada): FCP em `RegraFiscal` (`aliquotaFcp`, `aliquotaFcpSt`, `pisCumulativo Boolean?` p/ forçar apuração), colunas de FCP por item em `ItemNFe` (`baseCalcFcp`/`aliquotaFcp`/`valorFcp`/`valorFcpSt`) e total `NFe.valorFcp`.
- [x] **validadores fiscais** `backend/src/common/utils/fiscal-validators.util.ts` (puros): `validarCnpj`/`validarCpf`/`validarCnpjCpf` (dígito verificador), `validarIE` por UF (SP/RJ/MG/PR/RS com DV; demais UFs tolerante por tamanho; aceita "ISENTO"), `validarNcm` (8 díg.), `validarCest` (7), `validarCfop` (4, 1º díg 1-7), `validarEan` (GTIN-8/12/13/14 com checksum, aceita "SEM GTIN"), `isCsosn`/`isCstIcms`.
- [x] **motor `fiscal.service.ts` — regime-aware**: `calcularItem` recebe o regime da filial e aplica **CSOSN (Simples) × CST (Regime Normal)** com correção automática de mismatch; ICMS só é destacado em CSOSN 101/201 (Simples) ou CST 00/10/20/70/90 (Normal); calcula **FCP próprio + FCP-ST**; **PIS/COFINS cumulativo** (Presumido 0,65%/3,0%) × **não-cumulativo** (Real 1,65%/7,6%) × **Simples** (0% destacado, CST 49) — flag `pisCumulativo` da regra força a apuração. `calcularPedido` lê `filialOrigem.regimeTributario` (via `normalizarRegime`), soma FCP nos totais e devolve `contexto.regime`. `ImpostoItem` ganhou os campos de FCP + `regime`/`apuracaoPisCofins` (auditoria).
- [x] **checklist anti-erro `validarFaturamento`**: CNPJ/CPF do cliente **e da filial emitente** validados por dígito verificador (BLOQUEIO), IE conferida por UF (AVISO), NCM (8 díg.) e CFOP (formato) validados, regime tributário da filial sinalizado. `sanitize` da matriz fiscal inclui as novas alíquotas de FCP.
- [x] **persistência** `nfe/nfe.service.ts`: a NF-e gerada grava FCP (total + por item).
- [x] verificação: `tsc --noEmit` back+front verde; migration aplicada + `prisma generate`; boot "Nest application successfully started" sem erro.

### Frente seguinte — ver roadmap
- Próximo bloco fiscal: **F.2** (SEFAZ real, atrás de flag — exige certificado A1). Demais adiados abaixo.

---

## ⏸️ ADIADO (atrás de flag — reativar quando confirmar o gatilho)
- **F.2 / F.2b** — SEFAZ real + NFS-e → precisa certificado digital A1 / faturar serviço.
- **O** — PDV + NFC-e → só se vender no balcão.
- **P** — contabilidade partida dobrada → base já nasce na Frente A.
- **Q** — importação direta (DI/DUIMP) → hoje cenário (a): só marcar `Produto.origem = 2`.
- **J** — obrigações acessórias/guias → desenhar com o contador.
- **H** — cobrança real → gateway Asaas quando ativar.

---

## 📓 Log de execução (mais recente no topo)

- **2026-07-11** — Auditoria de cobertura do roadmap. Confirmado que nenhuma área de negócio existente ficou de fora. Correção importante: `PlanoContas`, `LancamentoFinanceiro` e `HistoricoFinanceiro` **já existem** no `schema.prisma` — Frente A **não precisa de migration**. Também: `MDFe` não existe (só `CTe`, hoje mock/localStorage); `Route` já tem `motoristaId` (migration da Frente C é mais leve que o descrito). A.5 do roadmap e este arquivo atualizados.

- **2026-07-11** — Roadmap detalhado por completo (seções X.5 com schema Prisma + passos para A, B, C, D, G, I). Adicionadas "Recomendações do implementador" (defaults reversíveis p/ as 14 decisões). Criado este arquivo de progresso.
- **2026-07-11** — Frente E: `Menu.tsx` (novo), aplicado em Produtos; flyouts de submenu na sidebar (5 hubs) via `telas.ts` + `AppShell.tsx`; removido "Controle de Carga" da Torre. `tsc` verde.
- **2026-07-11** — Fase 2 concluída: `DetalheModal` + `DashboardPage` com listas reais sob demanda. `tsc` verde.
