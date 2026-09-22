import { describe, expect, it } from "vitest";

import { unconfiguredSourceTooltip } from "./source-availability.js";

describe("unconfiguredSourceTooltip", () => {
  it("lists missing env vars for an unconfigured paid source", () => {
    expect(
      unconfiguredSourceTooltip({
        configured: false,
        enabled: false,
        requiredEnv: ["ADZUNA_APP_ID", "ADZUNA_APP_KEY"],
      }),
    ).toBe("Missing ADZUNA_APP_ID, ADZUNA_APP_KEY");
  });

  it("returns null when the source is configured and enabled", () => {
    expect(
      unconfiguredSourceTooltip({ configured: true, enabled: true, requiredEnv: [] }),
    ).toBeNull();
  });

  it("explains a configured source that is turned off", () => {
    expect(unconfiguredSourceTooltip({ configured: true, enabled: false, requiredEnv: [] })).toBe(
      "Not enabled",
    );
  });

  it("explains an unconfigured source that names no env vars", () => {
    expect(unconfiguredSourceTooltip({ configured: false, enabled: false, requiredEnv: [] })).toBe(
      "Not configured",
    );
  });
});
