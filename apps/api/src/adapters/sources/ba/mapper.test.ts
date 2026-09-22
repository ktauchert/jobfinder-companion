import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { mapBaDetailToNormalizedJob, mapBaListItemToPartial } from "./mapper.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8")) as T;
}

describe("mapBaListItemToPartial", () => {
  it("maps a v6 list item to partial NormalizedJob fields", () => {
    const list = loadFixture<{ ergebnisliste: unknown[] }>("jobs-list-v6.json");
    const item = list.ergebnisliste[1] as Record<string, unknown>;

    const partial = mapBaListItemToPartial(item);

    expect(partial).toMatchObject({
      source: "ba",
      externalId: "10001-1003644689-S",
      title: "Softwareentwickler (m/w/d)",
      company: "Laurin Stankusch Vertriebsagentur",
      location: "Berlin, BERLIN",
      countryCode: "DE",
      remoteType: "hybrid",
      employmentType: "full_time",
      salary: {
        min: 42000,
        max: 60000,
        currency: "EUR",
        period: "year",
      },
      postedAt: "2026-09-03T00:00:00.000Z",
      url: "https://www.arbeitsagentur.de/jobsuche/jobdetail/10001-1003644689-S",
    });
  });

  it("rounds decimal BA salary spans to integer EUR amounts", () => {
    const partial = mapBaListItemToPartial({
      referenznummer: "14225-efaaeaa2ae6f9e7e-S",
      stellenangebotsTitel: "Softwareentwickler (m/w/d)",
      verguetungsangabe: "JAHRESGEHALT",
      gehaltsspanneVon: 54754.68,
      gehaltsspanneBis: 85562.23,
    });

    expect(partial?.salary).toEqual({
      min: 54755,
      max: 85562,
      currency: "EUR",
      period: "year",
    });
  });

  it("prefers externeURL when present", () => {
    const list = loadFixture<{ ergebnisliste: unknown[] }>("jobs-list-v6.json");
    const item = list.ergebnisliste[0] as Record<string, unknown>;

    const partial = mapBaListItemToPartial(item);
    expect(partial).not.toBeNull();

    expect(partial!.url).toBe(
      "https://www.yourfirm.de/job/detail/YF-48852/?utm_source=bundesagentur&utm_medium=unpaid-partner&utm_campaign=000",
    );
    expect(partial!.remoteType).toBe("onsite");
  });
});

describe("mapBaDetailToNormalizedJob", () => {
  it("merges detail description into a complete NormalizedJob", () => {
    const detail = loadFixture<Record<string, unknown>>("job-details-v4.json");
    const list = loadFixture<{ ergebnisliste: unknown[] }>("jobs-list-v6.json");
    const listItem = list.ergebnisliste[1] as Record<string, unknown>;

    const job = mapBaDetailToNormalizedJob(listItem, detail);

    expect(job.descriptionRaw).toContain("PHP");
    expect(job.descriptionText).toContain("PHP");
    expect(job.descriptionText).not.toContain("##");
    expect(job.externalId).toBe("10001-1003644689-S");
  });
});
