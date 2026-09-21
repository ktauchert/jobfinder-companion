import { describe, expect, it } from "vitest";

import { filterExtractedSkills } from "./filter-extracted-skills.js";

describe("filterExtractedSkills", () => {
  it("keeps short technology-like skill names above the confidence floor", () => {
    const result = filterExtractedSkills([
      { name: "PHP", confidence: 0.95 },
      { name: "Laravel", confidence: 0.9 },
      { name: "Git", confidence: 0.85 },
    ]);

    expect(result).toEqual([
      { name: "PHP", confidence: 0.95 },
      { name: "Laravel", confidence: 0.9 },
      { name: "Git", confidence: 0.85 },
    ]);
  });

  it("drops sentence-like task phrases and low-confidence noise", () => {
    const result = filterExtractedSkills([
      { name: "typescript", confidence: 0.9 },
      { name: "react", confidence: 0.8 },
      { name: "umsetzung technischer lösungen auf basis fachlicher anforderungen", confidence: 1 },
      { name: "docker", confidence: 0.4 },
    ]);

    expect(result).toEqual([
      { name: "typescript", confidence: 0.9 },
      { name: "react", confidence: 0.8 },
    ]);
  });
});
