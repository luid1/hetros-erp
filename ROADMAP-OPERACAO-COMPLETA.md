# Hetros ERP — Roadmap da Operação Completa

> Documento-mestre de tudo que falta para o Hetros ERP cobrir o ciclo operacional
> **e financeiro** inteiro, sem gambiarras. Escrito para ser executado frente a frente.
> Cada frente é independente e reaproveita o que já existe (Contas a Pagar, DRE,
> DetalheModal, eventos de domínio).
>
> Legenda de status atual: ✅ existe e funciona · ⚠️ existe parcial / com buraco · ❌ não existe
>
> Regra de ouro deste roadmap: **nada de mock disfarçado de real**. Quando algo for
> simulação (ex.: emissão fiscal), o sistema deve deixar explícito na tela.

---

## 0. Retrato atual (baseline) — para nunca esquecermos de onde partimos

**Núcleo logístico (forte):**
- ✅ Estoque/WMS: saldo, lotes, validade, movimentações, a-comprar, alertas.
- ✅ Pedidos: máquina de estados RASCUNHO→CONFIRMADO→EM_SEPARACAO→SEPARADO→FATURADO→ENTREGUE.
- ✅ NF-e: geração + "emissão" (cálculo real de impostos e chave, **sem transmitir à SEFAZ**).
- ✅ Rotas/logística: otimização, app do motorista, confirmação de entrega com GPS/foto/assinatura.
- ✅ Contas a Pagar / Receber: criação manual + automática por evento (entrada de compra → pagar; nfe.emitida → receber).
- ✅ Dashboard com KPIs clicáveis + modais de detalhe (Fase 1 e Fase 2 concluídas).

**Financeiro / pessoas (fraco — foco deste roadmap):**
- ⚠️ Despesas do dia a dia (aluguel, luz, material, salário): dá para lançar manual, mas **sem categoria**, então **não entram no DRE**. O lucro exibido hoje é otimista.
- ⚠️ Plano de Contas: model `PlanoContas` existe no schema, mas **não é alimentado** pelo fluxo. `LancamentoFinanceiro.planoContasId` é nullable e fica vazio.
- ❌ Folha de funcionários: não há model de funcionário/salário. `Usuario` é só login.
- ❌ Vendedor + comissão: `Pedido` guarda `usuarioId` (quem digitou), **não** quem vendeu. Sem % nem cálculo.
- ⚠️ Motorista: só um **nome** string em `Romaneio`/`Veiculo` e FK `motoristaId` em `Route`. Sem diária/pagamento.
- ⚠️ MDF-e / CT-e (tela "Simular Manifesto"): **100% mock em localStorage**, não persiste no backend.

**Objetivo do roadmap:** fechar o ciclo do dinheiro (para onde ele vai) sem quebrar o núcleo logístico, e profissionalizar a UX.

### 0.1 — Já existe e funciona (confirmado em auditoria — NÃO reconstruir)

Para não desperdiçar esforço reimplementando o que já está pronto:
- ✅ **Entrada de mercadoria por XML de compra** (`EntradaMercadoria`, `POST /entradas`): XML parseado no front, backend cria entrada + lote/validade + movimentação `ENTRADA_COMPRA` + vincula OC + gera Contas a Pagar.
- ✅ **Devolução de VENDA** (`POST /nfe/:id/devolucao` + `/emitir`): NF-e de devolução (finalidade 4), reentrada de estoque (`ENTRADA_DEVOLUCAO`), cancela contas a receber da nota original; total ou parcial.
- ✅ **Inventário/balanço físico** (`modules/inventario`): abrir (congela saldo) → contar → fechar (gera ajustes em massa com tipo: diferença, perda validade, avaria, roubo, quebra).
- ✅ **Limite de crédito do cliente** (`Cliente.limiteCredito` + `analisarCredito()` em pedidos): bloqueia pedido por duplicata vencida/limite excedido (`bloqueioCredito`/`motivoBloqueio`).
- ✅ **Auditoria/logs** (`AuditLog`: modulo, acao, entidade, dadosAntes/Depois, usuario, ip, userAgent) + `HistoricoFinanceiro` (trilha de status/valores).
- ✅ **DRE por competência** (data de emissão) + **Fluxo de Caixa por regime de caixa** (data de pagamento) — os dois regimes já coexistem corretamente.
- ✅ **Segurança de senha**: hash `bcryptjs` (12 rounds) + JWT.
- ⚠️ **Precificação**: `Produto` tem `precoVenda/precoCompra/precoCusto/margemMinima`, `Cliente.tabelaPreco` (string) e model `Cotacao` (histórico). Mas **não há motor** que aplique tabela/cliente automaticamente — preço é estático e sobreposto no item do pedido (ver Frente P).

### 0.2 — Buracos reais confirmados (endereçados nas novas Frentes G–N)

- ❌ **Tesouraria**: não há `ContaBancaria`/`Caixa`. A baixa de título só marca "pago" — **o dinheiro não entra em conta nenhuma**, não há saldo bancário. (Frente G)
- ❌ **Conciliação bancária** (OFX/CNAB). (Frente G)
- ⚠️ **Cobrança**: só campos vazios (`linkBoleto`, `pixCopiaECola`, `gatewayId`) + boleto/pix **fake**. Sem CNAB remessa/retorno nem PIX QR dinâmico real. (Frente H)
- ❌ **Despesas recorrentes** (aluguel/assinatura todo mês): só parcelamento manual, sem recorrência automática. (Frente I)
- ❌ **Obrigações acessórias** para o contador: sem SPED Fiscal/Contribuições, EFD, SINTEGRA, nem exportação de XMLs. (Frente J)
- ❌ **Guias de imposto**: sem DAS (Simples), DARF, apuração de ICMS-ST a recolher. (Frente J)
- ⚠️ **Notificações**: há cálculo de alerta (validade, estoque mínimo) mas **sem canal de entrega** (e-mail/push/in-app). (Frente K)
- ❌ **Relatórios avançados**: sem curva ABC, giro de estoque, ranking, posição financeira detalhada. (Frente L)
- ❌ **Devolução de COMPRA** (devolver ao fornecedor): enum `SAIDA_DEVOLUCAO_FORNECEDOR` existe no schema mas sem serviço/endpoint. (Frente M)
- ❌ **Backup automático** e **testes automatizados** (só 2 arquivos hoje) — risco de confiabilidade. (Frente N)

### 0.3 — Matriz de conformidade fiscal brasileira (auditada no código)

Retrato PRECISO do que o motor fiscal (`fiscal.service.ts` + `RegraFiscal`) faz hoje, para não prometer o que já existe nem esquecer o que falta:

| Tributo / recurso | Status | Onde / o que falta |
|---|---|---|
| ICMS próprio (base, alíquota) + **redução de base** | ✅ Existe | `RegraFiscal.aliquotaIcms`, `reducaoBaseIcms` |
| **ICMS-ST** (MVA, base ST, ICMS-ST) | ✅ Existe | `temSt`, `mvaSt`, `aliquotaIcmsSt` |
| **DIFAL** interestadual (consumidor final) | ✅ Existe | `temDifal`, `valorDifal` |
| **IPI** (CST, alíquota) | ✅ Existe | `cstIpi`, `aliquotaIpi` |
| **PIS/COFINS** | ⚠️ Parcial | Calcula por CST, mas **sem distinguir cumulativo × não-cumulativo** (muda conforme regime) |
| **FCP e FCP-ST** (Fundo Combate à Pobreza) | ❌ Falta | Obrigatório em vários estados junto do ICMS/ST → Frente F |
| **ISS** / serviços / **NFS-e** | ❌ Falta | Se a empresa presta serviço (frete, etc.) → Frente F/O |
| **Retenções** (IRRF, INSS, ISS, PIS/COFINS/CSLL) | ❌ Falta | Comuns em serviços/PJ → Frente F + EFD-Reinf (J) |
| **Imposto Seletivo (IS)** da reforma | ⚠️ Só sinaliza | `tipoAliquotaReforma='SELETIVA'` marca pendência, **não calcula** → Frente F |
| **CST × CSOSN por regime** | ⚠️ Parcial | Campo `cstIcms` único; **não escolhe automático** CSOSN (Simples) vs CST (Normal) → Frente F |
| **Regime tributário no cálculo** | ⚠️ Parcial | `Tenant/Filial.regimeTributario` existe mas **nunca é consultado** no cálculo → Frente F |
| Produto: NCM, CEST, origem, CFOP, un. tributável, EAN | ✅ Existe | Falta só **validação de formato** (EAN-13, NCM 8 díg.) |
| CFOP por operação (interno/interestadual/devolução) | ✅ Existe | — |
| Cadastro fiscal (CNPJ, IE, IM, CRT, regime, série) | ✅ Existe | Falta **CNAE**; série via tabela `Sequencia` |
| Validação de dígito **CNPJ/CPF/IE** | ❌ Falta | Aceita string qualquer → Frente F (barato e importante) |
| **Certificado digital A1/A3** | ❌ Falta | Sem upload/validade/senha → pré-requisito da emissão real (F) |
| **NFC-e (modelo 65)** consumidor | ❌ Falta | Enum `TipoDFe.NFCE` e `modelo` existem, lógica não → Frente O |
| **CC-e** (carta de correção) | ✅ Existe | — |
| **Devolução** de venda (NF-e fin. 4) | ✅ Existe | — |
| **Inutilização** de numeração | ❌ Falta | Status `INUTILIZADO` existe, nunca acionado → Frente F |
| **Manifestação do destinatário / Distribuição DF-e** | ❌ Falta | Baixar XML que fornecedores emitem contra seu CNPJ → Frente F |
| **MDF-e / CT-e** | ⚠️ Mock | localStorage; CT-e model 57 iniciado → Frente F |
| **Reforma IBS/CBS** | ✅ Existe | Módulo `fiscal-reforma` calcula; IS pendente |

