import { jobSkills, jobs, skills, type Database } from "@jobfinder/database";
import type { Job, JobSkill } from "@jobfinder/types";
import { eq, inArray } from "drizzle-orm";

import { mapJobRow } from "./map-job.js";

export async function loadJobsWithSkills(
  db: Database,
  jobIds: string[],
): Promise<Map<string, Job>> {
  if (jobIds.length === 0) {
    return new Map();
  }

  const jobRows = await db.select().from(jobs).where(inArray(jobs.id, jobIds));

  const skillRows = await db
    .select({
      jobId: jobSkills.jobId,
      skillId: skills.id,
      name: skills.name,
      label: skills.label,
      aliases: skills.aliases,
      confidence: jobSkills.confidence,
    })
    .from(jobSkills)
    .innerJoin(skills, eq(jobSkills.skillId, skills.id))
    .where(inArray(jobSkills.jobId, jobIds));

  const skillsByJob = new Map<string, JobSkill[]>();
  for (const row of skillRows) {
    const list = skillsByJob.get(row.jobId) ?? [];
    list.push({
      skill: {
        id: row.skillId,
        name: row.name,
        label: row.label,
        aliases: row.aliases,
      },
      confidence: row.confidence,
    });
    skillsByJob.set(row.jobId, list);
  }

  const result = new Map<string, Job>();
  for (const row of jobRows) {
    result.set(row.id, mapJobRow(row, skillsByJob.get(row.id) ?? []));
  }

  return result;
}
