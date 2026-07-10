# 🗺️ Mapa de Correções — Hetros ERP

> Auditoria completa de fluxo, segurança e arquitetura.
> Data: 2026-07-10 · Autor da revisão: Claude (revisão técnica solicitada por luid1)
> Objetivo: fotografar TODOS os problemas encontrados e definir por onde começar.

---

## 📌 Veredito em uma frase

O **esqueleto é bom** (schema maduro, arquitetura event-driven, módulo financeiro sólido), mas **não dá para rodar com equipe real hoje**: há bugs que corrompem o estoque, portas de acesso abertas na API, uma tela de decisão (DRE) com dado fictício, e gordura de telas/módulos duplicados. Corrigir só a reserva de estoque **não** é suficiente — são problemas independentes.

**Ordem recomendada:** P0 (bloqueadores) → P1 (sérios) → P2 (higiene de telas/arquitetura) → P3 (funcionalidades faltantes conforme o processo).

---

## 🚦 Legenda

| Severidade | Significado |
|---|---|
| 🔴 P0 | Bloqueador — causa prejuízo financeiro, fraude ou dado corrompido. Corrigir antes de operar com equipe. |
| 🟠 P1 | Sério — quebra no uso normal, mais cedo ou mais tarde. |
| 🟡 P2 | Médio — higiene, morde no fechamento contábil ou confunde o operador. |
| 🟢 P3 | Melhoria/faltante — depende do processo real da empresa. |

Esforço: **P** (pequeno, ~horas) · **M** (médio, ~1-2 dias) · **G** (grande, dias).

---

## 🔴 FASE P0 — Bloqueadores (começar por aqui)

### P0-1 · Reserva de estoque nunca é liberada
- **O quê:** `quantidadeReservada` só é incrementada, nunca decrementada em todo o projeto. Ao confirmar um pedido a reserva sobe; ao faturar, o físico baixa mas a reserva **permanece**, subtraindo o disponível em dobro. Ao cancelar o pedido, a reserva também não volta.
- **Impacto:** todo saldo "disponível" fica errado a partir do 1º dia. O relatório **"A Comprar"** dispara alarmes falsos → compra do que já se tem.
- **Onde:** `backend/src/modules/estoque/estoque.service.ts:143`, `backend/src/modules/pedidos/pedidos.service.ts:467` e `:493`.
- **Correção:** criar `estoque.liberarReserva()` e chamá-lo (a) no faturamento (`nfe.emitida`) e (b) no cancelamento de pedido. Recalcular `quantidadeDisponivel` corretamente.
- **Esforço:** M · **Requer teste do ciclo** confirma → fatura → cancela.

### P0-2 · RBAC não é aplicado em Compras, Recebimento e Carga
- **O quê:** o `PermissoesGuard` **não é global**; cada controller precisa ligá-lo, e `compras`, `entradas` e `carga` **não ligam**. O decorator de permissão nesses módulos é no-op.
- **Impacto:** qualquer usuário logado (separadora, motorista) pode, batendo direto na API, **criar/receber Ordem de Compra** (dá entrada no estoque e **gera Contas a Pagar** em nome de fornecedor) e dar entrada de nota. Risco de **fraude**, não só bug.
- **Onde:** `backend/src/app.module.ts` (guard ausente nos providers globais), `backend/src/modules/compras/compras.controller.ts`, `entradas`, `carga`.
- **Correção:** registrar `PermissoesGuard` como `APP_GUARD` global **ou** garantir `@UseGuards(PermissoesGuard)` + `@RequirePermissao(...)` em todos os controllers de mutação.
- **Esforço:** P.

