import type { IngestionEvent } from "@jobfinder/types";

/** In-process cache of the latest event per run for SSE reconnect replay. */
export class RunEventCache {
  private lastByRun = new Map<string, IngestionEvent>();

  remember(event: IngestionEvent): void {
    if ("runId" in event) {
      this.lastByRun.set(event.runId, event);
    }
  }

  getLast(runId: string): IngestionEvent | undefined {
    return this.lastByRun.get(runId);
  }
}
