ALTER TABLE "profiles" ADD COLUMN "similarity_weight" real DEFAULT 0.6 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "max_age_days" integer;