### P0-3 · Vazamento entre filiais (x-filial-id pelo header, sem validação)
- **O quê:** a filial atual vem do header `x-filial-id` e **nunca é validada** contra as filiais do usuário (`UsuarioFilial`).
- **Impacto:** um operador do Box A troca o header e lê/movimenta/transfere o Box B. Isolamento entre **empresas** está ok; entre **filiais**, não.
- **Onde:** `backend/src/common/decorators/context.decorator.ts` (`CurrentFilial`).
- **Correção:** validar no guard/interceptor que `x-filial-id ∈ filiais do usuário`; senão 403.
- **Esforço:** P.

### P0-4 · Faturamento engole falhas em silêncio
- **O quê:** no listener `nfe.emitida`, a baixa de estoque e a geração do título estão em `try/catch` que só loga. O listener não é transacional.
- **Impacto:** **NF-e sai autorizada mas o estoque não baixa e/ou o Contas a Receber não é criado** — ninguém percebe. Entrega e não cobra.
- **Onde:** `backend/src/modules/nfe/nfe.service.ts:243` (e o handler `handleNFeEmitida`).
- **Correção:** transação no handler; em caso de falha, marcar a NF-e como "pendente de baixa/financeiro" e alertar (fila de retry), nunca seguir em silêncio.
- **Esforço:** M.

### P0-5 · DRE mostra dado fictício (hardcoded)
- **O quê:** a tela "DRE & Relatórios" (destaque do menu) renderiza uma constante fixa `DRE_MES = [...]`; o backend `dre.service` retorna `[]`.
- **Impacto:** decisão financeira sobre número inventado. Parece pronto — engana.
- **Onde:** `frontend/src/modules/financeiro/pages/FinancialHub.tsx:69`, `backend/src/modules/dre/dre.service.ts`.
- **Correção:** implementar o DRE real no backend (a partir de `LancamentoFinanceiro`/`PlanoContas`) ou **sinalizar a tela como "demonstração"** até implementar.
- **Esforço:** G (DRE real) / P (rotular como demo).

### P0-6 · Validação de entrada parcial — aceita valores negativos
- **O quê:** o `ValidationPipe` global é bom, mas 18 arquivos recebem `dto: any`, desligando a validação (compras, entradas, fiscal, inventario, produtos, usuarios e todos os cadastros).
- **Impacto:** OC com **preço unitário negativo** → Conta a Pagar negativa; produto com **preço/margem negativos**; cadastros sem formato.
- **Onde:** ver lista em `grep "dto: any"`; ex.: `backend/src/modules/compras/compras.service.ts`, `produtos`, `entradas`, `fiscal`.
- **Correção:** criar DTOs tipados com `class-validator` (`@Min(0)`, `@IsNotEmpty`, etc.) para todos os endpoints de mutação.
- **Esforço:** M.

---

## 🟠 FASE P1 — Sérios (logo depois dos bloqueadores)

### P1-1 · Nada é atômico nas transições
- `confirmar` (pedido), `receber` (OC) e o listener de faturamento fazem loop de escritas **sem `$transaction`**. Queda no meio deixa estado quebrado (metade reservado; estoque dentro sem Contas a Pagar).
- **Onde:** `pedidos.service.ts:441`, `compras.service.ts:179`, `nfe.service.ts` (handler).
- **Correção:** envolver em `$transaction`. **Esforço:** M.

### P1-2 · `confirmar` sem idempotência → reserva dobrada
- Clicar "aprovar" 2× reserva o estoque 2× (sem checagem de status inicial).
- **Onde:** `pedidos.service.ts:441`. **Correção:** barrar se já ≠ RASCUNHO. **Esforço:** P.

### P1-3 · Máquina de estados do pedido é livre
- `updateStatus` aceita qualquer pulo (RASCUNHO → ENTREGUE direto), pulando separação/faturamento/estoque/financeiro.
- **Onde:** `pedidos.service.ts:309`. **Correção:** tabela de transições válidas. **Esforço:** M.

