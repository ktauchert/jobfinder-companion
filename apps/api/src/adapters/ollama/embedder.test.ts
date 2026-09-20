import { describe, expect, it, vi } from "vitest";

import { EMBEDDING_DIMENSIONS } from "@jobfinder/database";

import { createOllamaEmbedder } from "./embedder.js";
import type { OllamaClient } from "./client.js";

describe("createOllamaEmbedder", () => {
  it("returns the first embedding vector from Ollama", async () => {
    const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.01);
    const client = { embed: vi.fn().mockResolvedValue([vector]) } as unknown as OllamaClient;
    const embedder = createOllamaEmbedder({ client, model: "nomic-embed-text" });

    const result = await embedder.embedDocument("hello");
    expect(result).toHaveLength(EMBEDDING_DIMENSIONS);
  });

  it("prefixes document text for search_document", async () => {
    const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.01);
    const embed = vi.fn().mockResolvedValue([vector]);
    const client = { embed } as unknown as OllamaClient;

    const embedder = createOllamaEmbedder({ client, model: "nomic-embed-text" });
    await embedder.embedDocument("Title · company");

    expect(embed).toHaveBeenCalledWith(
      "nomic-embed-text",
      expect.stringContaining("search_document:"),
    );
  });

  it("prefixes query text for search_query", async () => {
    const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.01);
    const embed = vi.fn().mockResolvedValue([vector]);
    const client = { embed } as unknown as OllamaClient;

    const embedder = createOllamaEmbedder({ client, model: "nomic-embed-text" });
    await embedder.embedQuery("Backend engineer · typescript");

    expect(embed).toHaveBeenCalledWith(
      "nomic-embed-text",
      expect.stringContaining("search_query:"),
    );
  });
});
