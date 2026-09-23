import type { IngestionEvent, IngestionRunStats } from "@jobfinder/types";

export interface SourceProgress {
  source: string;
  stage: string;
  done: number;
  total: number | null;
  message: string;
}

export interface SourceFailure {
  source: string;
  message: string;
}

export interface IngestionUiState {
  activeRunId: string | null;
  sources: Record<string, SourceProgress>;
  runStats: IngestionRunStats | null;
  lastMessage: string | null;
  summary: string | null;
  sourceFailures: SourceFailure[];
}

export const initialIngestionUiState: IngestionUiState = {
  activeRunId: null,
  sources: {},
  runStats: null,
  lastMessage: null,
  summary: null,
  sourceFailures: [],
};

export function reduceIngestionUi(
  state: IngestionUiState,
  event: IngestionEvent,
): IngestionUiState {
  if (event.type === "heartbeat") {
    return state;
  }
  if (event.type === "run.started") {
    return {
      activeRunId: event.runId,
      sources: {},
      runStats: null,
      lastMessage: "Run started",
      summary: null,
      sourceFailures: [],
    };
  }
  if (event.type === "source.progress") {
    return {
      ...state,
      activeRunId: event.runId,
      lastMessage: event.message,
      sources: {
        ...state.sources,
        [event.source]: {
          source: event.source,
          stage: event.stage,
          done: event.done,
          total: event.total,
          message: event.message,
        },
      },
    };
  }
  if (event.type === "source.failed") {
    const rest = state.sourceFailures.filter((failure) => failure.source !== event.source);
    return {
      ...state,
      activeRunId: event.runId,
      lastMessage: event.error,
      sourceFailures: [...rest, { source: event.source, message: event.error }],
    };
  }
  if (event.type === "run.progress") {
    return {
      ...state,
      activeRunId: event.runId,
      runStats: event.stats,
      lastMessage: event.message,
    };
  }
  if (event.type === "run.completed") {
    return {
      ...state,
      runStats: event.stats,
      summary: `${event.stats.embedded} embedded · ${event.stats.extracted} extracted · ${event.stats.fetched} fetched`,
      lastMessage: "Run completed",
    };
  }
  if (event.type === "run.cancelled") {
    return {
      ...state,
      activeRunId: null,
      lastMessage: "Run cancelled",
    };
  }
  if (event.type === "run.failed") {
    return {
      ...state,
      activeRunId: null,
      lastMessage: event.error,
    };
  }
  return state;
}

export function dismissSourceFailure(state: IngestionUiState, source: string): IngestionUiState {
  return {
    ...state,
    sourceFailures: state.sourceFailures.filter((failure) => failure.source !== source),
  };
}
