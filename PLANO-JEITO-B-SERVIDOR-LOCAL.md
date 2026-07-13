# PLANO — Jeito B: Servidor local no CD (offline-first robusto)

> **Decisão do luid1 (2026-07-13):** seguir o **Jeito B** — um servidor local no CD, para
> que várias pessoas operem juntas sem internet, sincronizando com a nuvem quando volta.
>
> Este é o item mais pesado do projeto. Nada aqui foi implementado ainda — é o desenho
> para aprovar antes de codar. Substitui a Fase 3 "offline no navegador" do
> `PLANO-OFFLINE-FIRST.md` para o CD (o app dos compradores segue como já está: Fase 0 ✅).

---

## 1. Arquitetura em uma frase

Um **mini-PC no CD** roda o mesmo sistema (Docker: Postgres + backend + frontend). Os PCs
do CD acessam **esse servidor local** (rede interna do galpão), então funcionam mesmo com a
internet caída. Esse servidor conversa com a **nuvem** (o servidor atual) quando há internet.

```
   [ NUVEM ]  ← servidor atual (fonte da verdade + fiscal/SEFAZ)
       ↑↓  sincronização (quando há internet)
   [ CD NODE ] ← mini-PC no galpão (Postgres + backend locais)
       ↑ rede interna (sempre funciona)
   [PC1] [PC2] [PC3] ... ← estações do CD
```

## 2. Quem manda em quê (a regra que evita conflito)

Conflito nasce quando **dois lugares escrevem o mesmo dado**. Evitamos dando **um dono para
cada tipo de dado** — assim a sincronização é quase toda de mão única:

| Dado | Dono (quem escreve) | Direção do sync |
|---|---|---|
| Produtos, clientes, fornecedores, tabelas de preço | **Nuvem** | Nuvem → CD (o CD só lê) |
| Movimento de estoque, separação, recebimento, contagem | **CD** | CD → Nuvem |
| CI/OC criada no CD | **CD** (rascunho) | CD → Nuvem (nuvem confirma nº) |
| **NF-e / emissão fiscal** | **Nuvem** (exige SEFAZ) | nunca no CD offline |
| Financeiro (contas, DRE) | **Nuvem** | Nuvem → CD (leitura) |

> Onde os dois precisam escrever o mesmo registro (raro), a regra é **"a nuvem vence"** para
> cadastros e **soma/merge** para quantidades (ex.: duas contagens do mesmo item).

## 3. Os problemas difíceis (e como resolvo)

1. **Numeração única (OC, romaneio) sem colidir.**
   Cada nó ganha uma **faixa/prefixo** (ex.: CD usa prefixo `CD-`), ou o número **definitivo é
   carimbado pela nuvem** na sincronização, usando o `clientRef` de idempotência que já criei
   na Fase 0. O usuário vê "nº provisório" até sincronizar.

2. **Estoque não pode ser baixado duas vezes.**
   A baixa **definitiva** de estoque para faturamento fica na nuvem (que também guarda a NF-e).
   No CD offline, movimentos são registrados como **eventos** (log) e aplicados/conferidos na
   sincronização, não como saldo final concorrente.

3. **Ordem dos eventos.**
   Sync baseado em **change-log** (cada mudança vira um registro com timestamp + origem +
   `clientRef`). Reenvia em ordem, idempotente — reenvio não duplica.

4. **NF-e é sagrada.**
   Emitir nota **sempre** exige internet + nuvem + SEFAZ. Offline, a tela de faturamento fica
   bloqueada com aviso claro ("sem internet — emissão indisponível"). Zero risco de nota inválida.

## 4. Fases de implementação (entrego por partes, testável a cada uma)

- **P1 — Empacotar o "CD node" (1 comando).**
  Docker-compose que sobe Postgres + backend + frontend no mini-PC, com config apontando o
  "upstream" (nuvem). Base para tudo. *(Menor risco; já temos docker-compose.)*

- **P2 — Puxar dados de referência (Nuvem → CD).**
  O CD node baixa e mantém atualizados produtos/clientes/fornecedores/preços/saldo inicial.
  Resultado: o CD **enxerga tudo** mesmo sem internet.

- **P3 — Empurrar operações do CD (CD → Nuvem) com idempotência.**
  Change-log + motor de sync das operações do CD (movimento, separação, CI). Estende o
  padrão `clientRef` da Fase 0. Resultado: o CD **opera e sincroniza** de verdade.

- **P4 — Robustez e monitor.**
  Detecção de online/offline, painel "pendências a sincronizar", reprocesso de falhas,
  alarme se ficar dessincronizado por muito tempo.

## 5. O que VOCÊ precisa providenciar (pré-requisito de hardware)

- **Um mini-PC/computador sempre ligado no CD**, na mesma rede dos outros PCs. Não precisa ser
  potente (um mini-PC ou um desktop simples serve). Ele roda o Docker.
- **Rede interna** no CD (os PCs já estão em rede? Wi-Fi/cabo do galpão).
- IP fixo local pro CD node (ex.: `192.168.x.x`) pros PCs apontarem.

Sem esse mini-PC, o Jeito B não existe — é o coração dele.

## 6. Expectativa honesta de tempo

Isto é **semanas de trabalho**, entregue em partes (P1→P4). Não é um "faço hoje". Mas cada
fase já entrega valor testável: P1+P2 sozinhas já fazem o CD **enxergar tudo offline**, que
é metade da dor.

---

## Próximo passo proposto
Começar pela **P1** (empacotar o CD node em 1 comando) — é a fundação, é de baixo risco, e
me deixa validar o mini-PC antes de investir no motor de sync (P3, o pesado). Aguardando seu
ok pra iniciar a P1 **e** a confirmação de que o mini-PC no CD é viável.
