import { describe, expect, it, vi } from "vitest";

import {
  canonicaliseProfileSkillName,
  canonicaliseProfileSkillNames,
} from "./canonicalise-profile-skills.js";

describe("canonicaliseProfileSkillName", () => {
  it("maps a known skill to its canonical name", async () => {
    const result = await canonicaliseProfileSkillName("TypeScript", {
      skills: {
        findByNameOrAlias: vi.fn().mockResolvedValue({
          id: "1",
          name: "typescript",
          label: "TypeScript",
          aliases: [],
        }),
        findSimilar: vi.fn(),
      },
    });

    expect(result).toBe("typescript");
  });

  it("keeps an unknown skill verbatim", async () => {
    const result = await canonicaliseProfileSkillName("ObscureFramework", {
      skills: {
        findByNameOrAlias: vi.fn().mockResolvedValue(null),
        findSimilar: vi.fn().mockResolvedValue(null),
      },
    });

    expect(result).toBe("ObscureFramework");
  });

  it("maps via trigram similarity when no exact match", async () => {
    const result = await canonicaliseProfileSkillName("reactjs", {
      skills: {
        findByNameOrAlias: vi.fn().mockResolvedValue(null),
        findSimilar: vi.fn().mockResolvedValue({
          id: "2",
          name: "react",
          label: "React",
          aliases: [],
        }),
      },
    });

    expect(result).toBe("react");
  });
});

describe("canonicaliseProfileSkillNames", () => {
  it("canonicalises each skill independently", async () => {
    const findByNameOrAlias = vi
      .fn()
      .mockResolvedValueOnce({
        id: "1",
        name: "typescript",
        label: "TypeScript",
        aliases: [],
      })
      .mockResolvedValueOnce(null);
    const findSimilar = vi.fn().mockResolvedValue(null);

    const result = await canonicaliseProfileSkillNames(["TypeScript", "CustomSkill"], {
      skills: { findByNameOrAlias, findSimilar },
    });

    expect(result).toEqual(["typescript", "CustomSkill"]);
  });
});