> **Leitura executiva:** o motor cobre bem a **NF-e modelo 55 de mercadoria (B2B)**. As lacunas fiscais são: (1) **regime não entra no cálculo** e **CST/CSOSN não é automático** — risco de destaque errado; (2) **FCP, ISS/serviços, retenções e IS**; (3) **emissão real** (certificado + SEFAZ) e documentos auxiliares (NFC-e, DF-e, inutilização); (4) **todas as obrigações acessórias** (SPED etc.). Tudo isso está endereçado nas Frentes F, J, O e P.

---

## Ordem recomendada de execução (por retorno x esforço)

1. **Frente A — Plano de Contas + Despesas categorizadas no DRE** (base de tudo; torna o lucro real).
2. **Frente B — Vendedor no pedido + comissão automática** (resolve a dor direta de "pagar vendedor pela nota").
3. **Frente C — Cadastro de pessoas pagáveis (funcionários e motoristas) + folha simples**.
4. **Frente D — Diária/frete de motorista por rota**.
5. **Frente E — UX: popovers e menus de contexto reutilizáveis**.
6. **Frente F — Fiscal real (SEFAZ) + MDF-e/CT-e persistidos** (só quando for operar valendo).

> As Frentes A→D são o coração financeiro. E pode entrar em paralelo (é UI). F é a mais pesada e fica por último por depender de certificado/integrador e homologação.

## Esforço, risco e impacto (para priorizar com clareza)

| Frente | Impacto no negócio | Esforço | Risco técnico | Depende de |
|---|---|---|---|---|
| A — Plano de Contas + DRE | 🔥 Altíssimo (lucro real) | Médio | Baixo (models já existem) | — |
| B — Vendedor + comissão | 🔥 Alto (dor direta) | Médio | Baixo (reusa evento nfe.emitida) | A |
| C — Pessoas + folha simples | Alto | Médio-alto | Médio (migrar motorista string→FK) | A |
| D — Diária de motorista | Médio | Baixo-médio | Baixo | A, C |
| E — UX popovers/menus | Médio (produtividade) | Baixo | Baixo | — |
| F — Fiscal real (SEFAZ) | Alto (obrigatório p/ operar valendo) | Alto | Alto (certificado, homologação) | — |
| G — Tesouraria (contas/caixa) + conciliação | 🔥 Altíssimo (saber quanto tem em caixa) | Médio-alto | Médio | A |
| H — Cobrança real (boleto/PIX/CNAB) | Alto | Alto | Alto (integração bancária) | G |
| I — Despesas recorrentes | Alto (aluguel/luz automáticos) | Baixo | Baixo | A |
| J — Obrigações acessórias + guias | Alto (obrigação legal) | Alto | Alto (envolver contador) | A, F |
| K — Notificações/alertas | Médio | Baixo-médio | Baixo | — |
| L — Relatórios avançados | Médio-alto | Médio | Baixo | A, B |
| M — Devolução compra + preço por tabela | Médio | Baixo-médio | Baixo | — |
| N — Qualidade (testes/backup/LGPD) | 🔥 Alto (confiabilidade) | Médio (contínuo) | Baixo | transversal |
| O — PDV + NFC-e (modelo 65) | Alto **se vende balcão** / senão opcional | Alto | Médio | F, G |
| P — Contabilidade partida dobrada + livros | Alto (base p/ ECD/ECF) | Alto | Médio | A |
| Q — Importação de mercadoria | Baixo-médio (só p/ itens importados) | Médio | Médio (DI/DUIMP, câmbio, rateio de custo) | F.1b, G |

> Melhor relação valor/esforço para começar: **A + B**, com **G** e **I** logo em seguida (fecham de verdade "para onde vai / de onde sai o dinheiro" e automatizam as despesas fixas). **N** roda em paralelo o tempo todo. **F.1** (selo "modo simulação" + persistir MDF-e/CT-e) é um quick win a qualquer momento.

> ⚠️ **Antes de qualquer emissão fiscal real (F.2), a Frente F.1b é obrigatória** — corrigir regime no cálculo, CST×CSOSN, FCP, PIS/COFINS cumulativo/não-cumulativo e validações. Emitir com imposto errado é passivo fiscal.

> **Sequência sugerida completa:** A → B → G → I → C → D → K → L → M → P → E (paralelo) → H → **F.1b → F.2** → J → O (se balcão) → **Q (se/quando começar a importar direto)**. Com **N (qualidade) transversal do início ao fim**.
>
> **Nota sobre Q:** enquanto você **só compra de importador nacional** (a mercadoria já entrou no Brasil por outro), Q é praticamente só marcar `Produto.origem` corretamente — nada a construir. Q vira trabalho de verdade **apenas se/quando você importar direto** (DI/DUIMP em seu nome). Depende de F.1b (motor de cálculo por regime já correto) e G (tesouraria, p/ pagar câmbio/impostos de importação).

---

# FRENTE A — Plano de Contas + Despesas categorizadas no DRE

**Por que primeiro:** enquanto luz/aluguel/salário/comissão não descontam de lugar nenhum, o DRE mente. Esta frente é a fundação: cria a linguagem de categorias que todas as outras frentes vão usar.

## A.1 — Backend: Plano de Contas utilizável

Arquivos: `backend/prisma/schema.prisma`, novo módulo `backend/src/modules/plano-contas/`, `backend/src/modules/dre/dre.service.ts`.

1. **Semear (seed) um plano de contas padrão** para cada tenant no onboarding, hierárquico (nível 1 grupo, 2 subgrupo, 3 analítica). Sugestão de estrutura mínima:
   - `3` DESPESAS (grupo)
     - `3.1` Despesas Administrativas → `3.1.01` Aluguel, `3.1.02` Energia elétrica, `3.1.03` Água, `3.1.04` Internet/Telefone, `3.1.05` Material de escritório (folhas, grampeador…), `3.1.06` Contabilidade/Honorários, `3.1.07` Software/Assinaturas.
     - `3.2` Despesas com Pessoal → `3.2.01` Salários, `3.2.02` Encargos (INSS/FGTS), `3.2.03` Benefícios (VT/VR), `3.2.04` Pró-labore.
     - `3.3` Despesas Comerciais → `3.3.01` Comissões de vendedores, `3.3.02` Marketing/Publicidade, `3.3.03` Fretes de venda.
     - `3.4` Despesas Logísticas → `3.4.01` Diária de motorista, `3.4.02` Combustível, `3.4.03` Manutenção de veículos, `3.4.04` Pedágio.
     - `3.5` Despesas Financeiras → `3.5.01` Juros/multas, `3.5.02` Tarifas bancárias.
   - `4` CUSTOS (grupo) → `4.1` CMV (já calculado pelo DRE hoje).
   - Só as contas **analíticas** (nível 3) aceitam lançamento (`analitica = true`).
2. **CRUD de Plano de Contas** (endpoints protegidos por permissão `FINANCEIRO:CONFIGURAR`):
   - `GET /plano-contas` (árvore), `POST`, `PUT /:id`, `PATCH /:id/ativar|desativar`.
   - Validar: não permitir excluir conta com lançamentos; não permitir lançar em conta não-analítica.
3. **Ligar Conta a Pagar → Plano de Contas.**
   - Adicionar `planoContasId` (nullable→obrigatório para despesas manuais) em `ContaPagar` **ou** popular `LancamentoFinanceiro` no momento da baixa/criação.
   - Decisão de arquitetura (escolher e registrar aqui): **usar `LancamentoFinanceiro` como a partida contábil** de cada título, gerado automaticamente na criação do título e/ou na baixa. Assim o DRE lê de uma única fonte.
   - Toda origem automática (entrada de compra, comissão, folha, diária) já nasce com a `planoContasId` correta.

## A.2 — Backend: DRE de verdade

Arquivo: `backend/src/modules/dre/dre.service.ts`.

1. Hoje o DRE monta: Receita Bruta − Impostos − CMV − Perdas = Resultado Operacional. **Faltam as despesas operacionais.**
2. Passar a **ler `LancamentoFinanceiro` agrupado por grupo/subgrupo do Plano de Contas** e inserir os blocos:
   - (−) Despesas Administrativas (3.1)
   - (−) Despesas com Pessoal (3.2)
   - (−) Despesas Comerciais (3.3) — inclui comissões
   - (−) Despesas Logísticas (3.4)
   - (−) Despesas Financeiras (3.5)
   - (=) **Resultado Líquido** (novo, abaixo do Resultado Operacional).
3. Manter compatibilidade: se não houver lançamentos, os blocos aparecem zerados (não quebra).
4. `GET /dre/completo` deve devolver a árvore detalhada por conta analítica para drill-down.

## A.3 — Frontend: lançar e visualizar despesas

Arquivos: `frontend/src/pages` (financeiro), `frontend/src/services/api.ts`.

1. Tela **"Nova Despesa"** (ou botão na página Contas a Pagar): campos descrição, valor, vencimento, **categoria (seletor de conta analítica em árvore)**, fornecedor/beneficiário opcional, centro de custo (= filial), parcelamento.
2. Tela **Plano de Contas** (configuração): árvore editável.
3. **DRE**: renderizar os novos blocos de despesa + linha Resultado Líquido; permitir clicar num grupo e ver os títulos (reaproveitar o padrão `DetalheModal`/lista da Fase 2).
4. `financeiroApi`: adicionar `planoContas.list/create/update`, e incluir `planoContasId` no `criarPagar`.

## A.4 — Critérios de aceite (Frente A)
- Consigo lançar "Aluguel R$ 3.000" na categoria 3.1.01 e ele **aparece no DRE** no bloco Administrativas e reduz o Resultado Líquido.
- DRE sem despesas continua funcionando (blocos zerados).
- Não consigo lançar em conta não-analítica (erro 400 claro).
- Entrada de mercadoria continua gerando título a pagar (sem regressão) — agora com categoria de CMV/estoque correta.

## A.5 — Sequência de execução (passo a passo para codar)

