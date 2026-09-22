import { describe, expect, it } from "vitest";

import { enrichJobId, fetchJobId, profileEmbedJobId } from "./job-ids.js";

describe("BullMQ job ids", () => {
  it("builds deterministic fetch job ids", () => {
    expect(fetchJobId("run-1", "ba", "softwareentwickler")).toBe(
      "fetch:run-1:ba-softwareentwickler",
    );
    expect(fetchJobId("run-1", "ba", "Product Developer")).toBe("fetch:run-1:ba-product-developer");
  });

  it("builds deterministic enrich job ids", () => {
    expect(enrichJobId("job-1", "extract")).toBe("enrich:job-1:extract");
    expect(enrichJobId("job-1", "embed")).toBe("enrich:job-1:embed");
  });

  it("builds profile embed job ids with exactly three colon segments", () => {
    expect(profileEmbedJobId("profile-1")).toBe("profile:embed:profile-1");
    expect(profileEmbedJobId("profile-1").split(":")).toHaveLength(3);
  });
});
