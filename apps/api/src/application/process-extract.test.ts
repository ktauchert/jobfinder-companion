import { describe, expect, it, vi } from "vitest";

import { processExtract } from "./process-extract.js";

describe("processExtract", () => {
  it("publishes run.progress after extracting skills", async () => {
    const publish = vi.fn();
    const stats = {
      fetched: 5,
      inserted: 5,
      updated: 0,
      extracted: 1,
      embedded: 0,
      failed: 0,
      pendingFetch: 0,
      pendingEnrich: 5,
    };

    await processExtract(
      { runId: "run-1", jobId: "job-1", stage: "extract" },
      {
        jobs: {
          findDescriptionText: vi.fn().mockResolvedValue("typescript developer"),
          findContentHash: vi.fn().mockResolvedValue("hash-1"),
          findJobIdWithSkillsByContentHash: vi.fn().mockResolvedValue(null),
          markSkillsExtracted: vi.fn(),
        },
        skills: {
          clearJobSkills: vi.fn(),
          copyJobSkills: vi.fn(),
          upsertJobSkill: vi.fn(),
          findByNameOrAlias: vi.fn().mockResolvedValue({
            id: "skill-1",
            name: "typescript",
            label: "TypeScript",
            aliases: [],
          }),
          findSimilar: vi.fn(),
          createSkill: vi.fn(),
          search: vi.fn(),
        },
        extractor: {
          extract: vi.fn().mockResolvedValue([{ name: "typescript", confidence: 0.9 }]),
        },
        queue: { enqueueEnrich: vi.fn() },
        runs: {
          findById: vi.fn().mockResolvedValue({ id: "run-1", status: "running" }),
          incrementStats: vi.fn(),
          getStats: vi.fn().mockResolvedValue(stats),
          updateStatus: vi.fn(),
        },
        events: { publish },
        checkCompletion: vi.fn(),
      },
    );

    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "run.progress", message: "Extracting skills…" }),
    );
  });

  it("reuses skills from a sibling job with the same content hash", async () => {
    const extract = vi.fn();
    const copyJobSkills = vi.fn();

    await processExtract(
      { runId: "run-1", jobId: "job-2", stage: "extract" },
      {
        jobs: {
          findDescriptionText: vi.fn(),
          findContentHash: vi.fn().mockResolvedValue("shared-hash"),
          findJobIdWithSkillsByContentHash: vi.fn().mockResolvedValue("job-1"),
          markSkillsExtracted: vi.fn(),
        },
        skills: {
          clearJobSkills: vi.fn(),
          copyJobSkills,
          upsertJobSkill: vi.fn(),
          findByNameOrAlias: vi.fn(),
          findSimilar: vi.fn(),
          createSkill: vi.fn(),
          search: vi.fn(),
        },
        extractor: { extract },
        queue: { enqueueEnrich: vi.fn() },
        runs: {
          findById: vi.fn().mockResolvedValue({ id: "run-1", status: "running" }),
          incrementStats: vi.fn(),
          getStats: vi.fn().mockResolvedValue(null),
          updateStatus: vi.fn(),
        },
        events: { publish: vi.fn() },
        checkCompletion: vi.fn(),
      },
    );

    expect(extract).not.toHaveBeenCalled();
    expect(copyJobSkills).toHaveBeenCalledWith("job-1", "job-2");
  });
});