> ⚠️ **AUDITORIA DO CÓDIGO (2026-07-11):** os models **já existem** e estão bem desenhados — **NÃO criar nada, NÃO há migration nesta frente.** É trabalho de *seed + serviço + frontend*.
> - `PlanoContas` (schema ~1098): `id, tenantId, codigo, descricao, tipo (enum TipoLancamento), nivel, pai (String — código do pai, NÃO é FK), analitica, ativo`. **Usar `descricao` (não `nome`) e `tipo = TipoLancamento` (não criar `TipoConta`).**
> - `LancamentoFinanceiro` (schema ~1182): já tem `planoContasId, contaReceberId, contaPagarId, tipo (TipoLancamento), valor, dataCompetencia, descricao, historico`. **Popular é só criar linhas — sem alterar schema.**
> - `HistoricoFinanceiro` já registra baixas/estornos (trilha imutável).
> - **Estado atual:** `PlanoContas` nunca é semeado/usado; `LancamentoFinanceiro` só é escrito em **1 lugar** (perda em `pedidos.service.ts:429`). O DRE **não** lê dele. Logo, a infra está ociosa — esta frente a ativa.

**Ordem dos passos (cada um verificável isolado — sem migration):**

1. **Seed do plano padrão.** Função `seedPlanoContas(tenantId)` **idempotente** (casa por `codigo`, `@@unique([tenantId, codigo])`), chamada no onboarding e num script para os tenants existentes. Estrutura = a de A.1 (grupos 3.x DESPESAS e 4.x CUSTOS). Preencher `tipo` com o valor correto de `TipoLancamento`, `nivel` (1/2/3), `pai` = código do pai, `analitica = true` só no nível 3.
2. **Módulo `plano-contas`** (novo: `controller` + `service` + DTOs estendendo `TenantAwareDto`): `GET /plano-contas` (árvore, montada por `codigo`/`pai`), `POST`, `PUT /:id`, `PATCH /:id/ativar|desativar`. Guardas: `FINANCEIRO:CONFIGURAR`; bloquear excluir conta com lançamento; bloquear lançar em conta não-analítica (400 PT-BR).
3. **Popular `LancamentoFinanceiro` na origem** (mudança-chave). Ao **criar** um título em `contas-pagar`/`contas-receber`, gravar o lançamento com `planoContasId` + `dataCompetencia`. Carimbar a categoria de CMV/estoque na entrada de compra. Idempotência: 1 lançamento por título; estorno no cancelamento (aproveitar o padrão do `HistoricoFinanceiro`).
4. **DRE lê de `LancamentoFinanceiro`.** Em `dre.service.ts`, somar por grupo do plano (via `codigo`) e inserir os blocos 3.1–3.5 + **Resultado Líquido**. Zerado quando não houver lançamento (sem regressão). `GET /dre/completo` com drill-down por conta analítica.
5. **Frontend.** (a) `financeiroApi`: `planoContas.list/create/update` + `planoContasId` no `criarPagar`. (b) Tela **Plano de Contas** (árvore editável). (c) **Nova Despesa** (seletor de conta analítica). (d) **DRE**: novos blocos + Resultado Líquido, clique no grupo abre a lista de títulos (reusar `DetalheModal` da Fase 2).
6. **Verificação (A.4).** `frontend: npx tsc --noEmit`; rodar o fluxo compra→venda (sem regressão); lançar "Aluguel R$ 3.000" na 3.1.01 → conferir no DRE (bloco Administrativas + Resultado Líquido).

**Fonte única:** o DRE passa a ler **exclusivamente** de `LancamentoFinanceiro`. Todo dinheiro que entra/sai vira lançamento com `planoContasId`. Alicerce das Frentes B/C/D/G/I. **Como não há migration aqui, a Frente A pode começar sem parar o `nest --watch`** (só cuidado ao adicionar o módulo novo — o watch recompila sozinho).

---

# FRENTE B — Vendedor no pedido + comissão automática

**Por que:** resolve diretamente "pagamento de vendedores pela nota que eles mandam". Reaproveita o padrão de evento que já cria contas a pagar/receber.

## B.1 — Backend: identificar o vendedor

Arquivos: `schema.prisma`, `modules/pedidos`, `modules/usuarios` (ou novo `modules/vendedores`).

1. **Quem é vendedor?** Decisão: um `Usuario` com flag/atributo de vendedor **OU** um model `Vendedor` próprio (permite vendedor externo que não faz login). Recomendo **model `Vendedor`** (nome, documento, `usuarioId?` opcional, `percentualComissaoPadrao`, `formaPagamento`, `dadosBancarios`, `ativo`), porque muitos vendedores/representantes não têm login.
2. Adicionar `vendedorId` (nullable) em `Pedido`. Preencher na criação do pedido (seleção na tela) — **não confundir com `usuarioId`** (quem digitou).
3. Regra de comissão configurável: percentual padrão do vendedor, com possibilidade de override por pedido ou por categoria de produto (fase 2 desta frente). Guardar `percentualComissao` no próprio pedido no momento da venda (snapshot, para não mudar retroativo).

## B.2 — Backend: gerar a comissão automaticamente

Arquivo: novo listener em `modules/contas-pagar` ou `modules/comissoes`.

1. Ouvir o evento **`nfe.emitida`** (já existe e já dispara a conta a receber). Ao faturar:
   - Calcular comissão = base (valor de produtos ou valor líquido — **definir e documentar a base aqui**) × `percentualComissao` do pedido.
   - Criar **Conta a Pagar** para o vendedor: `fornecedorId`/`beneficiario` = vendedor, `descricao` = "Comissão NF-e nº X — <vendedor>", `planoContasId` = 3.3.01 (Comissões), `dataVencimento` = regra (ex.: dia 5 do mês seguinte), vínculo `nfeId`/`pedidoId`.
   - Idempotência: não duplicar comissão se a NF-e for reemitida; estornar comissão se a NF-e for cancelada/devolvida (ouvir `nfe.cancelada`).
2. Endpoints: `GET /comissoes?vendedorId=&periodo=` (extrato por vendedor), `GET /comissoes/resumo` (total a pagar por vendedor).

## B.3 — Frontend
1. No cadastro/edição de **Pedido**: seletor de **Vendedor** + campo % (preenche do padrão, editável conforme permissão).
2. Tela **Vendedores** (CRUD) com % padrão.
3. Tela **Comissões**: extrato por vendedor, filtro por período, status (a pagar/pago), botão "gerar pagamento" (baixa em lote das comissões do período).
4. Dashboard: card "Comissões do período" com lista (padrão Fase 2).

## B.4 — Critérios de aceite (Frente B)
- Ao faturar um pedido com vendedor João (3%), nasce automaticamente uma conta a pagar de comissão para João, categoria 3.3.01, aparecendo no DRE (Despesas Comerciais).
- Cancelar/devolver a NF-e estorna a comissão.
- Extrato do vendedor bate com a soma das notas do período.

## B.5 — Sequência de execução (passo a passo)

**Schema (Prisma):**
```prisma
model Vendedor {
  id                     String   @id @default(uuid())
  tenantId               String
  nome                   String
  documento              String?  // CPF/CNPJ
  usuarioId              String?  // opcional (representante externo não tem login)
  percentualComissao     Decimal  @default(0)   // % padrão
  baseComissao           BaseComissao @default(PRODUTOS)
  diaVencimento          Int      @default(5)   // dia do mês seguinte
  comissaoNoRecebimento  Boolean  @default(false)
  formaPagamento         String?
  pix                    String?
  ativo                  Boolean  @default(true)
  pedidos                Pedido[]
  @@index([tenantId, ativo])
}
enum BaseComissao { PRODUTOS TOTAL MARGEM }

model Comissao {
  id            String   @id @default(uuid())
  tenantId      String
  vendedorId    String
  pedidoId      String?
  nfeId         String?
  base          Decimal  // valor base usado
  percentual    Decimal  // snapshot
  valor         Decimal
  status        StatusComissao @default(A_PAGAR) // A_PAGAR | LIBERADA | PAGA | ESTORNADA
  contaPagarId  String?  // título gerado no fechamento
  competencia   String   // "2026-07"
  createdAt     DateTime @default(now())
  @@unique([tenantId, nfeId, vendedorId]) // idempotência
}
enum StatusComissao { A_PAGAR LIBERADA PAGA ESTORNADA }
// + adicionar vendedorId (nullable) e percentualComissao (snapshot) em Pedido.
```

**Passos:**
1. **Schema + migration** (`--name vendedor_comissao`, com watch parado).
2. **Módulo `vendedores`** (CRUD, guard `CADASTROS:*`).
3. **Pedido:** adicionar seletor de vendedor + % (preenche do padrão do vendedor, editável com permissão); gravar snapshot do % no pedido.
4. **Listener `nfe.emitida`** em novo `modules/comissoes`: calcular `base` conforme `baseComissao`, criar registro `Comissao` (idempotente por `nfeId+vendedorId`). Se `comissaoNoRecebimento`, status inicial `A_PAGAR` e só vira `LIBERADA` no evento de baixa do título do cliente.
5. **Listener `nfe.cancelada`/devolução:** marcar `ESTORNADA` e reverter (não gerar/993 anular o título se já criado).
6. **Fechamento mensal** (`POST /comissoes/fechar?competencia=`): agrupar comissões `LIBERADA/A_PAGAR` por vendedor → 1 **Conta a Pagar** (categoria 3.3.01) com `LancamentoFinanceiro` (Frente A), vencimento no `diaVencimento`.
7. **Frontend:** tela Vendedores, tela Comissões (extrato + fechar), card no dashboard (padrão Fase 2).
8. **Verificação (B.4).**

---

# FRENTE C — Pessoas pagáveis (funcionários e motoristas) + folha simples

**Por que:** para lançar salário/diária, o sistema precisa saber "a quem". Aqui criamos o cadastro e uma folha **simples** (não uma folha trabalhista completa — isso é do contador).

## C.1 — Backend: cadastro de pessoas
Arquivos: `schema.prisma`, novo `modules/pessoas` (ou `modules/rh`).

