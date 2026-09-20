import { describe, expect, it, vi } from "vitest";

import { NotFoundError } from "./errors.js";
import { updateSource } from "./update-source.js";

describe("updateSource", () => {
  it("updates enabled flag for a known source", async () => {
    const setEnabled = vi.fn().mockResolvedValue({ key: "ba", tier: "free", enabled: false });

    const result = await updateSource(
      { key: "ba", enabled: false },
      {
        env: { ADZUNA_APP_ID: "", ADZUNA_APP_KEY: "", APIFY_TOKEN: "" },
        sources: {
          setEnabled,
          findAll: vi.fn().mockResolvedValue([{ key: "ba", tier: "free", enabled: false }]),
          findLastRunBySource: vi.fn().mockResolvedValue(null),
        },
      },
    );

    expect(setEnabled).toHaveBeenCalledWith("ba", false);
    expect(result.sources.find((s) => s.key === "ba")?.enabled).toBe(false);
  });

  it("throws not_found for an unknown source key", async () => {
    await expect(
      updateSource(
        { key: "ba", enabled: false },
        {
          env: { ADZUNA_APP_ID: "", ADZUNA_APP_KEY: "", APIFY_TOKEN: "" },
          sources: {
            setEnabled: vi.fn().mockResolvedValue(null),
            findAll: vi.fn(),
            findLastRunBySource: vi.fn(),
          },
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
