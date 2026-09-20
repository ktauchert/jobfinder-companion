import { describe, expect, it } from "vitest";

import { computeJobContentHash } from "./job-content-hash.js";

describe("computeJobContentHash", () => {
  it("returns a stable sha256 hex digest", () => {
    const hash = computeJobContentHash({
      title: "Engineer",
      company: "Acme",
      descriptionText: "Build things",
    });

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(
      computeJobContentHash({
        title: "Engineer",
        company: "Acme",
        descriptionText: "Build things",
      }),
    ).toBe(hash);
  });

  it("changes when description changes", () => {
    const a = computeJobContentHash({
      title: "Engineer",
      company: "Acme",
      descriptionText: "Build things",
    });
    const b = computeJobContentHash({
      title: "Engineer",
      company: "Acme",
      descriptionText: "Build other things",
    });

    expect(a).not.toBe(b);
  });
});
