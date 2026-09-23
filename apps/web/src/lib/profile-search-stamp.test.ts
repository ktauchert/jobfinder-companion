import type { Profile } from "@jobfinder/types";
import { describe, expect, it } from "vitest";

import { profileSearchStamp } from "./profile-search-stamp.js";

const baseProfile: Profile = {
  id: "p1",
  name: "default",
  mustHaveSkills: [],
  excludeSkills: [],
  summary: "",
  ingestQueries: [],
  remoteTypes: [],
  countryCodes: [],
  minSalary: null,
  similarityWeight: 0.6,
  maxAgeDays: null,
  embeddedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("profileSearchStamp", () => {
  it("changes when must-have skills change", () => {
    const before = profileSearchStamp(baseProfile);
    const after = profileSearchStamp({
      ...baseProfile,
      mustHaveSkills: ["react"],
    });
    expect(after).not.toBe(before);
  });

  it("changes when the similarity weight changes", () => {
    const before = profileSearchStamp(baseProfile);
    const after = profileSearchStamp({ ...baseProfile, similarityWeight: 1 });
    expect(after).not.toBe(before);
  });

  it("is stable for the same profile filters", () => {
    const profile: Profile = {
      ...baseProfile,
      mustHaveSkills: ["typescript", "react"],
      excludeSkills: ["java"],
    };
    expect(profileSearchStamp(profile)).toBe(profileSearchStamp(profile));
  });
});
