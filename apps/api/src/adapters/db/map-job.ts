import type { Job, JobSkill, NormalizedJob } from "@jobfinder/types";
import type { JobRow } from "@jobfinder/database";

export function mapJobRow(row: JobRow, jobSkills: JobSkill[]): Job {
  const normalized = mapNormalizedFields(row);
  return {
    ...normalized,
    id: row.id,
    skills: jobSkills,
    skillsExtractedAt: row.skillsExtractedAt?.toISOString() ?? null,
    embeddedAt: row.embeddedAt?.toISOString() ?? null,
    fetchedAt: row.fetchedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapNormalizedFields(row: JobRow): Omit<NormalizedJob, "source" | "externalId"> & {
  source: NormalizedJob["source"];
  externalId: string;
} {
  return {
    source: row.source,
    externalId: row.externalId,
    title: row.title,
    company: row.company,
    location: row.location,
    countryCode: row.countryCode,
    remoteType: row.remoteType,
    employmentType: row.employmentType,
    salary:
      row.salaryMin !== null ||
      row.salaryMax !== null ||
      row.salaryCurrency !== null ||
      row.salaryPeriod !== null
        ? {
            min: row.salaryMin,
            max: row.salaryMax,
            currency: row.salaryCurrency,
            period: row.salaryPeriod,
          }
        : null,
    descriptionRaw: row.descriptionRaw,
    descriptionText: row.descriptionText,
    url: row.url,
    postedAt: row.postedAt?.toISOString() ?? null,
  };
}
