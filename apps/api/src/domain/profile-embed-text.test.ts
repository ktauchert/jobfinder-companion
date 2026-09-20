import { describe, expect, it } from "vitest";

import { buildProfileEmbedText } from "./profile-embed-text.js";

describe("buildProfileEmbedText", () => {
  it("joins summary and must-have skills for embedding", () => {
    expect(
      buildProfileEmbedText("Senior backend engineer", ["TypeScript", "PostgreSQL"]),
    ).toBe("Senior backend engineer · TypeScript · PostgreSQL");
  });

  it("omits empty summary and blank skills", () => {
    expect(buildProfileEmbedText("  ", ["React", "  "])).toBe("React");
  });
});
