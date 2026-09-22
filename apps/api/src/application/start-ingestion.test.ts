import { describe, expect, it, vi } from "vitest";

import { startIngestion, type StartIngestionDeps } from "./start-ingestion.js";

const defaultProfile = {
  id: "profile-1",
  name: "default",
  mustHaveSkills: [],
  excludeSkills: [],
  summary: "",
  ingestQueries: ["softwareentwickler", "fullstack"],
  remoteTypes: [],
  countryCodes: [],
  minSalary: null,
  embeddedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("startIngestion", () => {
  it("enqueues one fetch job per source and profile ingest query", async () => {
    const enqueueFetch = vi.fn();
    const createRun = vi.fn().mockResolvedValue({ id: "run-1", status: "running" });

    const deps = {
      env: { ADZUNA_APP_ID: undefined, ADZUNA_APP_KEY: undefined, APIFY_TOKEN: undefined },
      sources: { findAll: vi.fn().mockResolvedValue([{ key: "ba", enabled: true }]) },
      profiles: { getDefault: vi.fn().mockResolvedValue(defaultProfile) },
      runs: {
        findActiveRun: vi.fn().mockResolvedValue(null),
        createRun,
      },
      queue: { enqueueFetch },
      events: { publish: vi.fn() },
      defaultQuery: "fallback",
      defaultLocation: "Berlin",
    } as unknown as StartIngestionDeps;

    await startIngestion({}, deps);

    expect(createRun).toHaveBeenCalledWith({
      sources: ["ba"],
      pendingFetch: 2,
    });
    expect(enqueueFetch).toHaveBeenCalledTimes(2);
    expect(enqueueFetch).toHaveBeenCalledWith(
      { runId: "run-1", source: "ba", query: "softwareentwickler", location: "Berlin" },
      "free",
    );
    expect(enqueueFetch).toHaveBeenCalledWith(
      { runId: "run-1", source: "ba", query: "fullstack", location: "Berlin" },
      "free",
    );
  });

  it("uses explicit request query as a single term", async () => {
    const enqueueFetch = vi.fn();
    const createRun = vi.fn().mockResolvedValue({ id: "run-1", status: "running" });

    const deps = {
      env: { ADZUNA_APP_ID: undefined, ADZUNA_APP_KEY: undefined, APIFY_TOKEN: undefined },
      sources: { findAll: vi.fn().mockResolvedValue([{ key: "ba", enabled: true }]) },
      profiles: { getDefault: vi.fn().mockResolvedValue(defaultProfile) },
      runs: {
        findActiveRun: vi.fn().mockResolvedValue(null),
        createRun,
      },
      queue: { enqueueFetch },
      events: { publish: vi.fn() },
      defaultQuery: "fallback",
      defaultLocation: "Berlin",
    } as unknown as StartIngestionDeps;

    await startIngestion({ query: "product developer", location: "Hamburg" }, deps);

    expect(createRun).toHaveBeenCalledWith({
      sources: ["ba"],
      pendingFetch: 1,
    });
    expect(enqueueFetch).toHaveBeenCalledOnce();
    expect(enqueueFetch).toHaveBeenCalledWith(
      { runId: "run-1", source: "ba", query: "product developer", location: "Hamburg" },
      "free",
    );
  });
});
