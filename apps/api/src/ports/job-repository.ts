import type { NormalizedJob } from "@jobfinder/types";

export interface UpsertJobResult {
  jobId: string;
  inserted: boolean;
  /** True when an existing row's content hash changed. */
  changed: boolean;
}

export interface JobRepository {
  upsertFromNormalized(
    job: NormalizedJob,
    contentHash: string,
  ): Promise<UpsertJobResult>;
  findDescriptionText(jobId: string): Promise<string | null>;
  findTitleCompanySkills(jobId: string): Promise<{
    title: string;
    company: string | null;
    skillNames: string[];
    descriptionText: string;
  } | null>;
  markSkillsExtracted(jobId: string): Promise<void>;
  markEmbedded(jobId: string): Promise<void>;
}
