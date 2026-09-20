import type { FetchJobData, NormalizedJob, SourceDefinition } from "@jobfinder/types";

export interface RateLimiter {
  acquire(): Promise<void>;
}

export interface FetchContext {
  signal: AbortSignal;
  limiter: RateLimiter;
  progress(done: number, total: number | null, message: string): void;
}

export interface SourceAdapter {
  definition: SourceDefinition;
  fetch(input: FetchJobData, ctx: FetchContext): AsyncIterable<NormalizedJob>;
}
