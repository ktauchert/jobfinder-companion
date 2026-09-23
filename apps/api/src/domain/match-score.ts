const SIMILARITY_WEIGHT = 0.6;

export interface MatchScoreInput {
  similarity: number;
  mustHaveCoverage: number;
  /** Defaults to 0.6 so existing callers keep the original blend. */
  similarityWeight?: number;
}

/** Weighted blend documented in ARCHITECTURE.md §8. */
export function computeMatchScore(input: MatchScoreInput): number {
  const similarityWeight = input.similarityWeight ?? SIMILARITY_WEIGHT;
  const coverageWeight = 1 - similarityWeight;
  const raw = similarityWeight * input.similarity + coverageWeight * input.mustHaveCoverage;
  return Math.round(raw * 100);
}
