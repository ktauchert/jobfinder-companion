import type { JobResponse, SearchJobsQuery, SearchJobsResponse } from "@jobfinder/types";
import { Router } from "express";
import { z } from "zod";

import { getJobMatch } from "../../application/get-job-match.js";
import { searchJobs } from "../../application/search-jobs.js";
import type { Embedder } from "../../ports/embedder.js";
import type { ProfileRepository } from "../../ports/profile-repository.js";
import type { SearchRepository } from "../../ports/search-repository.js";

const searchJobsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().optional(),
  maxAgeDays: z.coerce.number().int().positive().optional(),
  includeHidden: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

export interface JobsRouterDeps {
  profiles: ProfileRepository;
  search: SearchRepository;
  embedder: Embedder;
}

export function createJobsRouter(deps: JobsRouterDeps): Router {
  const router = Router();
  const useCaseDeps = {
    profiles: deps.profiles,
    search: deps.search,
    embedder: deps.embedder,
  };

  router.get("/jobs", (req, res, next) => {
    void (async () => {
      try {
        const parsed = searchJobsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          res.status(400).json({
            error: {
              code: "validation_error",
              message: "Invalid query parameters",
              details: parsed.error.flatten(),
            },
          });
          return;
        }

        const body: SearchJobsResponse = await searchJobs(toSearchJobsQuery(parsed.data), useCaseDeps);
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    })();
  });

  router.get("/jobs/:id", (req, res, next) => {
    void (async () => {
      try {
        const body: JobResponse = await getJobMatch(req.params.id, useCaseDeps);
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    })();
  });

  return router;
}

function toSearchJobsQuery(parsed: z.infer<typeof searchJobsQuerySchema>): SearchJobsQuery {
  const query: SearchJobsQuery = {};
  if (parsed.cursor) {
    query.cursor = parsed.cursor;
  }
  if (parsed.limit != null) {
    query.limit = parsed.limit;
  }
  if (parsed.q) {
    query.q = parsed.q;
  }
  if (parsed.maxAgeDays != null) {
    query.maxAgeDays = parsed.maxAgeDays;
  }
  if (parsed.includeHidden != null) {
    query.includeHidden = parsed.includeHidden;
  }
  return query;
}
