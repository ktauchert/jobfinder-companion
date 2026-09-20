/** Element-wise average followed by L2 normalisation (for blending profile + ad-hoc q). */
export function averageEmbeddings(...vectors: number[][]): number[] {
  const first = vectors[0];
  if (!first) {
    return [];
  }
  if (vectors.length === 1) {
    return first;
  }

  const length = first.length;
  const sum = new Array<number>(length).fill(0);

  for (const vector of vectors) {
    for (let i = 0; i < length; i++) {
      sum[i] = (sum[i] ?? 0) + (vector[i] ?? 0);
    }
  }

  const averaged = sum.map((value) => value / vectors.length);
  const magnitude = Math.hypot(...averaged);
  if (magnitude === 0) {
    return averaged;
  }

  return averaged.map((value) => value / magnitude);
}
