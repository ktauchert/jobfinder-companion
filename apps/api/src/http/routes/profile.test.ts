import { describe, expect, it } from "vitest";

import { profileInputSchema } from "./profile.js";

describe("profileInputSchema", () => {
  it("rejects invalid remote types and country codes", () => {
    const result = profileInputSchema.safeParse({
      name: "",
      mustHaveSkills: [],
      excludeSkills: [],
      summary: "",
      remoteTypes: ["teleport"],
      countryCodes: ["DEU"],
      minSalary: null,
    });

    expect(result.success).toBe(false);
  });
});