### P1-4 · Numeração sequencial com corrida
- Pedido, NF-e e OC pegam número com `findFirst(desc)+1` — dois faturamentos simultâneos = número duplicado → `@@unique` derruba com 500, sem retry.
- **Onde:** `nfe.service.ts:59`, `pedidos.service.ts:128`, `compras.service.ts:111`.
- **Correção:** sequência atômica (contador transacional ou `SELECT ... FOR UPDATE`/upsert). **Esforço:** M.

### P1-5 · Deletes destrutivos (hard delete) em dados-mestre
- `clientes`, `fornecedores`, `transportadoras`, `usuarios`, `pedidos`, `compras`, `carga`, `fiscal` fazem `prisma.delete()` físico, apesar do campo `ativo` (soft-delete intencional).
- **Impacto:** apagar mestre com histórico → erro de FK ou perda de rastro; usuário apagado quebra a trilha de auditoria.
- **Correção:** soft-delete (`ativo=false`) para mestres com histórico. **Esforço:** M.

### P1-6 · Zero testes automatizados
- Nenhum `.spec`/`.test` no projeto. Toda correção é no escuro.
- **Correção:** criar testes ao redor de cada correção P0 (estoque/reserva, faturamento, RBAC). **Esforço:** G (contínuo).

---

## 🟡 FASE P2 — Higiene de telas e arquitetura

### P2-1 · Telas sobrepostas / duplicadas
- **Financeiro:** `FinancialHub` (`/financeiro/dre`) **e** `ControladoriaHub` (`/financeiro/controladoria`) — dois master-views concorrentes. Consolidar em um.
- **Fiscal:** `Faturamento` (`/fiscal/emitir`), `PainelFaturamento` (`/fiscal/painel`) e `GestaoFiscal` (`/fiscal/gestao`) cobrem o mesmo território. Definir 1 para emitir + 1 para consultar.
- **Logística:** `Lider`, `Operacional` (que embute `SeparacaoPesagem`), `ControleCarga`, `TorreControle` — enxame de telas de separação/pátio. Consolidar em ~2.
- **Esforço:** M.

### P2-2 · Módulos de backend mortos / stub
- `dre.service` → stub (`return []`). `movimentacoes.service` → stub (a tela usa `estoque.service`). `invoices` → módulo fiscal completo **que nenhuma tela usa**.
- **Correção:** implementar (DRE) ou remover (movimentacoes, invoices) para não confundir. **Esforço:** P/M.

### P2-3 · Duplicidade arquitetural (dois donos da mesma verdade)
- **NF-e vs Invoice:** dois modelos de nota fiscal no schema. O fluxo real usa `NFe`; `Invoice` é órfão. Escolher **um**.
- **Romaneio vs Route:** dois modelos de entrega sem sincronização. Escolher **um**.
- **Esforço:** M/G (envolve migração de dados/decisão).

### P2-4 · Dinheiro em float no pedido
- `montarItensETotais` usa multiplicação JS crua, enquanto o financeiro usa `money.util`. Total do pedido diverge do total da NF-e/título por centavos.
- **Onde:** `pedidos.service.ts:72`. **Correção:** usar `money.util` (inteiro/centavos). **Esforço:** P.

### P2-5 · Recebimento parcial de OC inexistente
- Enum tem `PARCIAL` e item tem `quantidadeRecebida`, mas `receber` sempre recebe tudo e marca ENTREGUE; **não cria `EntradaMercadoria`** (então `ContaPagar.entradaId` fica nulo).
- **Onde:** `compras.service.ts:179`. **Correção:** recebimento parcial real + gerar `EntradaMercadoria`. **Esforço:** M.

### P2-6 · Rastreabilidade de lote fura no FLV
- A separadora separa um lote físico, mas a baixa no faturamento é FEFO automática — pode baixar lote diferente do que saiu. Para cliente com `exigeRastreabilidade`, o lote na NF-e pode não bater.
- **Onde:** `nfe.service.ts:234`. **Correção:** baixar o lote efetivamente separado. **Esforço:** M.

