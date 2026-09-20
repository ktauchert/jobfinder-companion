export interface JobCursor {
  matchScore: number;
  id: string;
}

export function encodeJobCursor(cursor: JobCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeJobCursor(raw: string): JobCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as JobCursor;
    if (typeof parsed.matchScore !== "number" || typeof parsed.id !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** True when `item` sorts after `cursor` in descending matchScore, id order. */
export function isAfterCursor(item: JobCursor, cursor: JobCursor): boolean {
  if (item.matchScore !== cursor.matchScore) {
    return item.matchScore < cursor.matchScore;
  }
  return item.id > cursor.id;
}
