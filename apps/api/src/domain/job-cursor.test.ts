import { describe, expect, it } from "vitest";

import { decodeJobCursor, encodeJobCursor, isAfterCursor } from "./job-cursor.js";

describe("job cursor", () => {
  it("round-trips matchScore and id", () => {
    const cursor = encodeJobCursor({ matchScore: 72, id: "job-1" });
    expect(decodeJobCursor(cursor)).toEqual({ matchScore: 72, id: "job-1" });
  });

  it("orders items after the cursor for descending matchScore", () => {
    expect(isAfterCursor({ matchScore: 70, id: "b" }, { matchScore: 72, id: "a" })).toBe(true);
    expect(isAfterCursor({ matchScore: 72, id: "b" }, { matchScore: 72, id: "a" })).toBe(true);
    expect(isAfterCursor({ matchScore: 80, id: "z" }, { matchScore: 72, id: "a" })).toBe(false);
  });
});
