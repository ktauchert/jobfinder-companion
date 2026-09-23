import { describe, expect, it } from "vitest";

import { plainParagraphs } from "./job-detail-text.js";

describe("plainParagraphs", () => {
  it("drops tags and keeps paragraph breaks", () => {
    expect(plainParagraphs("<p>Hello</p>\n\n<script>alert(1)</script>\n\nWorld")).toEqual([
      "Hello",
      "World",
    ]);
  });
});
