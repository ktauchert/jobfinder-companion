import type { Job } from "@jobfinder/types";

export interface SearchQuery {
  profileId: string;
  /** When null, candidates are ordered by fetched_at instead of vector distance. */
  queryEmbedding: number[] | null;
  maxAgeDays?: number;
  includeHidden?: boolean;
}

export interface SearchCandidate {
  jobId: string;
  similarity: number;
  mustHaveCoverage: number;
}

export interface SearchRepository {
  searchCandidates(query: SearchQuery, vectorLimit: number): Promise<SearchCandidate[]>;
  countMatching(query: SearchQuery): Promise<number>;
  loadJobsByIds(jobIds: string[]): Promise<Job[]>;
  findEnrichedJobById(jobId: string): Promise<Job | null>;
  computeCandidateMetrics(
    jobId: string,
    query: SearchQuery,
  ): Promise<Pick<SearchCandidate, "similarity" | "mustHaveCoverage"> | null>;
}
