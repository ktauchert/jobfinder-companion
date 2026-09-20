import { describe, expect, it, vi } from "vitest";

import { getSources } from "./get-sources.js";

describe("getSources", () => {
  it("returns SourceStatus with configured false for adzuna when env keys are blank", async () => {
    const result = await getSources({
      env: { ADZUNA_APP_ID: "", ADZUNA_APP_KEY: "", APIFY_TOKEN: "" },
      sources: {
        findAll: vi.fn().mockResolvedValue([
          { key: "ba", tier: "free", enabled: true },
          { key: "adzuna", tier: "paid", enabled: true },
        ]),
        findLastRunBySource: vi.fn().mockResolvedValue(null),
      },
    });

    const ba = result.sources.find((s) => s.key === "ba");
    const adzuna = result.sources.find((s) => s.key === "adzuna");

    expect(ba?.configured).toBe(true);
    expect(adzuna?.configured).toBe(false);
    expect(adzuna?.enabled).toBe(true);
  });

  it("includes lastRunAt and lastRunStatus from the repository", async () => {
    const startedAt = new Date("2026-09-01T10:00:00.000Z");
    const findLastRunBySource = vi
      .fn()
      .mockImplementation((key: string) =>
        Promise.resolve(key === "ba" ? { startedAt, status: "completed" as const } : null),
      );

    const result = await getSources({
      env: { ADZUNA_APP_ID: "", ADZUNA_APP_KEY: "", APIFY_TOKEN: "" },
      sources: {
        findAll: vi.fn().mockResolvedValue([{ key: "ba", tier: "free", enabled: true }]),
        findLastRunBySource,
      },
    });

    expect(result.sources[0]).toMatchObject({
      key: "ba",
      lastRunAt: startedAt.toISOString(),
      lastRunStatus: "completed",
    });
  });
});
