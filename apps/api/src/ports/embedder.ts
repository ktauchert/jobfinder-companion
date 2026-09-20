export interface Embedder {
  embedDocument(text: string): Promise<number[]>;
  readonly model: string;
  readonly dimensions: number;
}
