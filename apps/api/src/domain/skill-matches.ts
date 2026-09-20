import type { Skill, SkillMatch, SkillMatchState } from "@jobfinder/types";

export interface SkillMatchProfile {
  mustHaveSkills: string[];
  excludeSkills: string[];
}

export function buildSkillMatches(skills: Skill[], profile: SkillMatchProfile): SkillMatch[] {
  const mustHave = new Set(profile.mustHaveSkills);
  const excluded = new Set(profile.excludeSkills);

  return skills.map((skill) => ({
    skill,
    state: tagSkillState(skill.name, mustHave, excluded),
  }));
}

function tagSkillState(
  name: string,
  mustHave: Set<string>,
  excluded: Set<string>,
): SkillMatchState {
  if (mustHave.has(name)) {
    return "must_have";
  }
  if (excluded.has(name)) {
    return "excluded";
  }
  return "neutral";
}
