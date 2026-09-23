import { describe, expect, it } from "vitest";

import { emptyListReason, filteredEmptyMessage } from "./empty-list-reason.js";

describe("emptyListReason", () => {
  it("asks for ingest when nothing is filtered", () => {
    expect(emptyListReason({ q: undefined, mustHaveSkills: [], excludeSkills: [] })).toBe("corpus");
  });

  it("names the filters that removed every job", () => {
    const filters = {
      q: "berlin",
      mustHaveSkills: ["typescript"],
      excludeSkills: ["java"],
    };
    expect(emptyListReason(filters)).toBe("filtered");
    expect(filteredEmptyMessage(filters)).toBe(
      "No jobs match search “berlin” · require typescript · exclude java.",
    );
  });
});