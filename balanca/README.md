# Ponte da Balança — PRIX TI200 → WebSocket

Script Python que roda **no computador do touch** (onde a balança está ligada na
serial COM4) e expõe o peso via WebSocket para o ERP.

- Lê a balança PRIX TI200 na serial (`COM4`, 4800 baud por padrão).
- Publica o peso em `ws://localhost:8765` no formato `peso,estavel` (ex.: `12.340,1`).
- O ERP conecta nesse WebSocket para ler o peso em tempo real.

## Rodar

```
pip install pyserial websockets
python balanca_ws.py
```

Ajuste `COM_PORT` no topo do arquivo se a balança estiver em outra porta.
