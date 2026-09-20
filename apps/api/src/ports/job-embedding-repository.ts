export interface JobEmbeddingRepository {
  upsert(jobId: string, model: string, embedding: number[]): Promise<void>;
}
