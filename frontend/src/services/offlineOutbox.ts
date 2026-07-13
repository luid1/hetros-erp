// ─────────────────────────────────────────────────────────────────────────────
// FILA OFFLINE GENÉRICA (outbox) — apps de campo (motorista, comprador web).
// Mesma ideia da fila do app dos compradores (mobile): a ação sem internet é
// guardada no aparelho e reenviada sozinha quando a conexão volta. Nada se perde.
//
// Uso:
//   registrarSender('entrega', ({ stopId, corpo }) => rotasApi.confirmarEntrega(stopId, corpo));
//   // ao salvar, em caso de erro de REDE:
//   enfileirar('entrega', { stopId, corpo });
//   // reenvio automático acontece ao reconectar; ou manual: flush();
// ─────────────────────────────────────────────────────────────────────────────
import api from './api';

export interface OutboxItem {
  id: string;
  kind: string;
  payload: unknown;
  criadoEm: string;
  tentativas: number;
}

const KEY = 'offline_outbox_v1';
type Sender = (payload: any) => Promise<unknown>;
const senders: Record<string, Sender> = {};

/** Registra COMO enviar cada tipo de item (chamado uma vez pelo app). */
export function registrarSender(kind: string, fn: Sender) {
  senders[kind] = fn;
}

/** Erro de rede = requisição não chegou ao servidor (sem resposta HTTP). Um 4xx/5xx
 *  (com resposta) é rejeição definitiva do servidor — esse sai da fila. */
export function ehErroDeRede(e: any): boolean {
  return !e?.response;
}

function ler(): OutboxItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function gravar(lista: OutboxItem[]) {
  localStorage.setItem(KEY, JSON.stringify(lista));
  ouvintes.forEach((fn) => fn());
}

const ouvintes = new Set<() => void>();
/** Assina mudanças na fila (ex.: atualizar um badge de pendências). */
export function assinar(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

/** Quantos itens estão aguardando envio (opcionalmente por tipo). */
export function contar(kind?: string): number {
  const l = ler();
  return kind ? l.filter((i) => i.kind === kind).length : l.length;
}

/** Enfileira uma ação para reenvio posterior. */
export function enfileirar(kind: string, payload: unknown): OutboxItem {
  const item: OutboxItem = {
    id: 'ob_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    kind, payload, criadoEm: new Date().toISOString(), tentativas: 0,
  };
  const l = ler();
  l.push(item);
  gravar(l);
  return item;
}

let enviando = false;
/**
 * Tenta enviar tudo na fila. Mantém o que falhar por rede; descarta o que o
 * servidor rejeitar de forma definitiva (4xx/5xx) para não travar a fila.
 */
export async function flush(): Promise<{ enviados: number; restantes: number }> {
  if (enviando) return { enviados: 0, restantes: contar() };
  enviando = true;
  try {
    const lista = ler();
    if (lista.length === 0) return { enviados: 0, restantes: 0 };
    let enviados = 0;
    const pendentes: OutboxItem[] = [];
    for (const item of lista) {
      const sender = senders[item.kind];
      if (!sender) { pendentes.push(item); continue; } // app ainda não registrou este tipo
      try {
        await sender(item.payload);
        enviados++;
      } catch (e) {
        if (ehErroDeRede(e)) { item.tentativas++; pendentes.push(item); }
        // erro definitivo do servidor: sai da fila silenciosamente
      }
    }
    gravar(pendentes);
    return { enviados, restantes: pendentes.length };
  } finally {
    enviando = false;
  }
}

// Reenvio automático ao reconectar + varredura leve ao carregar.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { flush(); });
  // tenta uma vez logo após o boot (caso já esteja online e tenha pendência)
  setTimeout(() => { if (navigator.onLine) flush(); }, 4000);
}

// Reexporta o axios para senders que queiram usar diretamente, se preciso.
export { api };
