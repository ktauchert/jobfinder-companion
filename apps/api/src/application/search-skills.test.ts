import { describe, expect, it, vi } from "vitest";

import { searchSkills } from "./search-skills.js";

describe("searchSkills", () => {
  it("returns skills from the repository", async () => {
    const skills = [{ id: "1", name: "typescript", label: "TypeScript", aliases: [] }];
    const search = vi.fn().mockResolvedValue(skills);

    const result = await searchSkills({ q: "type", limit: 8 }, { skills: { search } });

    expect(search).toHaveBeenCalledWith("type", 8);
    expect(result.skills).toEqual(skills);
  });
});
