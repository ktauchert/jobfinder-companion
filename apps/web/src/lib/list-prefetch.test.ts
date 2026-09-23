import { describe, expect, it } from "vitest";

import { shouldPrefetchNextPage } from "./list-prefetch.js";

describe("shouldPrefetchNextPage", () => {
  it("prefetches once the visible index reaches 70 percent", () => {
    expect(shouldPrefetchNextPage(6, 10)).toBe(true);
    expect(shouldPrefetchNextPage(5, 10)).toBe(false);
    expect(shouldPrefetchNextPage(-1, 10)).toBe(false);
  });
});