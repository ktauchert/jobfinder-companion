import { describe, expect, it } from "vitest";

import { averageEmbeddings } from "./average-embeddings.js";

describe("averageEmbeddings", () => {
  it("returns a unit-length blend of two vectors", () => {
    const result = averageEmbeddings([1, 0], [0, 1]);
    expect(result[0]).toBeCloseTo(0.707, 2);
    expect(result[1]).toBeCloseTo(0.707, 2);
    const magnitude = Math.hypot(result[0] ?? 0, result[1] ?? 0);
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it("returns the single vector when only one is provided", () => {
    expect(averageEmbeddings([0.6, 0.8])).toEqual([0.6, 0.8]);
  });
});
