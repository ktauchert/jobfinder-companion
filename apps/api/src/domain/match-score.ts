const SIMILARITY_WEIGHT = 0.6;
const COVERAGE_WEIGHT = 0.4;

export interface MatchScoreInput {
  similarity: number;
  mustHaveCoverage: number;
}

/** Weighted blend documented in ARCHITECTURE.md §8. */
export function computeMatchScore(input: MatchScoreInput): number {
  const raw = SIMILARITY_WEIGHT * input.similarity + COVERAGE_WEIGHT * input.mustHaveCoverage;
  return Math.round(raw * 100);
}
