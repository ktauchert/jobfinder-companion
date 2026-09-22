import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { filterExtractedSkills } from "./filter-extracted-skills.js";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../adapters/sources/ba/fixtures",
);

function laurinDescriptionText(): string {
  const detail = JSON.parse(readFileSync(join(fixturesDir, "job-details-v4.json"), "utf8")) as {
    stellenangebotsBeschreibung?: string;
  };
  return detail.stellenangebotsBeschreibung ?? "";
}

describe("filterExtractedSkills", () => {
  it("keeps short technology names and drops sentence-like task phrases", () => {
    const raw = [
      { name: "PHP", confidence: 0.92 },
      { name: "Laravel", confidence: 0.88 },
      { name: "Git", confidence: 0.85 },
      { name: "Docker", confidence: 0.8 },
      {
        name: "Umsetzung technischer Lösungen auf Basis fachlicher Anforderungen",
        confidence: 0.75,
      },
      { name: "Kenntnisse in Git sowie Interesse an Docker", confidence: 0.7 },
      { name: "typescript", confidence: 0.4 },
    ];

    const filtered = filterExtractedSkills(raw);

    expect(filtered.map((s) => s.name)).toEqual(["PHP", "Laravel", "Git", "Docker"]);
  });

  it("drops low-confidence entries", () => {
    const filtered = filterExtractedSkills([
      { name: "React", confidence: 0.9 },
      { name: "Java", confidence: 0.3 },
    ]);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.name).toBe("React");
  });

  it("caps the number of skills returned", () => {
    const many = Array.from({ length: 30 }, (_, index) => ({
      name: `skill-${index}`,
      confidence: 0.9,
    }));

    expect(filterExtractedSkills(many)).toHaveLength(20);
  });

  it("accepts realistic noise from the Laurin Stankusch BA description context", () => {
    expect(laurinDescriptionText()).toContain("PHP");

    const noisy = [
      { name: "PHP", confidence: 0.91 },
      { name: "Laravel", confidence: 0.87 },
      { name: "Freude daran, sauberen und verständlichen Code zu schreiben", confidence: 0.65 },
      {
        name: "Mitarbeit an spannenden Projekten rund um den digitalen B2B-Handel",
        confidence: 0.6,
      },
    ];

    expect(filterExtractedSkills(noisy).map((s) => s.name)).toEqual(["PHP", "Laravel"]);
  });
});
