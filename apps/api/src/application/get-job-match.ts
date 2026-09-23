import type { JobMatch, JobResponse } from "@jobfinder/types";

import { computeMatchScore } from "../domain/match-score.js";
import { buildSkillMatches } from "../domain/skill-matches.js";
import { NotFoundError } from "./errors.js";
import type { ProfileRepository } from "../ports/profile-repository.js";
import type { SearchQuery, SearchRepository } from "../ports/search-repository.js";

export interface GetJobMatchDeps {
  profiles: Pick<ProfileRepository, "getSearchContext">;
  search: SearchRepository;
}

export async function getJobMatch(jobId: string, deps: GetJobMatchDeps): Promise<JobResponse> {
  const profile = await deps.profiles.getSearchContext();
  const job = await deps.search.findEnrichedJobById(jobId);
  if (!job) {
    throw new NotFoundError(`Job not found: ${jobId}`);
  }

  const searchQuery: SearchQuery = {
    profileId: profile.id,
    queryEmbedding: profile.embedding,
  };

  const metrics = await deps.search.computeCandidateMetrics(jobId, searchQuery);
  const similarity = metrics?.similarity ?? 0;
  const mustHaveCoverage = metrics?.mustHaveCoverage ?? 0;

  const match: JobMatch = {
    job,
    similarity,
    mustHaveCoverage,
    matchScore: computeMatchScore({
      similarity,
      mustHaveCoverage,
      similarityWeight: profile.similarityWeight,
    }),
    skillMatches: buildSkillMatches(
      job.skills.map((entry) => entry.skill),
      profile,
    ),
  };

  return { match };
}
