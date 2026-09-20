import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resetIngestionSseClientForTests,
  subscribeIngestionEvents,
} from "./ingestion-sse-client.js";

class MockEventSource {
  static instances: MockEventSource[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  readyState = MockEventSource.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    MockEventSource.instances.push(this);
    queueMicrotask(() => {
      this.readyState = MockEventSource.OPEN;
      this.onopen?.();
    });
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }
}

describe("ingestion SSE client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetIngestionSseClientForTests();
    MockEventSource.instances = [];
  });

  it("reuses one EventSource across Strict Mode style resubscribe", async () => {
    vi.stubGlobal("EventSource", MockEventSource);

    const noop = vi.fn();
    const first = subscribeIngestionEvents(noop);
    await Promise.resolve();
    expect(MockEventSource.instances).toHaveLength(1);

    first();
    subscribeIngestionEvents(noop);

    expect(MockEventSource.instances).toHaveLength(1);

    resetIngestionSseClientForTests();
  });
});
