export { createDb, type Database } from "./client.js";
export * from "./schema/index.js";
export { EMBEDDING_DIMENSIONS } from "./vector.js";
export { embeddingColumn } from "./schema/tables.js";
export type {
  IngestionRunRow,
  JobRow,
  SkillRow,
  SourceRow,
} from "./schema/tables.js";
