import { EMBEDDING_DIMENSIONS } from "@jobfinder/database";

import type { Embedder } from "../../ports/embedder.js";
import type { OllamaClient } from "./client.js";

export function createOllamaEmbedder(options: { client: OllamaClient; model: string }): Embedder {
  return {
    model: options.model,
    dimensions: EMBEDDING_DIMENSIONS,

    async embedDocument(text: string) {
      return embedWithPrefix(options.client, options.model, text, "search_document:");
    },

    async embedQuery(text: string) {
      return embedWithPrefix(options.client, options.model, text, "search_query:");
    },
  };
}

async function embedWithPrefix(
  client: OllamaClient,
  model: string,
  text: string,
  prefix: "search_document:" | "search_query:",
): Promise<number[]> {
  const prefixed = text.startsWith(prefix) ? text : `${prefix} ${text}`;
  const vectors = await client.embed(model, prefixed);
  const vector = vectors[0];
  if (!vector) {
    throw new Error("Ollama embed returned empty vector");
  }
  return vector;
}
