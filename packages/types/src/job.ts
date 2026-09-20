import type { SourceKey } from "./source.js";

export const REMOTE_TYPES = ["remote", "hybrid", "onsite", "unknown"] as const;
export type RemoteType = (typeof REMOTE_TYPES)[number];

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "freelance",
  "internship",
  "unknown",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export interface Salary {
  min: number | null;
  max: number | null;
  /** ISO 4217, e.g. "EUR". */
  currency: string | null;
  period: "year" | "month" | "day" | "hour" | null;
}

/**
 * A job as produced by a source adapter, before enrichment.
 * Every adapter must map its upstream payload to exactly this shape.
 */
export interface NormalizedJob {
  source: SourceKey;
  /** Stable id within the source; `(source, externalId)` is unique. */
  externalId: string;
  title: string;
  company: string | null;
  location: string | null;
  /** ISO 3166-1 alpha-2, e.g. "DE". */
  countryCode: string | null;
  remoteType: RemoteType;
  employmentType: EmploymentType;
  salary: Salary | null;
  /** Original description; may contain HTML. */
  descriptionRaw: string;
  /** Plain-text description used for extraction and embedding. */
  descriptionText: string;
  url: string;
  /** ISO 8601 timestamp, if the source provides one. */
  postedAt: string | null;
}

export interface Skill {
  id: string;
  /** Canonical lower-case name, e.g. "typescript". */
  name: string;
  /** Display form, e.g. "TypeScript". */
  label: string;
  aliases: string[];
}

export interface JobSkill {
  skill: Skill;
  /** 0..1 confidence from the extraction model. */
  confidence: number;
}

/** Persisted, enriched job. */
export interface Job extends NormalizedJob {
  id: string;
  skills: JobSkill[];
  /** Enrichment progress flags; the UI shows partially enriched jobs greyed out. */
  skillsExtractedAt: string | null;
  embeddedAt: string | null;
  fetchedAt: string;
  updatedAt: string;
}

/** How a job's skill relates to the user's profile. */
export type SkillMatchState = "must_have" | "excluded" | "neutral";

export interface SkillMatch {
  skill: Skill;
  state: SkillMatchState;
}

/**
 * A job as returned by the search endpoint: enriched with a match score
 * and a per-skill breakdown against the active profile.
 */
export interface JobMatch {
  job: Job;
  /** 0..100. Weighted blend of vector similarity and must-have coverage. */
  matchScore: number;
  /** Raw cosine similarity between profile and job embedding, 0..1. */
  similarity: number;
  /** Fraction of must-have skills present in the job, 0..1. */
  mustHaveCoverage: number;
  skillMatches: SkillMatch[];
}
