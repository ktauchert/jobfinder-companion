import type { ProfileInput, ProfileResponse } from "@jobfinder/types";

import { canonicaliseProfileSkillNames } from "./canonicalise-profile-skills.js";
import type { ProfileQueue } from "../ports/profile-queue.js";
import type { ProfileRepository } from "../ports/profile-repository.js";
import type { SkillRepository } from "../ports/skill-repository.js";

export interface UpdateProfileDeps {
  profiles: Pick<ProfileRepository, "update">;
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

  const profile = await deps.profiles.update({
    ...input,
    mustHaveSkills,
    excludeSkills,
  });

  await deps.profileQueue.enqueueEmbed(profile.id);

  return { profile };
}
