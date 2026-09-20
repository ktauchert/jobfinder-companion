import type { NormalizedJob } from "@jobfinder/types";
import { describe, expect, it, vi } from "vitest";

import { processFetch } from "./process-fetch.js";

const sampleJob: NormalizedJob = {
  source: "ba",
  externalId: "10001-1-S",
  title: "Dev",
  company: "Co",
  location: "Berlin",
  countryCode: "DE",
  remoteType: "hybrid",
  employmentType: "full_time",
  salary: null,
  descriptionRaw: "md",
  descriptionText: "typescript react",
  url: "https://example.com",
  postedAt: null,
};

function* jobs(count: number): Generator<NormalizedJob> {
  for (let i = 0; i < count; i += 1) {
    yield { ...sampleJob, externalId: `10001-${i}-S` };
  }
}

describe("processFetch enrich cap", () => {
  it("stops enqueueing enrich when INGEST_MAX_JOBS is reached", async () => {
    const enqueueEnrich = vi.fn();
    let pendingEnrich = 0;

    await processFetch(
      { runId: "run-1", source: "ba", query: "dev", location: null },
      {
        adapters: {
          get: vi.fn().mockReturnValue({ definition: { key: "ba" }, fetch: () => jobs(5) }),
        },
        jobs: {
          upsertFromNormalized: vi.fn().mockResolvedValue({
            jobId: "job-1",
            inserted: true,
            changed: false,
            needsEnrich: true,
            enrichStage: "extract",
          }),
        },
        runs: {
          incrementStats: vi.fn().mockResolvedValue({}),
          adjustPending: vi.fn().mockImplementation(() => {
            pendingEnrich += 1;
            return Promise.resolve();
          }),
          findById: vi.fn().mockResolvedValue({ id: "run-1", status: "running" }),
          getStats: vi.fn().mockImplementation(() => ({
            fetched: 0,
            inserted: 0,
            updated: 0,
            extracted: 0,
            embedded: 0,
            failed: 0,
            pendingFetch: 1,
            pendingEnrich,
          })),
          updateStatus: vi.fn(),
        },
        queue: { enqueueEnrich },
        events: { publish: vi.fn() },
        limiter: { acquire: vi.fn().mockResolvedValue(undefined) },
        signal: new AbortController().signal,
        maxJobs: 2,
      },
    );

    expect(enqueueEnrich).toHaveBeenCalledTimes(2);
  });
});
