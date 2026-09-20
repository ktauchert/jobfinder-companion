import type { SourceRepository } from "../ports/source-repository.js";
import { SOURCE_DEFINITIONS } from "./source-registry.js";

/** Insert missing source rows; existing rows are left unchanged. */
export async function seedSources(repo: SourceRepository): Promise<void> {
  await repo.ensureSeeded(
    SOURCE_DEFINITIONS.map((def) => ({
      key: def.key,
      tier: def.tier,
      enabled: true,
    })),
  );
}
