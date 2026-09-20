import { describe, expect, it } from "vitest";

import { computeMatchScore } from "./match-score.js";

describe("computeMatchScore", () => {
  it("blends similarity and must-have coverage with fixed weights", () => {
    expect(computeMatchScore({ similarity: 1, mustHaveCoverage: 1 })).toBe(100);
    expect(computeMatchScore({ similarity: 0.5, mustHaveCoverage: 0.5 })).toBe(50);
    expect(computeMatchScore({ similarity: 1, mustHaveCoverage: 0 })).toBe(60);
    expect(computeMatchScore({ similarity: 0, mustHaveCoverage: 1 })).toBe(40);
  });

  it("ranks a must-have match above equal-similarity job without coverage", () => {
    const withMustHave = computeMatchScore({ similarity: 0.8, mustHaveCoverage: 1 });
    const without = computeMatchScore({ similarity: 0.8, mustHaveCoverage: 0 });
    expect(withMustHave).toBeGreaterThan(without);
  });
});
