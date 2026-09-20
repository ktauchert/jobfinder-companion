import type { ProfileEmbedJobData } from "@jobfinder/types";

import { buildProfileEmbedText } from "../domain/profile-embed-text.js";
import type { Embedder } from "../ports/embedder.js";
import type { ProfileRepository } from "../ports/profile-repository.js";

export interface ProcessProfileEmbedDeps {
  profiles: Pick<ProfileRepository, "findEmbedInput" | "setEmbedding">;
  embedder: Embedder;
}

export async function processProfileEmbed(
  data: ProfileEmbedJobData,
  deps: ProcessProfileEmbedDeps,
): Promise<void> {
  const input = await deps.profiles.findEmbedInput(data.profileId);
  if (!input) {
    return;
  }

  const text = buildProfileEmbedText(input.summary, input.mustHaveSkills);
  const vector = await deps.embedder.embedQuery(text);
  if (vector.length !== deps.embedder.dimensions) {
    throw new Error(
      `Embedding dimension mismatch for model ${deps.embedder.model}: expected ${deps.embedder.dimensions}, got ${vector.length}`,
    );
  }

  await deps.profiles.setEmbedding(data.profileId, vector);
}