1. Model **`Funcionario`** (ou `Colaborador`): nome, documento, cargo, `tipo` (CLT | PJ | DIARISTA | MOTORISTA | VENDEDOR), `salarioBase`/`valorDiaria`, `formaPagamento`, `dadosBancarios`/`pix`, `filialId`, `usuarioId?` (se tem login), `ativo`, dataAdmissao.
2. Unificar conceito: **Vendedor** (Frente B) e **Motorista** podem ser especializações de `Funcionario` OU models separados que apontam para `Funcionario`. Decisão a registrar: recomendo **`Funcionario` como base** e `Vendedor`/`Motorista` como perfis (campo `tipo` + tabelas de atributos específicos: % comissão, valor diária).
3. Migrar o **nome-string do motorista** em `Romaneio`/`Route` para FK `funcionarioId` (mantendo o nome denormalizado por compatibilidade/histórico). Corrige a fragilidade "identificação por nome".

## C.2 — Backend: folha simples
Arquivo: novo `modules/folha`.

1. Model **`Folha`** (competência mês/ano, filial) + **`ItemFolha`** (funcionário, proventos, descontos, líquido).
2. `POST /folha/gerar` para uma competência: cria itens a partir do `salarioBase` de cada funcionário ativo (+ eventuais benefícios). **Não** calcula INSS/FGTS oficial (isso é escopo do contador) — mas permite lançar descontos/adiantamentos manuais.
3. Ao **fechar a folha**: gerar **Contas a Pagar** por funcionário (categoria 3.2.01 Salários), vencimento no 5º dia útil. Encargos entram como lançamento separado (3.2.02) se informado.
4. Idempotência: reabrir/refazer folha estorna os títulos anteriores da competência.

## C.3 — Frontend
1. CRUD **Funcionários** (com filtro por tipo).
2. Tela **Folha**: gerar competência, editar itens (adiantamento, desconto, bônus), fechar → gera pagamentos.
3. Vínculo do motorista nas rotas passa a ser por seleção de funcionário.

## C.4 — Critérios de aceite (Frente C)
- Cadastro um funcionário com salário R$ 2.000; gero a folha de julho; fecho; nascem contas a pagar de salário categoria 3.2.01 que aparecem no DRE (Pessoal).
- Rota passa a referenciar motorista por cadastro (não string solta).

## C.5 — Sequência de execução (passo a passo)

**Schema (Prisma):**
```prisma
model Funcionario {
  id             String   @id @default(uuid())
  tenantId       String
  filialId       String
  nome           String
  documento      String?
  cargo          String?
  tipo           TipoFuncionario // CLT | PJ | DIARISTA | MOTORISTA | VENDEDOR
  salarioBase    Decimal? @default(0)
  valorDiaria    Decimal? @default(0)
  tipoRemuneracao TipoRemuneracao @default(ROTA) // p/ motorista
  pix            String?
  dadosBancarios String?
  usuarioId      String?
  ativo          Boolean  @default(true)
  dataAdmissao   DateTime?
  itensFolha     ItemFolha[]
  @@index([tenantId, tipo, ativo])
}
enum TipoFuncionario { CLT PJ DIARISTA MOTORISTA VENDEDOR }
enum TipoRemuneracao { ROTA ENTREGA KM DIARIA }

model Folha {
  id          String   @id @default(uuid())
  tenantId    String
  filialId    String
  competencia String   // "2026-07"
  status      StatusFolha @default(ABERTA) // ABERTA | FECHADA
  itens       ItemFolha[]
  @@unique([tenantId, filialId, competencia])
}
enum StatusFolha { ABERTA FECHADA }

model ItemFolha {
  id            String  @id @default(uuid())
  folhaId       String
  funcionarioId String
  proventos     Decimal @default(0)
  descontos     Decimal @default(0)  // adiantamentos/faltas (manual)
  liquido       Decimal @default(0)
  contaPagarId  String? // gerado no fechamento
}
// + migrar Romaneio/Route: adicionar funcionarioId (FK), manter nomeMotorista denormalizado.
```

**Passos:**
1. **Schema + migration** (`--name pessoas_folha`, watch parado). Migração do motorista: adicionar `funcionarioId` nullable, **backfill** casando por nome quando possível, manter string por compatibilidade.
2. **Módulo `pessoas`** (CRUD Funcionário, filtro por tipo, guard `RH:*`).
3. **Módulo `folha`:** `POST /folha/gerar?competencia=` (cria itens dos ativos a partir de `salarioBase`); `PUT /folha/item/:id` (adiantamento/desconto/bônus); `POST /folha/:id/fechar` → gera Conta a Pagar por funcionário (3.2.01) + `LancamentoFinanceiro`; reabrir estorna títulos da competência (idempotência).
4. **Rotas:** trocar seleção de motorista para FK `funcionarioId`.
5. **Frontend:** CRUD Funcionários; tela Folha (gerar/editar/fechar); seletor de motorista nas rotas.
6. **Verificação (C.4)** — sem regressão no fluxo de rotas existente.

> **Aviso de conformidade (Brasil):** folha trabalhista completa envolve **eSocial, FGTS, INSS, IRRF, férias, 13º, rescisão** — obrigações legais que recomendo **manter com o contador**. Esta frente entrega o **líquido a pagar** e os dados; a integração eSocial fica na Frente J (opcional, se você quiser trazer isso para dentro).

---

# FRENTE D — Diária / frete de motorista por rota

**Por que:** motorista é pago por diária ou por entrega/rota; hoje não há nada.

## D.1 — Backend
Arquivos: `modules/rotas`, `modules/contas-pagar`/novo listener.

1. Configurar **regra de pagamento do motorista**: valor fixo por rota, por entrega concluída, ou por km (escolher; começar por fixo/entrega).
2. Ao **encerrar/concluir a rota** (evento de rota finalizada): criar **Conta a Pagar** para o motorista (categoria 3.4.01 Diária de motorista), descrição "Rota nº X — N entregas — <motorista>", com vínculo à rota.
3. Estorno se a rota for cancelada.
4. `GET /motoristas/:id/pagamentos` — extrato.

## D.2 — Frontend
1. Config de valor de diária no cadastro do motorista/funcionário.
2. Tela **Pagamentos de motorista**: extrato por rota/período, status, baixa em lote.
3. Dashboard: card "Diárias a pagar".

## D.3 — Critérios de aceite (Frente D)
- Ao concluir uma rota, nasce a conta a pagar da diária, categoria 3.4.01, no DRE (Logísticas).
- Cancelar a rota estorna.

## D.5 — Sequência de execução (passo a passo)

> Reaproveita `Funcionario.tipoRemuneracao`/`valorDiaria` da Frente C — **não cria model novo**, só um listener + registro de pagamento.

**Schema (Prisma):**
```prisma
model PagamentoMotorista {
  id            String   @id @default(uuid())
  tenantId      String
  funcionarioId String
  rotaId        String?
  tipo          TipoRemuneracao // snapshot da regra aplicada
  qtdReferencia Decimal?  // nº de entregas ou km, conforme tipo
  valor         Decimal
  status        String   @default("A_PAGAR") // A_PAGAR | PAGA | ESTORNADA
  contaPagarId  String?
  createdAt     DateTime @default(now())
  @@unique([tenantId, rotaId, funcionarioId]) // idempotência
}
```

**Passos:**
1. **Schema + migration** (`--name pagamento_motorista`, watch parado).
2. **Listener de rota concluída** (evento existente de finalização de rota): calcular valor conforme `tipoRemuneracao` do motorista (ROTA=`valorDiaria`; ENTREGA=`valorDiaria`×nº entregas; KM=`valorDiaria`×km; DIARIA=por dia), criar `PagamentoMotorista` (idempotente por rota) + **Conta a Pagar** (3.4.01) + `LancamentoFinanceiro`.
3. **Estorno** no cancelamento da rota.
4. **Frontend:** extrato "Pagamentos de motorista" (por rota/período, baixa em lote) + card no dashboard.
5. **Verificação (D.3).**

---

# FRENTE E — UX: popovers e menus de contexto reutilizáveis

**Por que:** o usuário pediu as "abinhas" (hover/clique que abrem sub-opções). Barato e deixa cara profissional.

## E.1 — Componentes base (novos, reutilizáveis)
Arquivos: `frontend/src/components/ui/`.

1. **`Popover`/`HoverCard`**: aparece ao passar o mouse (com delay) ou clicar; posicionamento inteligente (não sai da tela); fecha com ESC/clique-fora. Reaproveitar a estética do `DetalheModal` (glass, bordas suaves).
2. **`MenuContexto`**: menu de ações (com suporte a submenu que expande no hover, como na screenshot do usuário) — acionável por botão "⋮" e por clique-direito em linhas de tabela.
3. Padronizar com o `DetalheRegistro`/loader on-demand da Fase 2 (carregar conteúdo do popover sob demanda).

## E.2 — Onde plugar (primeira leva)
- **Pedidos** (linha da tabela): hover → resumo do pedido; "⋮"/clique-direito → Faturar, Cancelar, Ver NF-e, Reposição.
- **Estoque/Produtos**: hover no produto → saldo por lote/validade + últimas movimentações.
- **Clientes**: hover → contato, limite, títulos em aberto.
- **Financeiro**: "⋮" na linha de título → Baixar, Cancelar, Ver origem (NF-e/entrada).
- **Fiscal**: badges de status com histórico no hover.

## E.3 — Critérios de aceite (Frente E)
- Um único componente `Popover` e um `MenuContexto` usados em ≥3 telas.
- Acessível por teclado (ESC fecha), sem travar navegação, sem duplicar código por tela.

---

# FRENTE F — Fiscal real (SEFAZ) + MDF-e/CT-e persistidos

**Por que por último:** é a mais pesada, exige certificado digital, integrador e homologação. Enquanto isso, o modo simulação atual é ótimo para treinar sem risco.

## F.1 — Deixar o "mock" honesto (rápido, fazer já)
- Em toda tela fiscal que é simulação (emissão NF-e, MDF-e, CT-e), exibir um **selo visível "MODO SIMULAÇÃO — sem valor fiscal"**. Evita confusão operacional.
- MDF-e/CT-e hoje salvam só no `localStorage` → **persistir no backend** (models `Mdfe`, `Cte`, com vínculo às NF-e), mesmo em modo mock, para ter histórico e auditoria.

