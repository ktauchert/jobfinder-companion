import { Router } from "express";
import { SOURCE_KEYS, type SourcesResponse } from "@jobfinder/types";
import { z } from "zod";

import { getSources, type GetSourcesDeps } from "../../application/get-sources.js";
import { updateSource } from "../../application/update-source.js";
import type { SourceEnv } from "../../application/source-registry.js";
import type { SourceRepository } from "../../ports/source-repository.js";

const sourceKeySchema = z.enum(SOURCE_KEYS);

const updateSourceBodySchema = z.object({
  enabled: z.boolean(),
});

export interface SourcesRouterDeps {
  env: SourceEnv;
  sources: SourceRepository;
}

export function createSourcesRouter(deps: SourcesRouterDeps): Router {
  const router = Router();
  const useCaseDeps: GetSourcesDeps = deps;

  router.get("/sources", (_req, res, next) => {
    void (async () => {
      try {
        const body: SourcesResponse = await getSources(useCaseDeps);
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    })();
  });

  router.patch("/sources/:key", (req, res, next) => {
    void (async () => {
      try {
        const keyResult = sourceKeySchema.safeParse(req.params.key);
        if (!keyResult.success) {
          res.status(404).json({
            error: { code: "not_found", message: `Unknown source: ${req.params.key}` },
          });
          return;
        }

        const bodyResult = updateSourceBodySchema.safeParse(req.body);
        if (!bodyResult.success) {
          res.status(400).json({
            error: {
              code: "validation_error",
              message: "Invalid request body",
              details: bodyResult.error.flatten(),
            },
          });
          return;
        }

        const response = await updateSource(
          { key: keyResult.data, enabled: bodyResult.data.enabled },
          deps,
        );
        res.status(200).json(response);
      } catch (err) {
        next(err);
      }
    })();
  });

  return router;
}
