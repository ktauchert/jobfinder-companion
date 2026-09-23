import { describe, expect, it } from "vitest";

import { profileInputSchema } from "./profile.js";

describe("profileInputSchema", () => {
  it("rejects invalid remote types and country codes", () => {
    const result = profileInputSchema.safeParse({
      name: "",
      mustHaveSkills: [],
      excludeSkills: [],
      summary: "",
      ingestQueries: [],
      remoteTypes: ["teleport"],
      countryCodes: ["DEU"],
      minSalary: null,
    });

    expect(result.success).toBe(false);
  });

  it("rejects a similarity weight outside 0..1", () => {
    const result = profileInputSchema.safeParse({
      name: "default",
      mustHaveSkills: [],
      excludeSkills: [],
      summary: "",
      ingestQueries: [],
      remoteTypes: [],
      countryCodes: [],
      minSalary: null,
      similarityWeight: 1.5,
      maxAgeDays: null,
    });

    expect(result.success).toBe(false);
  });
});
