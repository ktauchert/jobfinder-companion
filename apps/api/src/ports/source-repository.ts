import type { IngestionRunStatus, SourceKey, SourceTier } from "@jobfinder/types";

export interface SourceRow {
  key: SourceKey;
  tier: SourceTier;
  enabled: boolean;
}

export interface SourceLastRun {
  startedAt: Date;
  status: IngestionRunStatus;
}

export interface SourceRepository {
  ensureSeeded(rows: SourceRow[]): Promise<void>;
  findAll(): Promise<SourceRow[]>;
  setEnabled(key: SourceKey, enabled: boolean): Promise<SourceRow | null>;
  findLastRunBySource(key: SourceKey): Promise<SourceLastRun | null>;
}
