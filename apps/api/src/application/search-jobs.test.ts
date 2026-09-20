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
  it("ranks must-have matches above equal-similarity jobs and omits excluded jobs", async () => {
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
});
