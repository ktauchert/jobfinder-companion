import type { SkillsSearchResponse } from "@jobfinder/types";

import type { SkillRepository } from "../ports/skill-repository.js";

export interface SearchSkillsInput {
  q: string;
  limit: number;
}

export interface SearchSkillsDeps {
  skills: Pick<SkillRepository, "search">;
}

export async function searchSkills(
  input: SearchSkillsInput,
  deps: SearchSkillsDeps,
): Promise<SkillsSearchResponse> {
  const skills = await deps.skills.search(input.q, input.limit);
  return { skills };
}
