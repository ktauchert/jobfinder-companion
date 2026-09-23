import type { IngestionRunStats } from "@jobfinder/types";
import { describe, expect, it } from "vitest";

import { buildIngestionProgress, enrichTotal } from "./ingestion-progress.js";

describe("ingestion progress view", () => {
  it("shows extract and embed rows after fetch completes", () => {
    const stats: IngestionRunStats = {
      fetched: 251,
      inserted: 249,
      updated: 0,
      extracted: 12,
      embedded: 5,
      failed: 0,
      pendingFetch: 0,
      pendingEnrich: 244,
    };

    const view = buildIngestionProgress({
      active: true,
      stats,
      sources: {
        ba: {
          source: "ba",
          stage: "fetch",
          done: 251,
          total: 251,
          message: "Fetched 251 BA jobs",
        },
      },
      lastMessage: "Extracting skills…",
      summary: null,
    });

    expect(view.visible).toBe(true);
    expect(view.rows[0]).toMatchObject({ stage: "fetch", done: 251, total: 251, active: false });
    expect(view.rows[1]).toMatchObject({
      stage: "extract",
      done: 12,
      total: enrichTotal(stats),
      active: true,
    });
    expect(view.rows[2]).toMatchObject({ stage: "embed", done: 5, active: true });
    expect(view.collapsedSummary).toBe("Fetch 251/251 · Extract 12/251 · Embed 5/251");
  });

  it("stays visible while a source failure is waiting to be dismissed", () => {
    const view = buildIngestionProgress({
      active: false,
      stats: null,
      sources: {},
      lastMessage: null,
      summary: null,
      sourceFailures: [{ source: "ba", message: "timeout" }],
    });

    expect(view.visible).toBe(true);
    expect(view.sourceFailures).toEqual([{ source: "ba", message: "timeout" }]);
    expect(view.collapsedSummary).toBe("ba failed: timeout");
  });
});
