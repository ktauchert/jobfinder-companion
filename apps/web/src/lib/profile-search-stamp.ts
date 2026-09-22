import type { Profile } from "@jobfinder/types";

/** Cache-bust key for job search when profile filters change. */
export function profileSearchStamp(profile: Profile | undefined): string {
  if (!profile) {
    return "loading";
  }
  const must = [...profile.mustHaveSkills].sort().join(",");
  const exclude = [...profile.excludeSkills].sort().join(",");
  return `${profile.updatedAt}|must:${must}|exclude:${exclude}`;
}