## F.1b — Corrigir o cálculo tributário ANTES de emitir de verdade (crítico)
> Emitir com destaque de imposto errado gera passivo fiscal. Estes ajustes no motor (`fiscal.service.ts` / `RegraFiscal`) vêm ANTES de ligar a SEFAZ:
1. **Regime tributário no cálculo:** consultar `Filial.regimeTributario` e:
   - **Simples Nacional:** usar **CSOSN** (101, 102, 103, 201, 202, 300, 400, 500, 900) e alíquotas do Simples (sem destaque de ICMS/PIS/COFINS "por fora", salvo ST/DIFAL). Crédito de ICMS só quando permitido (CSOSN 101/201).
   - **Lucro Presumido/Real:** usar **CST** (00, 10, 20, 40, 41, 50, 51, 60, 70, 90) e **PIS/COFINS** conforme cumulativo (Presumido) × **não-cumulativo** (Real).
2. **FCP e FCP-ST:** adicionar `aliquotaFcp`/`aliquotaFcpSt` em `RegraFiscal` e destacar quando o estado exige.
3. **PIS/COFINS cumulativo × não-cumulativo:** flag por regime; alíquotas 0,65%/3% (cumulativo) vs 1,65%/7,6% (não-cumulativo).
4. **Retenções** (quando houver serviço/PJ): IRRF, INSS, ISS retido, PIS/COFINS/CSLL — campos no item/nota.
5. **Validação de dígito** de CNPJ/CPF e de **IE por estado** (barato, evita rejeição SEFAZ).
6. **Validação de formato:** NCM (8 díg.), CEST (7 díg.), EAN-13/EAN-8, CFOP (4 díg.).
7. **CNAE** no cadastro da filial.

## F.2 — NF-e real (quando decidir operar valendo)
Pré-requisitos: **certificado digital A1** (upload/validade/senha — model novo `CertificadoDigital`), CSC (NFC-e), séries, ambiente de **homologação** primeiro.
1. Integrar com um **provedor** (o código já menciona PlugNotas/Focus NF-e): trocar `chamarApiSefaz()`/`cancelarSefaz()` mock pela chamada real ao integrador.
2. Tratar retornos: autorizada, rejeitada (com motivo SEFAZ), denegada; guardar XML autorizado e protocolo reais.
3. **Contingência** (SVC/offline) e reprocessamento.
4. **DANFE** (PDF) real para impressão.
5. **Inutilização** de numeração (acionar o status `INUTILIZADO` que já existe).
6. **Eventos**: CC-e (já existe), cancelamento (já existe), **manifestação do destinatário** (ciência/confirmação) e **distribuição DF-e** (baixar XMLs que fornecedores emitiram contra o seu CNPJ → alimenta entrada automática).

## F.2b — Outros documentos fiscais
1. **NFS-e** (serviço municipal, ISS) — se a empresa fatura serviço/frete próprio. Cada município tem layout próprio (usar integrador que abstrai).
2. **NFC-e (modelo 65)** — detalhado na Frente O (varejo/balcão).

## F.3 — MDF-e / CT-e reais
- **MDF-e** (frota própria): emitir manifesto amarrando as NF-e da viagem por veículo/motorista/UF percurso; encerramento obrigatório ao fim da viagem.
- **CT-e** (transportadora terceira): documento do frete.
- Ambos via integrador + certificado. Vincular à rota e ao motorista (Frentes C/D).

## F.4 — Reforma tributária (IBS/CBS)
- Já existe módulo `fiscal-reforma` calculando IBS/CBS e gerando lançamentos. Manter alinhado ao cronograma legal e ligar aos novos blocos do DRE.

## F.5 — Critérios de aceite (Frente F)
- Modo simulação claramente rotulado em tela.
- MDF-e/CT-e persistidos no backend com histórico (mesmo mock).
- (Quando ligar o real) NF-e autorizada em homologação, com XML/protocolo reais e DANFE.

---

# FRENTE G — Tesouraria: contas bancárias, caixa e conciliação

**Por que é fundamental (subestimei antes):** hoje quando você "baixa" um título, o sistema só marca PAGO — **o dinheiro não entra em conta nenhuma**. Não existe saldo de banco/caixa. Sem isso, você nunca sabe *quanto tem em caixa agora*, e a conciliação com o banco é impossível. Esta frente anda junto/logo depois da Frente A.

## G.1 — Backend: contas e movimento de caixa
Arquivos: `schema.prisma`, novo `modules/tesouraria`.
1. Model **`ContaFinanceira`** (tipo: BANCO | CAIXA | APLICACAO; nome, banco, agência, conta, `saldoInicial`, `saldoAtual`, filialId, ativo).
2. Model **`MovimentoCaixa`** (contaId, tipo ENTRADA/SAIDA/TRANSFERENCIA, valor, data, origem: baixa de título / transferência / lançamento avulso, `contaReceberId?`/`contaPagarId?`, descricao). **Fonte única do saldo**: `saldoAtual` é derivado/atualizado por movimento.
3. **Ligar a baixa de título ao caixa:** ao baixar (`/contas-receber/:id/baixar`, `/contas-pagar/:id/baixar`), exigir `contaId` e gerar o `MovimentoCaixa` correspondente (entrada/saída), atualizando saldo. Idempotente e com estorno no cancelamento da baixa.
4. **Transferência entre contas** (`POST /tesouraria/transferencia`): saída de uma, entrada em outra, mesma data.
5. **Lançamento avulso** (tarifa, rendimento, sangria) com categoria do Plano de Contas (Frente A).

## G.2 — Backend: conciliação bancária
1. Importar **extrato OFX** (e futuramente CNAB retorno): model `ExtratoBancario` + `ItemExtrato`.
2. **Conciliar**: casar item do extrato com `MovimentoCaixa`/título (por valor+data), marcar conciliado, sinalizar divergências.

## G.3 — Frontend
1. Tela **Contas** (bancos/caixa) com saldo atual e extrato por conta.
2. Baixa de título passa a pedir **"de/para qual conta"**.
3. Tela **Conciliação**: importar OFX, casar, resolver divergências.
4. Dashboard: card **"Saldo em contas (hoje)"** — hoje inexistente e essencial.

## G.4 — Critérios de aceite
- Recebo um título de R$ 1.000 na conta "Banco X" → saldo do Banco X sobe R$ 1.000; movimento aparece no extrato.
- Transferência entre contas não altera o total consolidado.
- Importo um OFX e concilio ≥1 item.

## G.5 — Sequência de execução (passo a passo)

**Schema (Prisma):**
```prisma
model ContaFinanceira {
  id           String   @id @default(uuid())
  tenantId     String
  filialId     String?
  tipo         TipoContaFin // BANCO | CAIXA | APLICACAO
  nome         String
  banco        String?
  agencia      String?
  numero       String?
  saldoInicial Decimal  @default(0)
  saldoAtual   Decimal  @default(0)  // derivado dos movimentos
  ativo        Boolean  @default(true)
  movimentos   MovimentoCaixa[]
}
enum TipoContaFin { BANCO CAIXA APLICACAO }

model MovimentoCaixa {
  id             String   @id @default(uuid())
  tenantId       String
  contaId        String
  tipo           TipoMovimento // ENTRADA | SAIDA | TRANSFERENCIA
  valor          Decimal
  data           DateTime
  origem         String   // BAIXA | TRANSFERENCIA | AVULSO
  contaReceberId String?
  contaPagarId   String?
  planoContasId  String?  // p/ avulsos (tarifa, rendimento)
  descricao      String?
  conciliado     Boolean  @default(false)
  createdAt      DateTime @default(now())
}
enum TipoMovimento { ENTRADA SAIDA TRANSFERENCIA }

model ExtratoBancario { id String @id @default(uuid()); tenantId String; contaId String; importadoEm DateTime @default(now()); itens ItemExtrato[] }
model ItemExtrato { id String @id @default(uuid()); extratoId String; data DateTime; valor Decimal; descricao String; movimentoId String? /* conciliado */ }
```

**Passos:**
1. **Schema + migration** (`--name tesouraria`, watch parado).
2. **Módulo `tesouraria`:** CRUD `ContaFinanceira`; `POST /tesouraria/transferencia`; lançamento avulso com `planoContasId`.
3. **Ligar baixa ao caixa (mudança-chave):** `baixar` de contas-receber/pagar passa a **exigir `contaId`**, gera `MovimentoCaixa` e atualiza `saldoAtual`. Idempotente + estorno ao cancelar a baixa. **Migração suave:** aceitar baixas antigas sem conta (histórico), exigir só nas novas.
4. **Conciliação OFX:** parser de OFX → `ExtratoBancario`/`ItemExtrato`; casar por valor+data (±tolerância) com `MovimentoCaixa`; marcar `conciliado`; listar divergências.
5. **Frontend:** tela Contas (saldo + extrato); baixa pede "de/para conta"; tela Conciliação; **card "Saldo em contas (hoje)"** no dashboard.
6. **Verificação (G.4).**

---

# FRENTE H — Cobrança real (boleto, PIX dinâmico, CNAB)

**Por que:** hoje boleto/PIX são **fake**. Para receber de verdade, precisa integração bancária.

## H.1 — Backend
1. Integração com **provedor de cobrança** (banco via API/CNAB, ou gateway tipo Asaas/Gerencianet/PagSeguro). Preencher de verdade `linkBoleto`, `pixCopiaECola`, `gatewayId` em `ContaReceber`.
2. **PIX QR dinâmico** por título (com valor+vencimento+txid).
3. **CNAB remessa** (envia títulos ao banco) e **retorno** (baixa automática por arquivo do banco) — ou webhook do gateway confirmando pagamento → baixa automática + `MovimentoCaixa` (Frente G).
4. Conciliação automática do pagamento confirmado.

## H.2 — Frontend
1. No título: botões "Gerar boleto", "Gerar PIX" (com QR e copia-e-cola).
2. Tela de **remessa/retorno** (ou status de webhook) mostrando pagos automaticamente.

## H.3 — Critérios de aceite
- Gero um PIX/boleto real para um título; ao pagar (sandbox), o título baixa sozinho e entra no caixa.

