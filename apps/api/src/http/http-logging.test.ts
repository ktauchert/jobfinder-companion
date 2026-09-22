import { describe, expect, it } from "vitest";

import { requestPath, shouldQuietHttpLog } from "./http-logging.js";

describe("http-logging", () => {
  it("strips query strings from request paths", () => {
    expect(requestPath("/api/ingest/status?foo=1")).toBe("/api/ingest/status");
  });

  it("quiets poll and SSE routes", () => {
    expect(shouldQuietHttpLog("/api/ingest/status")).toBe(true);
    expect(shouldQuietHttpLog("/api/ingest/events")).toBe(true);
    expect(shouldQuietHttpLog("/api/health")).toBe(true);
    expect(shouldQuietHttpLog("/api/jobs")).toBe(false);
  });
});
