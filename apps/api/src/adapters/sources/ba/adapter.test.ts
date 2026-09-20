import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { createBaAdapter } from "./adapter.js";
import type { BaClient } from "./client.js";

const baDefinition = {
  key: "ba" as const,
  label: "Bundesagentur für Arbeit",
  tier: "free" as const,
  requiredEnv: [],
  description: "Test",
};

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8")) as unknown;
}

function createContext() {
  return {
    signal: new AbortController().signal,
    limiter: { acquire: vi.fn().mockResolvedValue(undefined) },
    progress: vi.fn(),
  };
}

describe("createBaAdapter", () => {
  it("yields NormalizedJobs from fixture list + detail responses", async () => {
    const list = loadFixture("jobs-list-v6.json") as {
      ergebnisliste: { referenznummer: string }[];
    };
    const detail = loadFixture("job-details-v4.json");

    const searchJobs = vi
      .fn()
      .mockResolvedValueOnce(list)
      .mockResolvedValueOnce({ ergebnisliste: [], maxErgebnisse: 2, page: 2 });
    const fetchJobDetails = vi.fn().mockImplementation((ref: string) => {
      if (ref === "10001-1003644689-S") {
        return Promise.resolve(detail);
      }
      return Promise.resolve({ stellenangebotsBeschreibung: "Short external listing." });
    });
    const client: BaClient = { searchJobs, fetchJobDetails };

    const adapter = createBaAdapter(client, baDefinition);
    const jobs = [];

    for await (const job of adapter.fetch(
      { runId: "run-1", source: "ba", query: "softwareentwickler", location: "Berlin" },
      createContext(),
    )) {
      jobs.push(job);
    }

    expect(jobs).toHaveLength(2);
    expect(jobs[1]?.externalId).toBe("10001-1003644689-S");
    expect(jobs[1]?.descriptionText).toContain("PHP");
    expect(searchJobs).toHaveBeenCalledTimes(2);
  });

  it("returns nothing on an empty first page", async () => {
    const searchJobs = vi.fn().mockResolvedValue({ ergebnisliste: [], maxErgebnisse: 0 });
    const fetchJobDetails = vi.fn();
    const client: BaClient = { searchJobs, fetchJobDetails };

    const adapter = createBaAdapter(client, baDefinition);
    const jobs = [];

    for await (const job of adapter.fetch(
      { runId: "run-1", source: "ba", query: "nope", location: null },
      createContext(),
    )) {
      jobs.push(job);
    }

    expect(jobs).toHaveLength(0);
    expect(fetchJobDetails).not.toHaveBeenCalled();
  });

  it("skips malformed list items without throwing", async () => {
    const searchJobs = vi.fn().mockResolvedValue({
      ergebnisliste: [
        { nope: true },
        {
          referenznummer: "10001-1003644689-S",
          stellenangebotsTitel: "Softwareentwickler (m/w/d)",
        },
      ],
      maxErgebnisse: 1,
    });
    const fetchJobDetails = vi.fn().mockResolvedValue(loadFixture("job-details-v4.json"));
    const client: BaClient = { searchJobs, fetchJobDetails };

    const adapter = createBaAdapter(client, baDefinition);
    const jobs = [];

    for await (const job of adapter.fetch(
      { runId: "run-1", source: "ba", query: "softwareentwickler", location: null },
      createContext(),
    )) {
      jobs.push(job);
    }

    expect(jobs).toHaveLength(1);
  });
});
