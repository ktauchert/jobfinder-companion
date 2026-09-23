import { describe, expect, it } from "vitest";

import { resolveIngestQueries, resolveIngestLocation } from "./resolve-ingest-queries.js";

describe("resolveIngestQueries", () => {
  it("uses explicit request query as a single term", () => {
    expect(
      resolveIngestQueries(
        { query: " fullstack " },
        { ingestQueries: ["softwareentwickler"] },
        "fallback",
      ),
    ).toEqual(["fullstack"]);
  });

  it("uses profile ingestQueries when request omits query", () => {
    expect(
      resolveIngestQueries({}, { ingestQueries: ["softwareentwickler", "fullstack"] }, "fallback"),
    ).toEqual(["softwareentwickler", "fullstack"]);
  });

  it("falls back to default query when profile list is empty", () => {
    expect(resolveIngestQueries({}, { ingestQueries: [] }, "softwareentwickler")).toEqual([
      "softwareentwickler",
    ]);
  });

  it("dedupes trimmed profile terms", () => {
    expect(
      resolveIngestQueries(
        {},
        { ingestQueries: [" fullstack ", "fullstack", "", "product developer"] },
        "fallback",
      ),
    ).toEqual(["fullstack", "product developer"]);
  });
});

describe("resolveIngestLocation", () => {
  it("prefers request location over the profile and the default", () => {
    expect(
      resolveIngestLocation({ location: " Hamburg " }, { countryCodes: ["DE"] }, "Berlin"),
    ).toBe("Hamburg");
  });

  it("uses the profile country code when the request omits location", () => {
    expect(resolveIngestLocation({}, { countryCodes: [" de "] }, "Berlin")).toBe("de");
  });

  it("falls back to the default when the profile has no country code", () => {
    expect(resolveIngestLocation({}, { countryCodes: ["", " "] }, "Berlin")).toBe("Berlin");
    expect(resolveIngestLocation({}, { countryCodes: [] }, null)).toBeNull();
  });
});
