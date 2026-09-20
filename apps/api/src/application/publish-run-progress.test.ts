import { describe, expect, it, vi } from "vitest";

import { maybePublishRunProgress } from "./publish-run-progress.js";

describe("maybePublishRunProgress", () => {
  it("publishes run.progress on the first counter tick", async () => {
    const publish = vi.fn();
    const stats = {
      fetched: 10,
      inserted: 10,
      updated: 0,
      extracted: 1,
      embedded: 0,
      failed: 0,
      pendingFetch: 0,
      pendingEnrich: 10,
    };

    await maybePublishRunProgress(
      "run-1",
      {
        runs: { getStats: vi.fn().mockResolvedValue(stats) },
        events: { publish },
      },
      1,
      "Extracting skills…",
    );

    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "run.progress",
        runId: "run-1",
        stats,
        message: "Extracting skills…",
      }),
    );
  });

  it("skips intermediate counters between batch boundaries", async () => {
    const publish = vi.fn();

    await maybePublishRunProgress(
      "run-1",
      {
        runs: { getStats: vi.fn() },
        events: { publish },
      },
      12,
      "Embedding jobs…",
    );

    expect(publish).not.toHaveBeenCalled();
  });
});