---

# FRENTE I — Despesas recorrentes (aluguel, assinaturas, contratos)

**Por que:** aluguel, luz, internet, software se repetem todo mês. Hoje só há parcelamento manual.

## I.1 — Backend
Arquivos: `schema.prisma`, `modules/contas-pagar` (ou novo `modules/recorrencias`).
1. Model **`DespesaRecorrente`** (descricao, valor, `planoContasId`, fornecedor/beneficiário, periodicidade MENSAL/QUINZENAL/ANUAL, diaVencimento, dataInicio, dataFim?, ativo).
2. **Job agendado** (cron) que, no início de cada período, gera automaticamente a **Conta a Pagar** da recorrência (com a categoria correta → cai no DRE).
3. Suporte a valor variável (ex.: energia): gerar em RASCUNHO para o usuário confirmar o valor real antes de virar título.

## I.2 — Frontend
1. Tela **Despesas Recorrentes** (CRUD) + prévia do que será gerado no mês.
2. Fila de "recorrências a confirmar" (valor variável).

## I.3 — Critérios de aceite
- Cadastro "Aluguel R$ 3.000, mensal, vence dia 5" → todo mês nasce o título automaticamente na categoria 3.1.01, aparecendo no DRE.

## I.5 — Sequência de execução (passo a passo)

**Schema (Prisma):**
```prisma
model DespesaRecorrente {
  id            String   @id @default(uuid())
  tenantId      String
  filialId      String?
  descricao     String
  valor         Decimal  @default(0)  // 0 = valor variável (confirma no mês)
  valorVariavel Boolean  @default(false)
  planoContasId String
  beneficiario  String?
  fornecedorId  String?
  periodicidade Periodicidade // MENSAL | QUINZENAL | ANUAL
  diaVencimento Int
  dataInicio    DateTime
  dataFim       DateTime?
  ativo         Boolean  @default(true)
  ultimaGeracao String?  // "2026-07" evita duplicar
}
enum Periodicidade { MENSAL QUINZENAL ANUAL }
```

**Passos:**
1. **Schema + migration** (`--name despesa_recorrente`, watch parado).
2. **Módulo `recorrencias`:** CRUD + preview do que será gerado no período.
3. **Job cron** (`@Cron` diário): para cada recorrência ativa cujo período ainda não foi gerado (`ultimaGeracao`), criar **Conta a Pagar** (categoria correta) + `LancamentoFinanceiro`. Se `valorVariavel`, gerar em **RASCUNHO** (fila "a confirmar") em vez de título direto.
4. **Idempotência:** `ultimaGeracao` garante 1 geração por período mesmo se o cron rodar 2×.
5. **Frontend:** tela Despesas Recorrentes (CRUD + preview) + fila "a confirmar" (valor variável).
6. **Verificação (I.3).**

---

# FRENTE J — Obrigações fiscais acessórias e guias de imposto

**Por que:** o contador precisa dos arquivos, e a empresa precisa saber quanto de imposto recolher. Hoje nada disso existe (só o cálculo dentro da NF-e).

## J.1 — Backend (varia conforme o regime tributário da empresa)
1. **Exportar XMLs autorizados** por período (pacote para o contador) — mesmo em modo simulação, guardar os XML gerados.
2. **SPED Fiscal / EFD ICMS-IPI** — obrigatório para Presumido/Real (e alguns casos). Geração dos blocos a partir de NF-e/entradas/inventário.
3. **EFD-Contribuições** (PIS/COFINS) — Presumido/Real.
4. **ECD** (escrituração contábil digital) e **ECF** (escrituração contábil fiscal) — dependem da **contabilidade de partida dobrada** (Frente P).
5. **Bloco K** (SPED — controle de produção e estoque) — quando exigido; usa `MovimentacaoEstoque`.
6. **EFD-Reinf** (retenções) + **DCTFWeb** — quando há retenções/serviços (liga à Frente F retenções).
7. **eSocial** — trabalhista; depende da folha (Frente C). Eventos de admissão/folha/rescisão.
8. **SINTEGRA / GIA / DeSTDA** (obrigações estaduais) — DeSTDA é específica do **Simples com ST**.
9. **Apuração de impostos a recolher**: ICMS (débito × crédito, com crédito das compras), ICMS-ST, FCP, PIS/COFINS → **gerar Conta a Pagar** da guia (categoria de impostos) com vencimento.
10. **DAS (Simples)** — calcular pelo faturamento e anexos; **DARF** (Presumido/Real). Gerar o título e o lembrete.

> Cada obrigação acima depende do **regime** (decisão 8): Simples → DAS + DeSTDA (se ST) + SPED/EFD conforme obrigado; Presumido/Real → SPED Fiscal + EFD-Contribuições + ECD/ECF + DARF. **Desenhar junto do contador da empresa.**

## J.2 — Frontend
1. Tela **Apuração fiscal** (mês): impostos a recolher, botão "gerar guia" → vira conta a pagar.
2. Tela **Exportar para contador** (XMLs + relatório do período).

## J.3 — Critérios de aceite
- No fim do mês vejo "ICMS a recolher R$ X, PIS/COFINS R$ Y", gero as guias como contas a pagar (entram no DRE/fluxo).
- Baixo um pacote de XMLs do período para o contador.

> **Recomendação:** esta é a frente onde MAIS vale envolver o contador da empresa desde o desenho, para bater com o que ele já entrega.

---

# FRENTE K — Notificações e alertas (canal de entrega)

**Por que:** o sistema já *calcula* alertas (validade, estoque mínimo, título vencendo), mas não avisa ninguém.

## K.1 — Backend
1. Model **`Notificacao`** (usuario/role destino, tipo, titulo, mensagem, link, lida, createdAt).
2. **Geradores** ouvindo eventos/cron: título vencendo/vencido, estoque abaixo do mínimo, validade próxima, pedido bloqueado por crédito, NF-e rejeitada.
3. Canais: **in-app** (sino) primeiro; depois **e-mail** e (opcional) **WhatsApp/push**.

## K.2 — Frontend
1. **Sino de notificações** no topo com contador e lista.
2. Preferências por usuário (o que quer receber e por qual canal).

## K.3 — Critérios de aceite
- Um título que vence amanhã gera notificação in-app para o financeiro.

---

# FRENTE L — Relatórios gerenciais avançados

**Por que:** DRE e dashboard existem, mas faltam relatórios de decisão.

## L.1 — Conteúdo
1. **Curva ABC** de produtos e de clientes (Pareto 80/20).
2. **Giro de estoque** e cobertura (dias de estoque), itens parados.
3. **Ranking** de vendedores (usa Frente B), de clientes, de produtos.
4. **Posição financeira** consolidada: a receber vs a pagar por vencimento (aging já existe no dashboard — virar relatório exportável).
5. **Exportação** (CSV/Excel/PDF) de todos os relatórios.

## L.2 — Critérios de aceite
- Gero a curva ABC do período e exporto em Excel; números batem com as movimentações.

---

# FRENTE M — Devolução de compra + precificação por tabela

## M.1 — Devolução de COMPRA (ao fornecedor)
- Implementar o fluxo que falta: usar `SAIDA_DEVOLUCAO_FORNECEDOR`, baixar estoque, e **estornar/creditar a conta a pagar** do fornecedor. Endpoint `POST /entradas/:id/devolucao` (ou em compras).

## M.2 — Motor de precificação
- Aplicar `Cliente.tabelaPreco` automaticamente no item do pedido (tabela A/B/especial), com regra de markup sobre custo e suporte a promoção por período. Hoje o preço é estático e manual.

## M.3 — Critérios de aceite
- Devolvo itens de uma entrada → estoque baixa e a conta a pagar do fornecedor é reduzida/estornada.
- Cliente da "Tabela B" puxa automaticamente o preço da Tabela B no pedido.

---

# FRENTE N — Qualidade, confiabilidade e conformidade (transversal)

**Por que você pediu "não pode dar erro algum":** confiabilidade não se garante só codando — se garante com **testes, backup e trilha**. Hoje há só 2 arquivos de teste para 30+ módulos. Esta frente é contínua, roda junto com todas as outras.

## N.1 — Testes automatizados
1. **Testes de unidade** dos serviços financeiros críticos (baixa, comissão, folha, DRE, apuração) — dinheiro não pode arredondar errado.
2. **Testes de integração/e2e** do fluxo completo (compra→venda→NF-e→entrega→receber→baixa→caixa) rodando a cada mudança.
3. Meta: cobrir 100% das regras que mexem em dinheiro e estoque.

## N.2 — Backup e retenção
1. **Backup automático** do PostgreSQL (dump agendado + retenção + teste de restauração).
2. Política de retenção de XMLs fiscais (guarda legal de 5 anos).

## N.3 — Segurança e LGPD
1. Revisão de permissões por endpoint (nenhum endpoint sensível sem guard).
2. Dados pessoais de clientes/funcionários: consentimento, anonimização em relatórios, controle de acesso.
3. Rate limiting e proteção básica (já há bcrypt+JWT; falta política de expiração/refresh e lockout).

## N.4 — Critérios de aceite
- Suite de testes verde no CI a cada commit; restauração de backup testada; nenhum endpoint sensível sem permissão.

---

# FRENTE O — PDV / Frente de caixa + NFC-e (modelo 65)

**Por que / quando:** só é necessária **se você vende no balcão / direto ao consumidor**. Se a operação é 100% B2B com NF-e 55, esta frente é opcional. O schema já tem `TipoDFe.NFCE` e `modelo` 55/65 — falta a lógica.

## O.1 — Backend
1. **NFC-e (modelo 65):** emissão para consumidor com **CSC/Token** (código de segurança do contribuinte), QR Code, sem destinatário obrigatório. Reaproveita o motor fiscal (Frente F).
2. **Sessão de caixa/turno:** abertura, **sangria** (retirada) e **suprimento** (reforço), fechamento com conferência → integra com Tesouraria (Frente G).
3. **Formas de pagamento no PDV:** dinheiro, PIX, cartão (e futura integração **TEF/maquininha**).
4. **Contingência offline** (NFC-e é comum vender sem internet e transmitir depois).

