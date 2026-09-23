export type SseConnectionState = "connecting" | "open" | "disconnected";

let state: SseConnectionState = "connecting";
const listeners = new Set<(next: SseConnectionState) => void>();

export function sseConnectionState(): SseConnectionState {
  return state;
}

export function setSseConnectionState(next: SseConnectionState): void {
  state = next;
  for (const listener of listeners) {
    listener(next);
  }
}

export function subscribeSseConnection(listener: (next: SseConnectionState) => void): () => void {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

export function resetSseConnectionForTests(): void {
  state = "connecting";
  listeners.clear();
}
