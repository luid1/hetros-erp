# HETROS — Agente Local (balança + impressão térmica)

Um único serviço, empacotável em **`.exe` clicável**, que roda em cada máquina do galpão e faz a
ponte entre o ERP (navegador) e o hardware:

| Recurso            | Como o ERP usa                                   | Porta |
| ------------------ | ------------------------------------------------ | ----- |
| **Balança** PRIX TI200 | WebSocket — o hook `useBalanca.ts` já conecta   | `8765` |
| **Impressão térmica**  | HTTP POST com a nota em JSON → sai em ESC/POS   | `3131` |

O formato da mensagem da balança é **idêntico** ao antigo `balanca_ws.py` (`"peso,estavel"`),
então **o ERP não muda nada** pra ler o peso. A impressão é o serviço novo.

---

## 1. Rodar em desenvolvimento (com Node instalado)

```bash
cd agente-local
npm install
npm start
```

Ou dê **duplo clique** em `HETROS Agente.bat` (usa o `.exe` se existir, senão cai no `node index.js`).

Teste rápido do status (com o agente rodando):

```
http://localhost:3131/status
```

---

## 2. Configuração — `config.json`

Fica **ao lado do `.exe`** (dá pra editar sem recompilar). Principais campos:

- `balanca.porta` — COM da balança (padrão `COM4`).
- `impressora.modo` — como enviar os bytes:
  - **`share`** (recomendado): imprime numa **impressora compartilhada do Windows**.
    Compartilhe a térmica (Painel de Controle → Impressoras → Propriedades → Compartilhamento),
    dê um nome (ex.: `POS80`) e coloque em `impressora.share`.
  - `serial` — porta `COM`/`LPT` direta (`serialPorta`, `serialBaud`).
  - `tcp` — impressora de rede (Ethernet) na porta 9100 (`tcpHost`, `tcpPort`).
- `impressora.colunas` — 48 (bobina 80mm) ou 32 (58mm).
- `impressora.codepage` — `CP860` (Português) para acentos corretos.
- `empresa.*` — cabeçalho que sai no cupom/bilhete.

---

## 3. Endpoints de impressão (o ERP chama)

| Método | Rota                 | Corpo (JSON)          | O que faz                    |
| ------ | -------------------- | --------------------- | ---------------------------- |
| GET    | `/status`            | —                     | Estado (balança + impressora)|
| POST   | `/imprimir/cupom`    | `{ pedido, nfe? }`    | Cupom fiscal (estilo NFC-e)  |
| POST   | `/imprimir/bilhete`  | `{ pedido }`          | Bilhete separador (picking)  |
| POST   | `/imprimir/raw`      | `{ base64 }`          | Bytes ESC/POS crus           |

O `pedido`/`nfe` usam o **mesmo formato** do `notaTermica.ts` (cliente, itens, valorTotal, etc.).

### Como chamar do ERP (front-end)

Já existe o helper `frontend/src/modules/logistica/agenteImpressao.ts`:

```ts
import { imprimirCupomAgente, agenteStatus } from '../agenteImpressao';
import { imprimirCupomFiscal } from '../notaTermica';

async function imprimir(pedido, nfe) {
  const st = await agenteStatus();          // agente rodando nesta máquina?
  if (st?.impressora?.ativa) {
    const r = await imprimirCupomAgente(pedido, nfe);   // sai direto na térmica
    if (r.ok) return;
  }
  imprimirCupomFiscal(pedido, nfe);         // fallback: janela do navegador
}
```

Exemplo cru (sem o helper):

```js
await fetch('http://localhost:3131/imprimir/cupom', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pedido: { numero: 123, itens: [/* ... */], valorTotal: 250.0 } }),
});
```

---

## 4. Gerar o `.exe` (Windows)

Usa o [`pkg`](https://github.com/vercel/pkg), que embute o Node no binário:

```bash
cd agente-local
npm install
npm run build      # → dist/HETROS-Agente.exe
```

**Distribuir p/ as máquinas** — copie a pasta com:

```
HETROS-Agente.exe          (de dist/)
config.json                (ao lado do exe — editável)
```

> **Módulo nativo (balança):** o `serialport` traz um `.node` compilado. O `pkg` já foi
> configurado (em `package.json > pkg.assets`) para embutir os `prebuilds`. Se a balança não
> abrir no exe, copie a pasta `node_modules/@serialport/bindings-cpp/prebuilds` para junto do
> `.exe`. A **impressão no modo `share`/`tcp` não usa o serialport** e funciona de qualquer jeito.

### Iniciar junto com o Windows (opcional)
Coloque um atalho do `HETROS-Agente.exe` (ou do `.bat`) na pasta:

```
shell:startup
```

(Win+R → digite `shell:startup` → Enter → cole o atalho.)

---

## 5. Segurança / observações

- Serve só em `localhost` para o navegador da própria máquina; o WebSocket da balança escuta em
  `0.0.0.0:8765` (como o bridge Python) p/ permitir um touch em outra máquina — libere a porta no
  Firewall se for esse o caso.
- As notas saem com **"SEM VALOR FISCAL"** (modo teste) — não transmitem à SEFAZ.
- Substitui o `balanca_ws.py` + a impressão via diálogo do navegador por **um serviço só**.