## O.2 — Frontend
1. Tela de **PDV** rápida (leitura de código de barras, busca ágil, teclas de atalho).
2. Fechamento de caixa com relatório do turno.

## O.3 — Critérios de aceite
- Venda de balcão emite NFC-e (homologação) com QR, baixa estoque e cai no caixa do turno; fechamento bate.

---

# FRENTE P — Contabilidade de partida dobrada + livros fiscais

**Por que:** o model `LancamentoFinanceiro` (débito/crédito, `planoContasId`) **existe mas nunca é alimentado**. Sem partida dobrada real não há ECD/ECF nem balancete — e a Frente J (SPED contábil) depende disto.

## P.1 — Backend
1. **Gerar lançamentos contábeis automáticos** (débito/crédito) em cada fato: venda, compra/entrada, baixa de título, folha, comissão, imposto, perda, transferência. Cada evento já existente do domínio vira também uma **partida dobrada**.
2. Amarrar ao **Plano de Contas** (Frente A) — contas contábeis, não só gerenciais.
3. **Livros:** Livro Caixa, **Livro Razão**, **Livro Diário**, **Balancete de verificação** e **Balanço Patrimonial** simplificado.
4. Fechamento de período contábil (bloqueio de lançamento retroativo).

## P.2 — Critérios de aceite
- Cada venda/compra/baixa gera partidas que **fecham** (débito = crédito); balancete bate; base pronta para ECD/ECF.

> **Nota de escopo:** contabilidade fiscal plena (ECD/ECF assinados) normalmente é entregue pelo **contador**. O objetivo aqui é ter a escrituração correta e exportável — não substituir o contador, mas alimentá-lo com dados fechados.

---

# FRENTE Q — Importação de mercadoria (entrada + fiscal aduaneiro)

**Por que:** parte dos produtos é **importada** e hoje o sistema **não trata importação** — existe só o campo `Produto.origem` (registro, não usado no cálculo). Sem isso, a entrada importada fica com CFOP/imposto errado e a venda do importado sai com **origem/CST incorretos** (risco de rejeição/passivo).

> **Dois cenários bem diferentes — o escopo depende de qual é o seu (decisão 14):**
> - **(a) Compra de importador nacional** (mercadoria já nacionalizada): escopo **pequeno** — basta marcar `origem` correta (2/3/6/7/8), CST/CSOSN coerente e CFOP de compra. **Sem DI/II/câmbio.**
> - **(b) Importação direta do exterior:** escopo **grande** — NF-e de importação, DI/DUIMP, II/IPI/PIS/COFINS-importação, ICMS-importação (GARE SP no desembaraço), fornecedor estrangeiro, moeda e câmbio, rateio de despesas aduaneiras no custo.

## Q.1 — Backend (cenário b — importação direta)
Arquivos: `schema.prisma`, `modules/entradas`, `modules/fiscal`.
1. **NF-e/Entrada de importação:** CFOP 3xxx (ex.: **3102** compra p/ revenda), novo bloco em `EntradaMercadoria` para dados aduaneiros: **número DI/DUIMP**, data de desembaraço, local, adições.
2. **Impostos de importação:** campos e cálculo de **II**, **IPI-importação**, **PIS/COFINS-importação**, **ICMS-importação** (base "por dentro" somando II + IPI + PIS + COFINS + taxa **Siscomex** + **AFRMM** + despesas aduaneiras). Em SP, gerar a **GARE-ICMS** (vira Conta a Pagar/guia — liga à Frente J).
3. **Formação de custo real do importado:** ratear todas as despesas de importação (frete internacional, seguro, aduaneiras, impostos não recuperáveis) no **custo unitário** de cada item → custo médio correto (impacta CMV/DRE).
4. **Fornecedor estrangeiro:** flag `exterior`, país, sem CNPJ; **moeda** e **taxa de câmbio** na entrada e na `ContaPagar` (liquidação em moeda estrangeira + variação cambial → lançamento em despesa/receita financeira 3.5).

## Q.2 — Backend (aplicável aos dois cenários — venda do importado)
1. **Usar `Produto.origem` no cálculo** (hoje só registra): origem 1/2/3/6/7/8 → definir **CST**/alíquota corretos na saída.
2. **Resolução SF 13/2012 (4% interestadual) + FCI:** só quando **vender para outro estado**. Como a operação é majoritariamente **dentro de SP**, priorizar o correto para operação interna; deixar FCI/4% como item condicional para quando houver venda interestadual de importado.

## Q.3 — Frontend
1. Entrada de importação: formulário com DI/DUIMP, moeda/câmbio, despesas aduaneiras e prévia do custo formado.
2. Cadastro de **fornecedor do exterior**.
3. No produto: origem obrigatória e coerente (validação).

## Q.4 — Critérios de aceite
- (a) Compro importado de importador nacional → produto marcado origem 2, vende com CST/origem corretos.
- (b) Importo direto → registro a DI, o sistema forma o custo com II/IPI/PIS/COFINS/Siscomex/AFRMM, gera a GARE como conta a pagar, e o custo médio reflete tudo isso.

---

## Dependências entre frentes

```
A (Plano de Contas + DRE)  ──► base de categorização usada por B, C, D, G, I, J
        │
        ├──► B (Comissão)   usa categoria 3.3.01 + evento nfe.emitida
        ├──► C (Folha)       usa categoria 3.2.x + cadastro de pessoas
        │        └──► D (Diária motorista) usa cadastro de motorista da Frente C
        ├──► G (Tesouraria)  a baixa de título passa a mover dinheiro em conta/caixa
        │        └──► H (Cobrança real) baixa automática cai no caixa da Frente G
        ├──► I (Recorrentes) gera contas a pagar automáticas na categoria certa
        ├──► J (Fiscal acessório/guias) apura impostos → contas a pagar
        └──► L (Relatórios)  consolida A+B+G + estoque

P (Contabilidade partida dobrada) ──► base para ECD/ECF da Frente J
        └──► alimentado por A + todos os eventos de domínio

E (UX popovers)  ── independente, pode rodar em paralelo
K (Notificações) ── independente (ouve eventos existentes)
M (Devolução compra + preço) ── independente
N (Qualidade)    ── TRANSVERSAL: testes/backup/LGPD acompanham todas as frentes
F (Fiscal real)  ── F.1b (corrigir cálculo: regime/CST/CSOSN/FCP) OBRIGATÓRIO antes de F.2 (SEFAZ real)
O (PDV + NFC-e)  ── só se houver venda balcão; depende de F (motor fiscal) + G (caixa)
Q (Importação)   ── só se importar direto (DI/DUIMP); depende de F.1b (cálculo por regime) + G (pagar câmbio/impostos). Se só compra de importador nacional, é só marcar Produto.origem.
```

---

## Princípios de engenharia (para não virar gambiarra)

1. **Fonte única da verdade financeira:** todo dinheiro que sai vira `ContaPagar` + `LancamentoFinanceiro` com `planoContasId`. O DRE lê só disso.
2. **Automação por eventos:** comissão, folha e diária nascem de eventos de domínio (`nfe.emitida`, folha fechada, rota concluída) — igual ao que já existe para fornecedor/receber. Sempre com **idempotência e estorno**.
3. **Snapshots:** percentuais/valores gravados no momento do fato (comissão do pedido, salário da competência) para não mudar histórico retroativamente.
4. **Validação com class-validator** em todo DTO novo (400 com mensagem PT-BR), estendendo `TenantAwareDto` (por causa do `TenantInterceptor`). Nada de interface solta que estoura 500.
5. **Permissões:** cada endpoint sensível protegido por permissão (`FINANCEIRO:OPERAR`, `FINANCEIRO:CONFIGURAR`, `RH:OPERAR`…).
6. **Multi-tenant e por filial:** tudo carimbado com `tenantId` e `filialId` (centro de custo).
7. **Sem regressão:** o fluxo compra→venda→separação→NF-e→entrega→receber precisa continuar passando a cada frente.
8. **Migrations Prisma versionadas** para toda mudança de schema (nunca alterar banco na mão).

---

## Verificação global (a cada frente concluída)

1. `cd backend && npx prisma migrate dev` (schema novo) + `npm run build` (tsc) sem erros — **respeitando a regra de nunca rodar build separado enquanto o `nest --watch` está ativo** (matar node e subir `start:dev`, ou deixar o watch recompilar).
2. `cd frontend && npx tsc --noEmit` sem erros.
3. Subir `start-hetros.bat`; rodar o **fluxo operacional completo** (deve continuar verde).
4. Testes específicos da frente (ex.: lançar despesa → conferir no DRE; faturar → conferir comissão; fechar folha → conferir títulos).
5. Conferir no Dashboard/DRE que os novos valores aparecem e batem.

---

## Decisões em aberto (preciso da sua escolha antes de codar cada frente)

Estas escolhas mudam o desenho — melhor decidir junto do que eu assumir:

