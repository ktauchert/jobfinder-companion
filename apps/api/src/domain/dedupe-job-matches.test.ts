import type { JobMatch } from "@jobfinder/types";
import { describe, expect, it } from "vitest";

import { dedupeJobMatchesByContentHash } from "./dedupe-job-matches.js";

function makeMatch(id: string, contentHash: string, score: number): JobMatch {
  return {
    job: {
      id,
      contentHash,
      source: "ba",
      externalId: id,
      title: "Dev",
      company: "Acme",
      location: null,
      countryCode: null,
      remoteType: "remote",
      employmentType: "full_time",
      salary: null,
      descriptionRaw: "",
      descriptionText: "",
      url: "https://example.com",
      postedAt: null,
      skills: [],
      skillsExtractedAt: null,
      embeddedAt: null,
      hiddenAt: null,
      fetchedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    matchScore: score,
    similarity: score / 100,
    mustHaveCoverage: 0,
    skillMatches: [],
  };
}

describe("dedupeJobMatchesByContentHash", () => {
  it("keeps the highest-scoring job per content hash", () => {
    const hash = "353bdb8c4dd5";
    const input = [
      makeMatch("low", hash, 0),
      makeMatch("high", hash, 29),
      makeMatch("unique", "other-hash", 10),
    ];

    expect(dedupeJobMatchesByContentHash(input).map((m) => m.job.id)).toEqual(["high", "unique"]);
  });
});
