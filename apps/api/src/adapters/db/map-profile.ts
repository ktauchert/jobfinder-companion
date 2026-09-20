import type { Profile } from "@jobfinder/types";
import type { ProfileRow } from "@jobfinder/database";

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    mustHaveSkills: row.mustHaveSkills,
    excludeSkills: row.excludeSkills,
    summary: row.summary,
    remoteTypes: row.remoteTypes as Profile["remoteTypes"],
    countryCodes: row.countryCodes,
    minSalary: row.minSalary,
    embeddedAt: row.embeddedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
