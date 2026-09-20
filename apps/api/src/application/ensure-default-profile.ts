import type { ProfileRepository } from "../ports/profile-repository.js";

/** Insert the single default profile row when missing. */
export async function ensureDefaultProfile(
  profiles: Pick<ProfileRepository, "ensureDefault">,
): Promise<void> {
  await profiles.ensureDefault();
}
