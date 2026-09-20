import { describe, expect, it } from "vitest";

import { isSourceConfigured, SOURCE_DEFINITIONS } from "./source-registry.js";

describe("isSourceConfigured", () => {
  const emptyPaidEnv = {
    ADZUNA_APP_ID: "",
    ADZUNA_APP_KEY: "",
    APIFY_TOKEN: "",
  };

  it("returns true for free-tier sources regardless of env", () => {
    const ba = SOURCE_DEFINITIONS.find((d) => d.key === "ba");
    expect(ba).toBeDefined();
    expect(isSourceConfigured(ba!, emptyPaidEnv)).toBe(true);
  });

  it("returns false for adzuna when ADZUNA_* env vars are missing or blank", () => {
    const adzuna = SOURCE_DEFINITIONS.find((d) => d.key === "adzuna");
    expect(adzuna).toBeDefined();
    expect(isSourceConfigured(adzuna!, emptyPaidEnv)).toBe(false);
    expect(
      isSourceConfigured(adzuna!, { ...emptyPaidEnv, ADZUNA_APP_ID: "   " }),
    ).toBe(false);
  });

  it("returns true for adzuna when both ADZUNA_* env vars are non-empty", () => {
    const adzuna = SOURCE_DEFINITIONS.find((d) => d.key === "adzuna");
    expect(adzuna).toBeDefined();
    expect(
      isSourceConfigured(adzuna!, {
        ...emptyPaidEnv,
        ADZUNA_APP_ID: "app-id",
        ADZUNA_APP_KEY: "secret",
      }),
    ).toBe(true);
  });

  it("returns false for apify when APIFY_TOKEN is blank", () => {
    const apify = SOURCE_DEFINITIONS.find((d) => d.key === "apify");
    expect(apify).toBeDefined();
    expect(isSourceConfigured(apify!, emptyPaidEnv)).toBe(false);
  });
});
