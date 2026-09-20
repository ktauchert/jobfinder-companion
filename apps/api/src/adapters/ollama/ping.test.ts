import { describe, expect, it, vi, afterEach } from "vitest";

import { pingOllama } from "./ping.js";

describe("pingOllama", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when Ollama responds ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true } satisfies Pick<Response, "ok">));

    await expect(pingOllama("http://localhost:11434", 500)).resolves.toBe(true);
  });

  it("returns false-path by throwing when fetch fails (use case maps to degraded)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));

    await expect(pingOllama("http://localhost:11434", 500)).rejects.toThrow(/connection refused/);
  });
});
