/** Normalise pgvector values returned by the Postgres driver. */
export function parseEmbedding(value: unknown): number[] | null {
  if (value == null) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => Number(entry));
  }
  if (typeof value === "string") {
    const trimmed = value.replace(/^\[/, "").replace(/\]$/, "");
    if (!trimmed) {
      return [];
    }
    return trimmed.split(",").map((entry) => Number(entry.trim()));
  }
  return null;
}
