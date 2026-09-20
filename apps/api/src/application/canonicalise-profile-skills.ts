import type { SkillRepository } from "../ports/skill-repository.js";

export interface CanonicaliseProfileSkillsDeps {
  skills: Pick<SkillRepository, "findByNameOrAlias" | "findSimilar">;
}

/** Map a profile skill to a canonical name when known; otherwise keep the input verbatim. */
export async function canonicaliseProfileSkillName(
  rawName: string,
  deps: CanonicaliseProfileSkillsDeps,
): Promise<string> {
  const trimmed = rawName.trim();
  if (!trimmed) {
    return trimmed;
  }

  const normalised = trimmed.toLowerCase();
  const exact = await deps.skills.findByNameOrAlias(normalised);
  if (exact) {
    return exact.name;
  }

  const similar = await deps.skills.findSimilar(normalised, 0.8);
  if (similar) {
    return similar.name;
  }

  return trimmed;
}

export async function canonicaliseProfileSkillNames(
  rawNames: string[],
  deps: CanonicaliseProfileSkillsDeps,
): Promise<string[]> {
  return Promise.all(rawNames.map((name) => canonicaliseProfileSkillName(name, deps)));
}
