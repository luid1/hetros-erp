# PLANO — Offline-first (CD + rua)

> Documento de decisão. Nada aqui foi implementado ainda (exceto a Fase 0, já feita).
> Objetivo: o sistema continuar operando sem internet no CD e na rua, sincronizando
> quando a conexão volta — **sem inventar dados que precisam ser autoridade do servidor**.

**Status:** aguardando aprovação do luid1 para iniciar a Fase 1.

---

## Princípio que não muda (o limite técnico)

Algumas operações **não podem** ser 100% offline porque o servidor precisa ser a fonte
única da verdade. Se forem feitas offline, geram dado inválido/duplicado:

| Operação | Pode offline? | Por quê |
|---|---|---|
| Criar CI/OC | ✅ Sim | Rascunho; o número/aprovação vêm depois, no servidor |
| Consultar preços/produtos/estoque | ✅ Sim (leitura em cache) | Só leitura; mostra o último conhecido |
| Registrar contagem/observação | ✅ Sim | Anexa ao mestre depois |
| **Numeração fiscal/sequencial** (nº da OC, NF-e, romaneio) | ❌ Não | Precisa ser atômica no servidor senão duplica |
| **Baixa de estoque definitiva** | ❌ Não | Dois aparelhos offline baixariam o mesmo saldo |
| **Emitir NF-e / transmitir SEFAZ** | ❌ Nunca | Exige internet + certificado + retorno da SEFAZ |

**Regra de ouro do offline-first aqui:** offline captura *intenção* (fila/outbox); o
servidor confirma e carimba os números quando sincroniza. O usuário vê "pendente de
sincronização" até confirmar.

---

## Fases (ordem de valor × risco)

### Fase 0 — Fila offline da CI (app dos compradores) ✅ FEITO
- Outbox no `compradores-app` (AsyncStorage): CI sem internet é salva e reenviada sozinha.
- Idempotência no backend via `clientRef` (único por tenant) — reenvio não duplica OC.
- Verificado: 2 POSTs com o mesmo `clientRef` → mesma OC.

### Fase 1 — Documento da OC + compartilhar (parcial ✅)
- Web: Pedido de Compra imprimível/PDF (`impressoOC.ts`) ✅ feito e verificado.
- App: botão "Enviar no WhatsApp" (React Native `Share`, texto formatado) — **a fazer**.

### Fase 2 — Web ERP do CD: leitura offline (read-through cache)
*O primeiro passo real do "CD funciona sem internet".*
- **Service Worker** (via `vite-plugin-pwa`) para servir o app (HTML/JS/CSS) sem rede —
  hoje, sem net, a página nem carrega.
- **Cache de leitura** das telas críticas do CD em **IndexedDB** (produtos, saldo de
  estoque, pedidos do dia, posições): last-known-good, com selo "dados de HH:MM (offline)".
- Telas alvo (as que o CD usa no chão): Posição de Estoque, Separação (Líder/Operacional),
  Perecíveis, Pedidos do dia.
- Risco: baixo (só leitura). Entrega: "se cair a net, o CD ainda enxerga e separa".

### Fase 3 — Web ERP do CD: escrita offline (outbox + sync)
*O passo pesado. Só depois da Fase 2 estável.*
- Fila de escrita genérica (outbox) no navegador para as ações **seguras** offline:
  contagem de inventário, marcar separação, criar pedido rascunho, criar CI.
- Motor de sincronização: reenvia em ordem, com `clientRef` de idempotência em cada rota
  que aceitar escrita offline (mesmo padrão da Fase 0, estendido).
- Conflitos: resolução simples "servidor vence" para mestres; para contagem, soma/merge.
- **Fora do escopo offline** (continuam exigindo net, com aviso claro): faturar/emitir
  NF-e, baixa definitiva de estoque, aprovação que gere número fiscal.

### Fase 4 — Robustez
- Detecção de reconexão (evento `online`/`offline` + retry com backoff).
- Indicador global "🟢 online / 🟡 offline — N pendências" no topo (hoje o pontinho é fake).
- Limpeza/expiração de cache; limites de tamanho no IndexedDB.

---

## Decisões que preciso de você

1. **Quais telas do CD são realmente usadas sem internet?** (confirmar a lista da Fase 2)
2. **O CD tem PCs ou tablets?** (muda service worker vs. app instalável/PWA)
3. **Prioridade:** Fase 2 (ler offline) já resolve boa parte da dor? Ou a escrita offline
   no CD (Fase 3) é obrigatória desde já?

---

## Estimativa grosseira (para calibrar expectativa)
- Fase 1 (WhatsApp no app): pequena.
- Fase 2 (PWA + leitura offline): média — vários dias, tela a tela.
- Fase 3 (escrita offline + sync): grande — é praticamente um subsistema; feita por partes.
