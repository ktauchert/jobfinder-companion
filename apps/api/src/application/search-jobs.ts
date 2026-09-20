import type { JobMatch, SearchJobsQuery, SearchJobsResponse } from "@jobfinder/types";

import { averageEmbeddings } from "../domain/average-embeddings.js";
import { decodeJobCursor, encodeJobCursor, isAfterCursor } from "../domain/job-cursor.js";
import { computeMatchScore } from "../domain/match-score.js";
import { buildSkillMatches } from "../domain/skill-matches.js";
import type { Embedder } from "../ports/embedder.js";
import type { ProfileRepository } from "../ports/profile-repository.js";
import type { SearchQuery, SearchRepository } from "../ports/search-repository.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const VECTOR_MULTIPLIER = 3;

export interface SearchJobsDeps {
  profiles: Pick<ProfileRepository, "getSearchContext">;
  search: SearchRepository;
  embedder: Embedder;
}

export async function searchJobs(
  query: SearchJobsQuery,
  deps: SearchJobsDeps,
): Promise<SearchJobsResponse> {
  const limit = clampLimit(query.limit);
  const profile = await deps.profiles.getSearchContext();
  const searchQuery = await buildSearchQuery(query, profile, deps.embedder);

  const vectorLimit = limit * VECTOR_MULTIPLIER;
  const [candidates, total] = await Promise.all([
    deps.search.searchCandidates(searchQuery, vectorLimit),
    deps.search.countMatching(searchQuery),
  ]);

  const jobs = await deps.search.loadJobsByIds(candidates.map((candidate) => candidate.jobId));
  const jobsById = new Map(jobs.map((job) => [job.id, job]));

  const ranked: JobMatch[] = candidates
    .map((candidate) => {
      const job = jobsById.get(candidate.jobId);
      if (!job) {
        return null;
      }

      return toJobMatch(job, candidate.similarity, candidate.mustHaveCoverage, profile);
    })
    .filter((match): match is JobMatch => match != null)
    .sort(compareJobMatches);

  const cursor = query.cursor ? decodeJobCursor(query.cursor) : null;
  const afterCursor = cursor
    ? ranked.filter((match) => isAfterCursor({ matchScore: match.matchScore, id: match.job.id }, cursor))
    : ranked;

  const page = afterCursor.slice(0, limit);
  const last = page.at(-1);
  const hasMoreInWindow = afterCursor.length > limit;
  const nextCursor = last && hasMoreInWindow ? encodeJobCursor({ matchScore: last.matchScore, id: last.job.id }) : null;

  return {
    items: page,
    nextCursor,
    total,
  };
}

async function buildSearchQuery(
  query: SearchJobsQuery,
  profile: Awaited<ReturnType<ProfileRepository["getSearchContext"]>>,
  embedder: Embedder,
): Promise<SearchQuery> {
  let queryEmbedding = profile.embedding;

  const q = query.q?.trim();
  if (q) {
    const qVector = await embedder.embedQuery(q);
    queryEmbedding =
      profile.embedding != null ? averageEmbeddings(profile.embedding, qVector) : qVector;
  }

  return {
    profileId: profile.id,
    queryEmbedding,
    ...(query.maxAgeDays != null ? { maxAgeDays: query.maxAgeDays } : {}),
    ...(query.includeHidden != null ? { includeHidden: query.includeHidden } : {}),
  };
}

function toJobMatch(
  job: JobMatch["job"],
  similarity: number,
  mustHaveCoverage: number,
  profile: Awaited<ReturnType<ProfileRepository["getSearchContext"]>>,
): JobMatch {
  return {
    job,
    similarity,
    mustHaveCoverage,
    matchScore: computeMatchScore({ similarity, mustHaveCoverage }),
    skillMatches: buildSkillMatches(
      job.skills.map((entry) => entry.skill),
      profile,
    ),
  };
}

function compareJobMatches(a: JobMatch, b: JobMatch): number {
  if (a.matchScore !== b.matchScore) {
    return b.matchScore - a.matchScore;
  }
  return a.job.id.localeCompare(b.job.id);
}

function clampLimit(limit: number | undefined): number {
  const value = limit ?? DEFAULT_LIMIT;
  return Math.min(Math.max(value, 1), MAX_LIMIT);
}
