import { describe, expect, it, vi } from "vitest";

import { getHealth } from "./get-health.js";

describe("getHealth", () => {
  it("returns status ok when every check passes", async () => {
    const result = await getHealth({
      version: "0.0.0",
      checks: {
        checkDatabase: vi.fn().mockResolvedValue(true),
        checkRedis: vi.fn().mockResolvedValue(true),
        checkOllama: vi.fn().mockResolvedValue(true),
      },
    });

    expect(result).toEqual({
      status: "ok",
      checks: { database: true, redis: true, ollama: true },
      version: "0.0.0",
    });
  });

  it("returns degraded (not throwing) when Ollama is down", async () => {
    const result = await getHealth({
      version: "0.0.0",
      checks: {
        checkDatabase: vi.fn().mockResolvedValue(true),
        checkRedis: vi.fn().mockResolvedValue(true),
        checkOllama: vi.fn().mockRejectedValue(new Error("connection refused")),
      },
    });

    expect(result.status).toBe("degraded");
    expect(result.checks.ollama).toBe(false);
  });
});
