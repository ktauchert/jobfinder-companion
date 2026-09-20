import type { RemoteType } from "./job.js";

/**
 * The user's search profile. JobFinder is single-user, but the profile is a
 * first-class record so it can be versioned and (later) multiplied.
 */
export interface Profile {
  id: string;
  name: string;
  /** Canonical skill names the job should contain. Drives ranking, not filtering. */
  mustHaveSkills: string[];
  /** Canonical skill names that hard-exclude a job from results. */
  excludeSkills: string[];
  /** Free text (e.g. a short bio / what you want) that is embedded alongside skills. */
  summary: string;
  /** Optional deterministic filters. Empty arrays mean "no restriction". */
  remoteTypes: RemoteType[];
  countryCodes: string[];
  minSalary: number | null;
  /** Timestamp of the embedding currently stored for this profile. */
  embeddedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProfileInput = Pick<
  Profile,
  | "name"
  | "mustHaveSkills"
  | "excludeSkills"
  | "summary"
  | "remoteTypes"
  | "countryCodes"
  | "minSalary"
>;

/** BullMQ queue for async profile embedding after a save. */
export const PROFILE_QUEUE_NAMES = {
  embed: "profile-embed",
} as const;

export interface ProfileEmbedJobData {
  profileId: string;
}
