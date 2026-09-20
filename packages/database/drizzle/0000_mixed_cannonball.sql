CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contract', 'freelance', 'internship', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."ingestion_run_status" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."remote_type" AS ENUM('remote', 'hybrid', 'onsite', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."salary_period" AS ENUM('year', 'month', 'day', 'hour');--> statement-breakpoint
CREATE TYPE "public"."source_key" AS ENUM('ba', 'greenhouse', 'lever', 'adzuna', 'apify');--> statement-breakpoint
CREATE TYPE "public"."source_tier" AS ENUM('free', 'paid');--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "ingestion_run_status" DEFAULT 'queued' NOT NULL,
	"sources" text[] DEFAULT '{}'::text[] NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"stats" jsonb DEFAULT '{"fetched":0,"inserted":0,"updated":0,"extracted":0,"embedded":0,"failed":0}'::jsonb NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "job_embeddings" (
	"job_id" uuid PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_skills" (
	"job_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"confidence" real NOT NULL,
	CONSTRAINT "job_skills_job_id_skill_id_pk" PRIMARY KEY("job_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "source_key" NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"company" text,
	"location" text,
	"country_code" text,
	"remote_type" "remote_type" DEFAULT 'unknown' NOT NULL,
	"employment_type" "employment_type" DEFAULT 'unknown' NOT NULL,
	"salary_min" integer,
	"salary_max" integer,
	"salary_currency" text,
	"salary_period" "salary_period",
	"description_raw" text NOT NULL,
	"description_text" text NOT NULL,
	"url" text NOT NULL,
	"posted_at" timestamp with time zone,
	"content_hash" text NOT NULL,
	"skills_extracted_at" timestamp with time zone,
	"embedded_at" timestamp with time zone,
	"hidden_at" timestamp with time zone,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_source_external_id_uidx" UNIQUE("source","external_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"must_have_skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"exclude_skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"remote_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"country_codes" text[] DEFAULT '{}'::text[] NOT NULL,
	"min_salary" integer,
	"embedding" vector(768),
	"embedded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "skills_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"key" "source_key" PRIMARY KEY NOT NULL,
	"tier" "source_tier" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_embeddings" ADD CONSTRAINT "job_embeddings_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_source_sources_key_fk" FOREIGN KEY ("source") REFERENCES "public"."sources"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_embeddings_embedding_hnsw_idx" ON "job_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "jobs_fetched_at_idx" ON "jobs" USING btree ("fetched_at");--> statement-breakpoint
CREATE INDEX "jobs_hidden_at_idx" ON "jobs" USING btree ("hidden_at");--> statement-breakpoint
CREATE INDEX "profiles_embedding_hnsw_idx" ON "profiles" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "skills_name_trgm_idx" ON "skills" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "skills_label_trgm_idx" ON "skills" USING gin ("label" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "skills_aliases_gin_idx" ON "skills" USING gin ("aliases");