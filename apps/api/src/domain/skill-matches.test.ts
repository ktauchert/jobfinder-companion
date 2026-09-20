import { describe, expect, it } from "vitest";

import { buildSkillMatches } from "./skill-matches.js";

describe("buildSkillMatches", () => {
  it("tags skills against the profile must-haves and excludes", () => {
    const result = buildSkillMatches(
      [
        { id: "1", name: "typescript", label: "TypeScript", aliases: [] },
        { id: "2", name: "java", label: "Java", aliases: [] },
        { id: "3", name: "react", label: "React", aliases: [] },
      ],
      { mustHaveSkills: ["typescript"], excludeSkills: ["java"] },
    );

    expect(result).toEqual([
      {
        skill: { id: "1", name: "typescript", label: "TypeScript", aliases: [] },
        state: "must_have",
      },
      { skill: { id: "2", name: "java", label: "Java", aliases: [] }, state: "excluded" },
      { skill: { id: "3", name: "react", label: "React", aliases: [] }, state: "neutral" },
    ]);
  });
});
