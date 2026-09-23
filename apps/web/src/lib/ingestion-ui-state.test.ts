import { describe, expect, it } from "vitest";

import {
  dismissSourceFailure,
  initialIngestionUiState,
  reduceIngestionUi,
} from "./ingestion-ui-state.js";

describe("ingestion ui state", () => {
  it("keeps a source failure until it is dismissed", () => {
    const failed = reduceIngestionUi(initialIngestionUiState, {
      type: "source.failed",
      runId: "run-1",
      source: "ba",
      error: "timeout",
      at: "2026-01-01T00:00:00.000Z",
    });
    const progressed = reduceIngestionUi(failed, {
      type: "source.progress",
      runId: "run-1",
      source: "ba",
      stage: "fetch",
      done: 10,
      total: 20,
      message: "Fetched 10",
      at: "2026-01-01T00:00:01.000Z",
    });

    expect(progressed.sourceFailures).toEqual([{ source: "ba", message: "timeout" }]);
    expect(dismissSourceFailure(progressed, "ba").sourceFailures).toEqual([]);
  });

  it("clears source failures when a new run starts", () => {
    const failed = reduceIngestionUi(initialIngestionUiState, {
      type: "source.failed",
      runId: "run-1",
      source: "ba",
      error: "timeout",
      at: "2026-01-01T00:00:00.000Z",
    });
    const started = reduceIngestionUi(failed, {
      type: "run.started",
      runId: "run-2",
      sources: ["ba"],
      at: "2026-01-01T00:01:00.000Z",
    });

    expect(started.sourceFailures).toEqual([]);
  });
});
