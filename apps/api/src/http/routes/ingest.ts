import { Router } from "express";
import type {
  IngestionStatusResponse,
  StartIngestionRequest,
  StartIngestionResponse,
  StopIngestionResponse,
} from "@jobfinder/types";
import { z } from "zod";
import type { Redis } from "ioredis";

import { getIngestionStatus } from "../../application/get-ingestion-status.js";
import { startIngestion } from "../../application/start-ingestion.js";
import { stopIngestion } from "../../application/stop-ingestion.js";
import type { AppContext } from "../../bootstrap/context.js";
import type { RunEventCache } from "../../adapters/events/run-event-cache.js";
import { handleIngestEvents } from "../sse.js";

const startBodySchema = z.object({
  sources: z.array(z.string()).optional(),
  query: z.string().optional(),
  location: z.string().optional(),
});

export interface IngestRouterDeps {
  ctx: AppContext;
  redis: Redis;
  eventCache: RunEventCache;
}

export function createIngestRouter(deps: IngestRouterDeps): Router {
  const router = Router();

  router.post("/ingest/start", (req, res, next) => {
    void (async () => {
      try {
        const parsed = startBodySchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            error: {
              code: "validation_error",
              message: "Invalid request body",
              details: parsed.error.flatten(),
            },
          });
          return;
        }

        const body: StartIngestionResponse = await startIngestion(
          parsed.data as StartIngestionRequest,
          {
            env: {
              ADZUNA_APP_ID: deps.ctx.env.ADZUNA_APP_ID,
              ADZUNA_APP_KEY: deps.ctx.env.ADZUNA_APP_KEY,
              APIFY_TOKEN: deps.ctx.env.APIFY_TOKEN,
            },
            sources: deps.ctx.sources,
            profiles: deps.ctx.profiles,
            runs: deps.ctx.runs,
            queue: deps.ctx.queue,
            events: deps.ctx.events,
            defaultQuery: deps.ctx.defaultIngestQuery,
            defaultLocation: deps.ctx.defaultIngestLocation,
          },
        );
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    })();
  });

  router.post("/ingest/stop", (_req, res, next) => {
    void (async () => {
      try {
        const body: StopIngestionResponse = await stopIngestion({
          runs: deps.ctx.runs,
          queue: deps.ctx.queue,
          events: deps.ctx.events,
        });
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    })();
  });

  router.get("/ingest/status", (_req, res, next) => {
    void (async () => {
      try {
        const body: IngestionStatusResponse = await getIngestionStatus({
          runs: deps.ctx.runs,
        });
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    })();
  });

  router.get("/ingest/events", (_req, res) => {
    handleIngestEvents(
      {
        runs: deps.ctx.runs,
        redis: deps.redis,
        eventCache: deps.eventCache,
      },
      res,
    );
  });

  return router;
}
