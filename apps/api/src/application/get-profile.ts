import type { ProfileResponse } from "@jobfinder/types";

import type { ProfileRepository } from "../ports/profile-repository.js";

export interface GetProfileDeps {
  profiles: Pick<ProfileRepository, "getDefault">;
}

export async function getProfile(deps: GetProfileDeps): Promise<ProfileResponse> {
  const profile = await deps.profiles.getDefault();
  return { profile };
}
