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

describe("processFetch", () => {
  it("does not enqueue enrich when upsert reports unchanged", async () => {
    const enqueueEnrich = vi.fn();
    function* jobs() {
      yield sampleJob;
    }

    await processFetch(
      { runId: "run-1", source: "ba", query: "dev", location: null },
      {
        adapters: {
          get: vi.fn().mockReturnValue({ definition: { key: "ba" }, fetch: () => jobs() }),
        },
        jobs: {
          upsertFromNormalized: vi.fn().mockResolvedValue({
            jobId: "job-1",
            inserted: false,
            changed: false,
          }),
        },
        runs: {
          incrementStats: vi.fn().mockResolvedValue({}),
          adjustPending: vi.fn(),
          findById: vi.fn().mockResolvedValue({ id: "run-1", status: "running" }),
          getStats: vi.fn(),
          updateStatus: vi.fn(),
        },
        queue: { enqueueEnrich },
        events: { publish: vi.fn() },
        limiter: { acquire: vi.fn().mockResolvedValue(undefined) },
        signal: new AbortController().signal,
      },
    );

    expect(enqueueEnrich).not.toHaveBeenCalled();
  });

  it("enqueues extract when a job is inserted", async () => {
    const enqueueEnrich = vi.fn();

    function* jobs() {
      yield sampleJob;
    }

    await processFetch(
      { runId: "run-1", source: "ba", query: "dev", location: null },
      {
        adapters: {
          get: vi.fn().mockReturnValue({ definition: { key: "ba" }, fetch: () => jobs() }),
        },
        jobs: {
          upsertFromNormalized: vi.fn().mockResolvedValue({
            jobId: "job-1",
            inserted: true,
            changed: false,
          }),
        },
        runs: {
          incrementStats: vi.fn().mockResolvedValue({}),
          adjustPending: vi.fn(),
          findById: vi.fn().mockResolvedValue({ id: "run-1", status: "running" }),
          getStats: vi.fn(),
          updateStatus: vi.fn(),
        },
        queue: { enqueueEnrich },
        events: { publish: vi.fn() },
        limiter: { acquire: vi.fn().mockResolvedValue(undefined) },
        signal: new AbortController().signal,
      },
    );

    expect(enqueueEnrich).toHaveBeenCalledWith({
      runId: "run-1",
      jobId: "job-1",
      stage: "extract",
    });
  });
});
