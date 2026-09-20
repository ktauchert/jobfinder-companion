import { describe, expect, it } from "vitest";

import { enrichJobId, fetchJobId } from "./job-ids.js";

describe("BullMQ job ids", () => {
  it("builds deterministic fetch job ids", () => {
    expect(fetchJobId("run-1", "ba")).toBe("fetch:run-1:ba");
  });

  it("builds deterministic enrich job ids", () => {
    expect(enrichJobId("job-1", "extract")).toBe("enrich:job-1:extract");
    expect(enrichJobId("job-1", "embed")).toBe("enrich:job-1:embed");
  });
});
