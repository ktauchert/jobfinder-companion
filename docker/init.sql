-- JobFinder – PostgreSQL bootstrap.
--
-- Executed once by the postgres container when the data volume is empty
-- (docker-entrypoint-initdb.d). It runs against the database named by
-- POSTGRES_DB as the POSTGRES_USER superuser.
--
-- Scope: extensions only.
-- All tables, indexes and enums are owned by Drizzle migrations in
-- `packages/database` so that the schema has exactly one source of truth.
-- See docs/adr/0001-foundational-decisions.md and docs/ARCHITECTURE.md
-- ("Data model") for the table design that those migrations implement.

-- Vector similarity search (job and profile embeddings; HNSW index).
CREATE EXTENSION IF NOT EXISTS vector;

-- Trigram similarity for fuzzy skill-name matching ("typescript" ~ "type script").
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Accent-insensitive text normalisation for German job titles / locations.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- UUID generation without relying on application code.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Sanity check: fail loudly at container start if pgvector is not usable.
DO $$
BEGIN
  PERFORM '[1,2,3]'::vector(3) <=> '[3,2,1]'::vector(3);
  RAISE NOTICE 'pgvector OK';
END
$$;
