import cors from "cors";
import express from "express";
import type { Logger } from "pino";

import type { Redis } from "ioredis";

import type { GetHealthDeps } from "../application/get-health.js";
import type { AppContext } from "../bootstrap/context.js";
import type { Env } from "../env.js";
import { createErrorHandler } from "./error-handler.js";
import { createHttpLogger } from "./http-logging.js";
import { createHealthRouter } from "./routes/health.js";
import { createIngestRouter } from "./routes/ingest.js";
import { createJobsRouter } from "./routes/jobs.js";
import { createProfileRouter } from "./routes/profile.js";
import { createSkillsRouter } from "./routes/skills.js";
import { createSourcesRouter } from "./routes/sources.js";

export interface CreateAppOptions {
  env: Env;
  logger: Logger;
  health: GetHealthDeps;
  ctx: AppContext;
  redis: Redis;
}

export function createApp(options: CreateAppOptions) {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin: options.env.CORS_ORIGIN,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(createHttpLogger(options.logger));

  app.use("/api", createHealthRouter(options.health));
  app.use(
    "/api",
    createSourcesRouter({
      env: {
        ADZUNA_APP_ID: options.env.ADZUNA_APP_ID,
        ADZUNA_APP_KEY: options.env.ADZUNA_APP_KEY,
        APIFY_TOKEN: options.env.APIFY_TOKEN,
      },
      sources: options.ctx.sources,
    }),
  );
  app.use(
    "/api",
    createIngestRouter({
      ctx: options.ctx,
      redis: options.redis,
      eventCache: options.ctx.eventCache,
    }),
  );
  app.use(
    "/api",
    createProfileRouter({
      profiles: options.ctx.profiles,
      skills: options.ctx.skills,
      profileQueue: options.ctx.profileQueue,
    }),
  );
  app.use(
    "/api",
    createJobsRouter({
      profiles: options.ctx.profiles,
      jobs: options.ctx.jobs,
      search: options.ctx.search,
      embedder: options.ctx.embedder,
    }),
  );
  app.use(
    "/api",
    createSkillsRouter({
      skills: options.ctx.skills,
    }),
  );

  app.use(createErrorHandler(options.logger));

  return app;
}
