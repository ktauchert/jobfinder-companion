import type {
  IngestionRun,
  IngestionRunStats,
  IngestionRunStatus,
  SourceKey,
} from "@jobfinder/types";

export interface CreateRunInput {
  sources: SourceKey[];
  pendingFetch: number;
}

export interface RunRepository {
  createRun(input: CreateRunInput): Promise<IngestionRun>;
  findActiveRun(): Promise<IngestionRun | null>;
  findRecentRuns(limit: number): Promise<IngestionRun[]>;
  findById(runId: string): Promise<IngestionRun | null>;
  updateStatus(runId: string, status: IngestionRunStatus, error?: string | null): Promise<void>;
  incrementStats(
    runId: string,
    delta: Partial<
      Pick<
        IngestionRunStats,
        "fetched" | "inserted" | "updated" | "extracted" | "embedded" | "failed"
      >
    >,
  ): Promise<IngestionRunStats>;
  adjustPending(
    runId: string,
    delta: Partial<Pick<IngestionRunStats, "pendingFetch" | "pendingEnrich">>,
  ): Promise<IngestionRunStats>;
  getStats(runId: string): Promise<IngestionRunStats | null>;
}
