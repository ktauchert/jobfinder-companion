import { describe, expect, it } from "vitest";

import { stepMaxAgeDays, stepSimilarityWeight } from "./profile-tuning.js";

describe("profile tuning steps", () => {
  it("clamps similarity weight to 0..1 in tenths", () => {
    expect(stepSimilarityWeight(0.6, 1)).toBe(0.7);
    expect(stepSimilarityWeight(0, -1)).toBe(0);
    expect(stepSimilarityWeight(1, 1)).toBe(1);
  });

  it("steps max age by a week and clears it below one week", () => {
    expect(stepMaxAgeDays(null, 1)).toBe(30);
    expect(stepMaxAgeDays(14, -1)).toBe(7);
    expect(stepMaxAgeDays(7, -1)).toBeNull();
  });
});