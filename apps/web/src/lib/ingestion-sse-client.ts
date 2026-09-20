import type { IngestionEvent } from "@jobfinder/types";

const SSE_URL = "/api/ingest/events";
/** Survives React Strict Mode unmount/remount without opening a new stream. */
const DISCONNECT_GRACE_MS = 2_000;
const MAX_BACKOFF_MS = 30_000;

type Listener = (event: IngestionEvent) => void;

let source: EventSource | null = null;
const listeners = new Set<Listener>();
let disconnectTimer: ReturnType<typeof setTimeout> | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let backoffMs = 1_000;

export function subscribeIngestionEvents(listener: Listener): () => void {
  listeners.add(listener);
  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = undefined;
  }
  ensureConnected();

  return () => {
    listeners.delete(listener);
    scheduleDisconnect();
  };
}

function scheduleDisconnect(): void {
  if (listeners.size > 0) {
    return;
  }
  disconnectTimer = setTimeout(() => {
    if (listeners.size === 0) {
      teardownConnection();
    }
  }, DISCONNECT_GRACE_MS);
}

function ensureConnected(): void {
  if (source && source.readyState !== EventSource.CLOSED) {
    return;
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }

  source = new EventSource(SSE_URL);

  source.onopen = () => {
    backoffMs = 1_000;
  };

  source.onmessage = (message) => {
    try {
      const event = JSON.parse(message.data as string) as IngestionEvent;
      for (const listener of listeners) {
        listener(event);
      }
    } catch {
      // ignore malformed events
    }
  };

  source.onerror = () => {
    teardownConnection();
    if (listeners.size === 0) {
      return;
    }
    reconnectTimer = setTimeout(() => {
      ensureConnected();
    }, backoffMs);
    backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
  };
}

function teardownConnection(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }
  source?.close();
  source = null;
}

/** Test-only reset. */
export function resetIngestionSseClientForTests(): void {
  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = undefined;
  }
  listeners.clear();
  teardownConnection();
  backoffMs = 1_000;
}
