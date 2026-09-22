export { createDb, type Database } from "./client.js";
export { SKILL_SEED_ENTRIES, seedSkills } from "./seed/skills.js";
export * from "./schema/index.js";
export { EMBEDDING_DIMENSIONS } from "./vector.js";
export { embeddingColumn } from "./schema/tables.js";
export type { IngestionRunRow, JobRow, SkillRow, SourceRow } from "./schema/tables.js";
