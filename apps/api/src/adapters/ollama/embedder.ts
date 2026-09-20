import { EMBEDDING_DIMENSIONS } from "@jobfinder/database";

import type { Embedder } from "../../ports/embedder.js";
import type { OllamaClient } from "./client.js";

export function createOllamaEmbedder(options: {
  client: OllamaClient;
  model: string;
}): Embedder {
  return {
    model: options.model,
    dimensions: EMBEDDING_DIMENSIONS,

    async embedDocument(text: string) {
      const prefixed = text.startsWith("search_document:") ? text : `search_document: ${text}`;
      const vectors = await options.client.embed(options.model, prefixed);
      const vector = vectors[0];
      if (!vector) {
        throw new Error("Ollama embed returned empty vector");
      }
      return vector;
    },
  };
}
