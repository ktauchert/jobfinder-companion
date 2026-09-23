import type { Job, JobMatch } from "@jobfinder/types";
import { describe, expect, it, vi } from "vitest";

import { searchJobs } from "./search-jobs.js";

function makeJob(id: string, skillNames: string[]): Job {
  return {
    id,
    source: "ba",
    externalId: id,
    title: `Job ${id}`,
    company: "Acme",
    location: "Berlin",
    countryCode: "DE",
    remoteType: "remote",
    employmentType: "full_time",
    salary: null,
    descriptionRaw: "",
    descriptionText: "",
    url: "https://example.com",
    postedAt: null,
    skills: skillNames.map((name, index) => ({
      skill: { id: `s-${index}`, name, label: name, aliases: [] },
      confidence: 0.9,
    })),
    skillsExtractedAt: "2026-01-01T00:00:00.000Z",
    embeddedAt: "2026-01-01T00:00:00.000Z",
    hiddenAt: null,
    fetchedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("searchJobs", () => {
  it("ranks must-have matches above equal-similarity jobs when both survive SQL filters", async () => {
    const searchCandidates = vi.fn().mockResolvedValue([
      { jobId: "low", similarity: 0.9, mustHaveCoverage: 0 },
      { jobId: "high", similarity: 0.9, mustHaveCoverage: 1 },
    ]);
    const loadJobsByIds = vi.fn().mockImplementation((ids: string[]) =>
      Promise.resolve(
        ids.map((id) => {
          if (id === "high") {
            return makeJob(id, ["typescript"]);
          }
          if (id === "low") {
            return makeJob(id, ["python"]);
          }
          return makeJob(id, ["java"]);
        }),
      ),
    );

    const response = await searchJobs(
      { limit: 2 },
      {
        profiles: {
          getSearchContext: vi.fn().mockResolvedValue({
            id: "profile-1",
            embedding: [0.1, 0.2],
            mustHaveSkills: ["typescript"],
            excludeSkills: ["java"],
            remoteTypes: [],
            countryCodes: [],
            minSalary: null,
            similarityWeight: 0.6,
            maxAgeDays: null,
          }),
        },
        search: {
          searchCandidates,
          countMatching: vi.fn().mockResolvedValue(2),
          loadJobsByIds,
          findEnrichedJobById: vi.fn(),
          computeCandidateMetrics: vi.fn(),
        },
        embedder: {
          embedQuery: vi.fn(),
          embedDocument: vi.fn(),
          model: "nomic-embed-text",
          dimensions: 2,
        },
      },
    );

    expect(searchCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: "profile-1" }),
      6,
    );
    expect(response.items.map((item: JobMatch) => item.job.id)).toEqual(["high", "low"]);
    expect(response.items[0]?.matchScore).toBeGreaterThan(response.items[1]?.matchScore ?? 0);
    expect(response.total).toBe(2);
  });

  it("uses the profile similarity weight and max age when the request omits them", async () => {
    const searchCandidates = vi
      .fn()
      .mockResolvedValue([{ jobId: "only", similarity: 1, mustHaveCoverage: 0 }]);

    const response = await searchJobs(
      {},
      {
        profiles: {
          getSearchContext: vi.fn().mockResolvedValue({
            id: "profile-1",
            embedding: [0.1],
            mustHaveSkills: [],
            excludeSkills: [],
            remoteTypes: [],
            countryCodes: [],
            minSalary: null,
            similarityWeight: 1,
            maxAgeDays: 14,
          }),
        },
        search: {
          searchCandidates,
          countMatching: vi.fn().mockResolvedValue(1),
          loadJobsByIds: vi.fn().mockResolvedValue([makeJob("only", [])]),
          findEnrichedJobById: vi.fn(),
          computeCandidateMetrics: vi.fn(),
        },
        embedder: {
          embedQuery: vi.fn(),
          embedDocument: vi.fn(),
          model: "nomic-embed-text",
          dimensions: 1,
        },
      },
    );

    expect(searchCandidates).toHaveBeenCalledWith(expect.objectContaining({ maxAgeDays: 14 }), 60);
    expect(response.items[0]?.matchScore).toBe(100);
  });
});
