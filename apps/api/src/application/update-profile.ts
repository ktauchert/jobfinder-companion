import type { ProfileInput, ProfileResponse } from "@jobfinder/types";

import { canonicaliseProfileSkillNames } from "./canonicalise-profile-skills.js";
import type { ProfileQueue } from "../ports/profile-queue.js";
import type { ProfileRepository } from "../ports/profile-repository.js";
import type { SkillRepository } from "../ports/skill-repository.js";

export interface UpdateProfileDeps {
  profiles: Pick<ProfileRepository, "update" | "getDefault">;
  skills: Pick<SkillRepository, "findByNameOrAlias" | "findSimilar">;
  profileQueue: Pick<ProfileQueue, "enqueueEmbed">;
}

export async function updateProfile(
  input: ProfileInput,
  deps: UpdateProfileDeps,
): Promise<ProfileResponse> {
  const [mustHaveSkills, excludeSkills] = await Promise.all([
    canonicaliseProfileSkillNames(input.mustHaveSkills, deps),
    canonicaliseProfileSkillNames(input.excludeSkills, deps),
  ]);

  const previous = await deps.profiles.getDefault();
  const profile = await deps.profiles.update({
    ...input,
    mustHaveSkills,
    excludeSkills,
  });

  const skillsUnchanged =
    sameNames(previous.mustHaveSkills, mustHaveSkills) &&
    sameNames(previous.excludeSkills, excludeSkills);
  if (previous.summary !== input.summary || !skillsUnchanged) {
    await deps.profileQueue.enqueueEmbed(profile.id);
  }

  return { profile };
}

function sameNames(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((name, index) => name === right[index]);
}
