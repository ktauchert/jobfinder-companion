import type { ProfileInput } from "@jobfinder/types";
import { describe, expect, it, vi } from "vitest";

import { updateProfile } from "./update-profile.js";

const baseInput: ProfileInput = {
  name: "default",
  mustHaveSkills: ["TypeScript"],
  excludeSkills: ["Java"],
  summary: "Backend engineer",
  remoteTypes: ["remote"],
  countryCodes: ["DE"],
  minSalary: 80_000,
};

describe("updateProfile", () => {
  it("canonicalises skills, saves, and enqueues embedding", async () => {
    const update = vi.fn().mockResolvedValue({
      id: "profile-1",
      name: "default",
      mustHaveSkills: ["typescript"],
      excludeSkills: ["java"],
      summary: "Backend engineer",
      remoteTypes: ["remote"],
      countryCodes: ["DE"],
      minSalary: 80_000,
      embeddedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    const enqueueEmbed = vi.fn();

    const result = await updateProfile(baseInput, {
      profiles: { update },
      skills: {
        findByNameOrAlias: vi
          .fn()
          .mockResolvedValueOnce({
            id: "1",
            name: "typescript",
            label: "TypeScript",
            aliases: [],
          })
          .mockResolvedValueOnce({
            id: "2",
            name: "java",
            label: "Java",
            aliases: [],
          }),
        findSimilar: vi.fn(),
      },
      profileQueue: { enqueueEmbed },
    });

    expect(update).toHaveBeenCalledWith({
      ...baseInput,
      mustHaveSkills: ["typescript"],
      excludeSkills: ["java"],
    });
    expect(enqueueEmbed).toHaveBeenCalledWith("profile-1");
    expect(result.profile.mustHaveSkills).toEqual(["typescript"]);
  });
});
