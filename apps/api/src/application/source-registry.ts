import type { SourceDefinition } from "@jobfinder/types";

/** Env keys consulted for paid-source `configured` gating. */
export interface SourceEnv {
  ADZUNA_APP_ID: string;
  ADZUNA_APP_KEY: string;
  APIFY_TOKEN: string;
}

export const SOURCE_DEFINITIONS: SourceDefinition[] = [
  {
    key: "ba",
    label: "Bundesagentur für Arbeit",
    tier: "free",
    requiredEnv: [],
    description: "German federal job listings via the Jobsuche API.",
  },
  {
    key: "greenhouse",
    label: "Greenhouse",
    tier: "free",
    requiredEnv: [],
    description: "Public Greenhouse job boards (company slugs, Phase 2).",
  },
  {
    key: "lever",
    label: "Lever",
    tier: "free",
    requiredEnv: [],
    description: "Public Lever postings (company slugs, Phase 2).",
  },
  {
    key: "adzuna",
    label: "Adzuna",
    tier: "paid",
    requiredEnv: ["ADZUNA_APP_ID", "ADZUNA_APP_KEY"],
    description: "Adzuna job search API (EU/US).",
  },
  {
    key: "apify",
    label: "Apify",
    tier: "paid",
    requiredEnv: ["APIFY_TOKEN"],
    description: "Apify actor scrapers for job boards.",
  },
];

/**
 * Paid sources need every `requiredEnv` key present and non-blank.
 * Free sources are always configured (AGENTS.md rule 7).
 */
export function isSourceConfigured(def: SourceDefinition, env: SourceEnv): boolean {
  if (def.tier === "free") {
    return true;
  }

  return def.requiredEnv.every((name) => {
    const value = env[name as keyof SourceEnv];
    return typeof value === "string" && value.trim().length > 0;
  });
}
