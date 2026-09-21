import type { NormalizedJob } from "@jobfinder/types";

export interface UpsertJobResult {
  jobId: string;
  inserted: boolean;
  /** True when an existing row's content hash changed. */
  changed: boolean;
  /** Unchanged row that still needs extract and/or embed (e.g. after cancel). */
  needsEnrich: boolean;
  enrichStage: "extract" | "embed";
}

export interface JobRepository {
  upsertFromNormalized(job: NormalizedJob, contentHash: string): Promise<UpsertJobResult>;
  findDescriptionText(jobId: string): Promise<string | null>;
  findContentHash(jobId: string): Promise<string | null>;
  /** Another job with the same posting body that already has extracted skills. */
  findJobIdWithSkillsByContentHash(
    contentHash: string,
    excludeJobId: string,
  ): Promise<string | null>;
  findTitleCompanySkills(jobId: string): Promise<{
    title: string;
    company: string | null;
    skillNames: string[];
    descriptionText: string;
  } | null>;
  markSkillsExtracted(jobId: string): Promise<void>;
  markEmbedded(jobId: string): Promise<void>;
  setHidden(jobId: string, hidden: boolean): Promise<boolean>;
}
