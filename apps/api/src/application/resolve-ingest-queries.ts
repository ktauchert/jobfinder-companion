import type { StartIngestionRequest } from "@jobfinder/types";

export function resolveIngestQueries(
  input: Pick<StartIngestionRequest, "query">,
  profile: { ingestQueries: string[] },
  defaultQuery: string,
): string[] {
  const explicit = input.query?.trim();
  if (explicit) {
    return [explicit];
  }

  const fromProfile = dedupeTerms(profile.ingestQueries);
  if (fromProfile.length > 0) {
    return fromProfile;
  }

  return [defaultQuery.trim()].filter(Boolean);
}

export function resolveIngestLocation(
  input: Pick<StartIngestionRequest, "location">,
  defaultLocation: string | null,
): string | null {
  const explicit = input.location?.trim();
  if (explicit) {
    return explicit;
  }
  return defaultLocation;
}

function dedupeTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const term of terms) {
    const trimmed = term.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}
