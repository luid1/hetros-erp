// Cliente do Agente Local HETROS (impressão térmica ESC/POS via serviço local).
// O agente roda em cada máquina e expõe HTTP em http://localhost:3131.
// Se o agente não estiver rodando, o chamador pode cair no fallback (janela do navegador).

export function getAgenteHost(): string {
  return localStorage.getItem('agente_host') || 'localhost';
}
export function setAgenteHost(host: string) {
  localStorage.setItem('agente_host', host.trim() || 'localhost');
}
function base() {
  return `http://${getAgenteHost()}:3131`;
}

export interface AgenteStatus {
  ok: boolean;
  balanca?: { ativa: boolean; peso: number; estavel: boolean; conectada: boolean };
  impressora?: { ativa: boolean; modo: string; destino: string };
}

/** Consulta o agente (rápido) — útil pra decidir entre agente x navegador. */
export async function agenteStatus(timeoutMs = 1200): Promise<AgenteStatus | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(`${base()}/status`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function post(rota: string, dados: any): Promise<{ ok: boolean; mensagem?: string; erro?: string }> {
  const r = await fetch(`${base()}${rota}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  return r.json();
}

/** Imprime o cupom fiscal (NFC-e). `pedido` no mesmo formato usado no notaTermica.ts. */
export function imprimirCupomAgente(pedido: any, nfe?: any) {
  return post('/imprimir/cupom', { pedido, nfe });
}

/** Imprime o bilhete separador (picking). */
export function imprimirBilheteAgente(pedido: any) {
  return post('/imprimir/bilhete', { pedido });
}

/** Manda bytes ESC/POS crus (base64) — passthrough. */
export function imprimirRawAgente(base64: string) {
  return post('/imprimir/raw', { base64 });
}