### P2-7 · Auditoria rasa
- O `AuditInterceptor` grava só `dadosDepois` (nunca `dadosAntes`) e usa a URL como `entidade`. Vê-se *que* mudou, não *o que* mudou.
- **Onde:** `common/interceptors/audit.interceptor.ts`. **Correção:** capturar snapshot antes + nome real da entidade/ID. **Esforço:** M.

### P2-8 · Migration única (risco de drift)
- Só existe `20260708000000_baseline`. Verificar `prisma migrate status` antes de subir; gerar migrations para mudanças pós-baseline.
- **Esforço:** P.

---

## 🟢 FASE P3 — Funcionalidades faltantes (conforme o processo real)

Só implementar as que o dia a dia usar:

- **Conciliação bancária / contas bancárias** — não há modelo `Banco`/`ContaBancaria`; entra dinheiro por boleto/pix mas não há onde conciliar extrato × títulos.
- **Fechamento de caixa diário (PDV do box)** — abertura/sangria/fechamento.
- **Acerto de consignação** — `Fornecedor.tipoParceria = CONSIGNACAO` existe, mas não há tela de acerto (vendi X, devolvi Y, pago Z ao produtor).
- **Cotação formal de compra (multi-fornecedor)** — comparar preço de 3 fornecedores antes da OC.
- **Tabela de preços gerenciável** — `Cliente.tabelaPreco` é texto solto.
- **Comissão** (vendedor/comprador) — inexistente.
- **Ordem de produção / beneficiamento** — se a operação embala/fraciona/monta cesta, falta o núcleo "industrial" (BOM, ordem de produção). Se é só revenda FLV, dispensável.
- **Relatório de produtividade da separação** (kg/hora por separador) — o dado existe (`pesoAferido`, `usuarioId`), a tela não.

---

## ✅ O que já está BOM (referência de padrão)

- **Financeiro (Contas a Receber/Pagar):** `$transaction`, `HistoricoFinanceiro` append-only, baixa parcial, `money.util`. É o modelo a seguir.
- **Isolamento entre empresas (tenant):** JWT + `TenantInterceptor` bloqueiam injeção de `tenantId`. Guard JWT global. Secret de produção protegido. Rate limiting ligado.
- **Validação de faturamento** (`fiscal.validarFaturamento`): trava sério (status, cliente, CNPJ, endereço, crédito, estoque físico, NCM, emitente).
- **Inventário:** ajuste gera movimentação real de estoque (`AJUSTE_POSITIVO/NEGATIVO`) e marca `ajusteGerado`.
- **Segurança de repositório:** `.env` no `.gitignore` (nenhum segredo versionado); CORS por variável de ambiente; filtro global de exceções.

---

## 🔎 O que NÃO dá para afirmar só lendo o código

1. **Aderência ao processo real** — as telas "faltantes" (P3) só importam se o seu dia a dia usa. Decisão sua.
2. **Comportamento em runtime** — rodar o ciclo confirma → fatura → cancela no localhost prova o tamanho do estrago da reserva e valida a correção.
3. **Concorrência e drift** — corrida de numeração e drift de migration só aparecem com carga real / olhando o banco.

---

## 🏁 Sugestão de por onde começar

**Sprint 1 (segurança + integridade — o que mais expõe):**
1. P0-2 (RBAC global) + P0-3 (validação de filial) — fecham as portas abertas.
2. P0-1 (liberar reserva) + P1-1/P1-2 (transação + idempotência) — devolvem a confiança no estoque.
3. Criar os **primeiros testes** cobrindo esses fluxos (P1-6).

**Sprint 2 (dinheiro sem mentira):**
4. P0-4 (faturamento não engolir falha) + P0-5 (DRE real ou rotulado) + P2-4 (dinheiro em centavos).
5. P0-6 (DTOs com validação).

**Sprint 3 (higiene):**
6. P2-1 (consolidar telas) + P2-2/P2-3 (matar código morto e escolher NFe/Romaneio).

Depois, P3 conforme prioridade do negócio.
