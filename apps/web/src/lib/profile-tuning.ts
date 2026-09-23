export function stepSimilarityWeight(current: number, direction: -1 | 1): number {
  const next = Math.round((current + direction * 0.1) * 10) / 10;
  return Math.min(1, Math.max(0, next));
}

/** Steps job age by a week. Null means no limit; stepping down from a week clears it. */
export function stepMaxAgeDays(current: number | null, direction: -1 | 1): number | null {
  if (direction > 0) {
    return (current ?? 23) + 7;
  }
  if (current == null || current <= 7) {
    return null;
  }
  return current - 7;
}