1. **Base da comissão (Frente B):** comissão incide sobre o **valor total da nota**, sobre o **valor de produtos** (sem impostos/frete), ou sobre a **margem**? E o vencimento: paga por nota, ou acumula e paga no dia X do mês seguinte?
2. **Vendedor externo vs interno (Frente B):** vendedores têm login no sistema ou são só cadastros (representantes)? Isso decide `model Vendedor` próprio vs flag em `Usuario`.
3. **Comissão só na venda ou também no recebimento?** Alguns negócios só pagam comissão quando o cliente **paga** o título (não quando a nota é emitida). Qual é o seu caso?
4. **Folha (Frente C):** você quer folha trabalhista de verdade (INSS/FGTS/férias/13º) ou só o **líquido a pagar** por competência, deixando os cálculos legais com o contador? (Recomendo o segundo para não virar sistema de RH completo.)
5. **Pagamento do motorista (Frente D):** valor **fixo por rota**, por **entrega concluída**, por **km**, ou diária por dia trabalhado?
6. **Fiscal real (Frente F):** você já tem **certificado digital A1** e conta em algum integrador (PlugNotas/Focus)? Se ainda não for operar valendo, mantemos simulação + só o quick win F.1.
7. **Cobrança (Frente H):** você quer **boleto/PIX via banco** (CNAB, mais burocrático) ou via **gateway** (Asaas/Gerencianet/PagSeguro — mais rápido de integrar, com webhook)? Qual banco/gateway usa?
8. **Regime tributário (Frente J):** a empresa é **Simples Nacional**, **Lucro Presumido** ou **Real**? Isso muda quais guias/obrigações (DAS vs DARF/ICMS-ST/SPED) fazem sentido.
9. **Tesouraria (Frente G):** quantas contas bancárias + caixa você opera hoje? Quer conciliar por **OFX** (arquivo do internet banking) para começar?
10. **Serviços/ISS (Frente F/O):** a empresa **presta algum serviço** (ex.: frete próprio cobrado, taxa)? Se sim, precisamos de **NFS-e + ISS + retenções**. Se vende só mercadoria, ignoramos.
11. **Venda no balcão (Frente O):** existe **venda direta ao consumidor / balcão**? Se sim, precisamos de **NFC-e (modelo 65) + PDV + caixa/turno**. Se é 100% B2B (NF-e 55), a Frente O é dispensável.
12. **Estado(s) de atuação (Frente F):** em quais **UFs** você vende? Isso define **FCP** (varia por estado), alíquotas interestaduais e regras de ST/DIFAL.
13. **Contabilidade (Frente P):** você quer a **escrituração contábil dentro do sistema** (partida dobrada + balancete, para gerar ECD/ECF) ou isso continua **100% com o contador** (sistema só entrega os dados)?
14. **Importação (Frente Q):** hoje os itens importados você compra **de um importador/distribuidor nacional** (a mercadoria já entrou no Brasil no nome de outro) ou você **importa direto** (DI/DUIMP no seu CNPJ)? No 1º caso, Q é só **marcar `Produto.origem` = "2 — Estrangeira, adquirida no mercado interno"** — nada a construir. No 2º caso precisamos da Frente Q completa (NF-e de importação CFOP 3.xxx, II/IPI/PIS-COFINS-importação, ICMS via GARE-SP, Siscomex/AFRMM, fornecedor estrangeiro, moeda/câmbio e rateio do custo de nacionalização no custo do produto). **Qual dos dois é o seu caso hoje?**

---

## Recomendações do implementador (defaults para destravar a execução)

> Enquanto você não responder cada decisão, seguimos com estes **defaults sensatos**. Todos foram desenhados para serem **configuráveis** — se depois você mudar de ideia, é ajuste de parâmetro, não retrabalho de arquitetura. Cada default é reversível.

1. **Base da comissão:** comissão sobre o **valor de produtos** (subtotal sem impostos/frete), **snapshot no pedido**, com **vencimento acumulado no dia 5 do mês seguinte** (uma conta a pagar por vendedor/mês, não uma por nota). → Campo `baseComissao` (`PRODUTOS` | `TOTAL` | `MARGEM`) e `diaVencimentoComissao` configuráveis por tenant.
2. **Vendedor externo vs interno:** **model `Vendedor` próprio** com `usuarioId?` opcional. Cobre representante sem login e vendedor interno com login. (Já é a recomendação da Frente B.)
3. **Comissão na venda ou no recebimento:** gerar na **emissão da NF-e** (`nfe.emitida`), porém com flag `comissaoNoRecebimento` (default `false`). Se ligada, a comissão só é **liberada** quando o título do cliente é baixado. Estorna em cancelamento/devolução.
4. **Folha:** **líquido a pagar por competência** (proventos − descontos manuais), **sem** cálculo trabalhista oficial (INSS/FGTS/13º/férias ficam com o contador). Encargos entram como lançamento manual separado (3.2.02). Evita virar sistema de RH.
5. **Pagamento do motorista:** **valor fixo por rota/romaneio** como default, com tabela opcional por faixa; suportar também **diária por dia trabalhado**. Campo `tipoRemuneracao` (`ROTA` | `ENTREGA` | `KM` | `DIARIA`) no cadastro. Default `ROTA`.
6. **Fiscal real:** presumir que **ainda não vai emitir valendo** → manter **modo simulação** + fazer só o **quick win F.1** (selo "simulação" + persistir MDF-e/CT-e) e a **correção de cálculo F.1b**. A integração real F.2 (certificado A1 + PlugNotas/Focus) fica **atrás de flag**, ligada quando você confirmar o certificado.
7. **Cobrança:** **gateway (Asaas)** como default (integração rápida, PIX+boleto, webhook), atrás de interface `ProvedorCobranca` para permitir trocar por CNAB bancário depois sem reescrever a Frente H.
8. **Regime tributário:** presumir **Simples Nacional** (o mais comum p/ o porte) → guias **DAS**, CSOSN no lugar de CST. O `regimeTributario` já existe no cadastro; F.1b passa a **respeitá-lo no cálculo** (hoje é ignorado). Trocar para Presumido/Real é mudar o campo, não o código.
9. **Tesouraria:** começar com **1 conta bancária + 1 caixa** e **conciliação por OFX** (importar extrato do internet banking). Multi-conta já no schema, só não exige configuração inicial.
10. **Serviços/ISS:** presumir **só mercadoria** (sem NFS-e/ISS) por enquanto. Deixar `modules/nfse` como stub atrás de flag `emiteServico` (default `false`). Se cobrar frete próprio como serviço depois, liga a flag.
11. **Venda no balcão:** presumir **100% B2B (NF-e 55)** → **Frente O (PDV + NFC-e) fica adiada**, não descartada. Nada de PDV até você confirmar venda de balcão.
12. **UFs de atuação:** presumir **venda dentro de SP** (operação interna) como caminho principal; DIFAL/FCP/ST interestadual entram **parametrizados por UF** (tabela de alíquotas), ativados quando surgir venda para outro estado. Casa com "a maioria é feito em São Paulo".
13. **Contabilidade:** presumir **sistema entrega os dados, escrituração fica com o contador** → **Frente P adiada**. Mas **já populando `LancamentoFinanceiro`** desde a Frente A, de modo que, no dia que quiser ECD/ECF interno, a base já existe.
14. **Importação:** presumir **cenário (a) — compra de importador nacional** → Frente Q é só **marcar `Produto.origem = 2`** no cadastro e usar essa origem no cálculo (parte da F.1b). A Frente Q completa (importação direta) fica adiada até você confirmar DI/DUIMP no próprio CNPJ.

**Consequência prática desses defaults na ordem de trabalho:** o caminho fica **A → B → G → I → C → D → K → L → M**, com **F.1b** (corrigir cálculo respeitando Simples/CSOSN/origem) como o bloco fiscal prioritário, e **N (qualidade)** transversal. Ficam **adiadas** (atrás de flag, sem apagar do roadmap): F.2 (SEFAZ real), O (PDV/NFC-e), P (contabilidade), Q (importação direta), F.2b (NFS-e). Todas reativáveis quando você confirmar certificado / balcão / importação direta.

## Estado deste roadmap

- [ ] Frente A — Plano de Contas + Despesas no DRE
- [ ] Frente B — Vendedor + comissão automática
- [ ] Frente C — Pessoas pagáveis + folha simples
- [ ] Frente D — Diária/frete de motorista
- [ ] Frente E — UX popovers/menus de contexto
- [ ] Frente F — Fiscal real + MDF-e/CT-e persistidos
- [ ] Frente G — Tesouraria (contas/caixa) + conciliação
- [ ] Frente H — Cobrança real (boleto/PIX/CNAB)
- [ ] Frente I — Despesas recorrentes
- [ ] Frente J — Obrigações acessórias + guias de imposto
- [ ] Frente K — Notificações e alertas
- [ ] Frente L — Relatórios gerenciais avançados
- [ ] Frente M — Devolução de compra + precificação por tabela
- [ ] Frente N — Qualidade (testes/backup/LGPD) — transversal
- [ ] Frente O — PDV + NFC-e (modelo 65) — se vende balcão
- [ ] Frente P — Contabilidade partida dobrada + livros fiscais
- [ ] Frente Q — Importação de mercadoria — só se importar direto (DI/DUIMP)

> Próximo passo sugerido: detalhar e executar a **Frente A** (é a fundação — sem ela, comissão/folha/diária/tesouraria/recorrentes não têm onde "cair" no resultado). A Frente **N (qualidade)** começa junto e nunca termina.

---

## Cobertura — este roadmap agora endereça o ciclo inteiro

**Operacional (já pronto):** compra/entrada por XML · estoque/WMS/inventário · pedidos · precificação básica · limite de crédito · NF-e 55 (simulada) · devolução de venda · CC-e · rotas/entrega · auditoria.
**Financeiro a construir:** categorização/DRE real (A) · comissão (B) · folha (C) · diária motorista (D) · tesouraria/caixa (G) · cobrança real (H) · despesas recorrentes (I) · guias/obrigações (J) · devolução de compra (M) · contabilidade partida dobrada + livros (P).
**Gestão/UX:** popovers/menus (E) · notificações (K) · relatórios avançados (L).
**Fiscal legal (Brasil):** corrigir cálculo por regime/CST/CSOSN/FCP/PIS-COFINS (F.1b) · emissão real SEFAZ + certificado + inutilização + manifestação DF-e (F.2) · NFS-e/serviços (F.2b) · MDF-e/CT-e · NFC-e + PDV (O) · SPED Fiscal/Contribuições/ECD/ECF/EFD-Reinf/Bloco K/eSocial/SINTEGRA/GIA/DeSTDA + guias DAS/DARF (J) · reforma IBS/CBS + IS (F/fiscal-reforma).
**Base:** qualidade/testes/backup/LGPD (N).
**Comércio exterior:** importação direta com DI/DUIMP, impostos de importação e rateio de custo (Q) — só quando/se importar no próprio CNPJ.

Se aparecer algo fora dessas **17 frentes (A–Q)** durante a execução, registrar aqui antes de codar. Conformidade fiscal específica (obrigações estaduais/municipais do seu caso) deve ser **validada com o contador** frente a frente.
