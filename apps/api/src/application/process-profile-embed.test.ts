import { describe, expect, it, vi } from "vitest";

import { EMBEDDING_DIMENSIONS } from "@jobfinder/database";

import { processProfileEmbed } from "./process-profile-embed.js";

describe("processProfileEmbed", () => {
  it("embeds summary and must-haves then stores embeddedAt", async () => {
    const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.02);
    const embedQuery = vi.fn().mockResolvedValue(vector);
    const setEmbedding = vi.fn();

    await processProfileEmbed(
      { profileId: "profile-1" },
      {
        profiles: {
          findEmbedInput: vi.fn().mockResolvedValue({
            summary: "Backend engineer",
            mustHaveSkills: ["typescript", "postgresql"],
          }),
          setEmbedding,
        },
        embedder: {
          embedQuery,
          embedDocument: vi.fn(),
          model: "nomic-embed-text",
          dimensions: EMBEDDING_DIMENSIONS,
        },
      },
    );

    expect(embedQuery).toHaveBeenCalledWith("Backend engineer · typescript · postgresql");
    expect(setEmbedding).toHaveBeenCalledWith("profile-1", vector);
  });

  it("no-ops when the profile row is missing", async () => {
    const embedQuery = vi.fn();

    await processProfileEmbed(
      { profileId: "missing" },
      {
        profiles: {
          findEmbedInput: vi.fn().mockResolvedValue(null),
          setEmbedding: vi.fn(),
        },
        embedder: {
          embedQuery,
          embedDocument: vi.fn(),
          model: "nomic-embed-text",
          dimensions: EMBEDDING_DIMENSIONS,
        },
      },
    );

    expect(embedQuery).not.toHaveBeenCalled();
  });
});
