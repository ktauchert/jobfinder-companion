import { describe, expect, it, vi } from "vitest";

import { NotFoundError } from "./errors.js";
import { setJobHidden } from "./set-job-hidden.js";

describe("setJobHidden", () => {
  it("hides a job", async () => {
    const setHidden = vi.fn().mockResolvedValue(true);

    const result = await setJobHidden({ jobId: "job-1", hidden: true }, { jobs: { setHidden } });

    expect(setHidden).toHaveBeenCalledWith("job-1", true);
    expect(result).toEqual({ id: "job-1", hidden: true });
  });

  it("throws when the job is missing", async () => {
    await expect(
      setJobHidden(
        { jobId: "missing", hidden: true },
        { jobs: { setHidden: vi.fn().mockResolvedValue(false) } },
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
