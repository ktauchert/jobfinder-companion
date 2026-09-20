import type { Skill } from "@jobfinder/types";

import type { SkillRepository } from "../ports/skill-repository.js";

export interface CanonicaliseSkillDeps {
  skills: Pick<SkillRepository, "findByNameOrAlias" | "findSimilar" | "createSkill">;
}

/** Map a raw model skill string to a canonical Skill row. */
export async function canonicaliseSkillName(
  rawName: string,
  deps: CanonicaliseSkillDeps,
): Promise<Skill> {
  const normalised = rawName.trim().toLowerCase();
  if (!normalised) {
    throw new Error("Empty skill name");
  }

  const exact = await deps.skills.findByNameOrAlias(normalised);
  if (exact) {
    return exact;
  }

  const similar = await deps.skills.findSimilar(normalised, 0.8);
  if (similar) {
    return similar;
  }

  const label = rawName.trim();
  return deps.skills.createSkill({
    name: normalised,
    label: label.length > 0 ? label : normalised,
    aliases: [],
  });
}
