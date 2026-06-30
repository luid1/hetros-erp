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
