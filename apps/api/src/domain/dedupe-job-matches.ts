import type { JobMatch } from "@jobfinder/types";

/** One search result per unique posting body (`contentHash`). Keeps the highest `matchScore`. */
export function dedupeJobMatchesByContentHash(matches: JobMatch[]): JobMatch[] {
  const bestByHash = new Map<string, JobMatch>();

  for (const match of matches) {
    const hash = match.job.contentHash;
    const current = bestByHash.get(hash);
    if (!current || compareJobMatches(match, current) < 0) {
      bestByHash.set(hash, match);
    }
  }

  const deduped = [...bestByHash.values()];
  deduped.sort(compareJobMatches);
  return deduped;
}

function compareJobMatches(a: JobMatch, b: JobMatch): number {
  if (a.matchScore !== b.matchScore) {
    return b.matchScore - a.matchScore;
  }
  return a.job.id.localeCompare(b.job.id);
}
