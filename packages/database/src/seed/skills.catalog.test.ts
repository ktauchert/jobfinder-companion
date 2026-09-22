import { describe, expect, it } from "vitest";

import { SKILL_SEED_ENTRIES } from "./skills.js";

describe("SKILL_SEED_ENTRIES", () => {
  it("lists each canonical name once", () => {
    const names = SKILL_SEED_ENTRIES.map((entry) => entry.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThanOrEqual(300);
  });

  it("aliases Jakarta EE and keeps role titles out of the catalogue", () => {
    expect(SKILL_SEED_ENTRIES.map((entry) => entry.name)).not.toContain("softwareentwickler");

    const jakarta = SKILL_SEED_ENTRIES.find((entry) => entry.name === "jakarta-ee");
    expect(jakarta?.aliases).toEqual(expect.arrayContaining(["java ee", "jakarta ee"]));
  });
});
