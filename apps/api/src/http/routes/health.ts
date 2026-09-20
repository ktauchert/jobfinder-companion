import { Router } from "express";
import type { HealthResponse } from "@jobfinder/types";

import type { GetHealthDeps } from "../../application/get-health.js";
import { getHealth } from "../../application/get-health.js";

export function createHealthRouter(deps: GetHealthDeps): Router {
  const router = Router();

  router.get("/health", (_req, res, next) => {
    void (async () => {
      try {
        const body: HealthResponse = await getHealth(deps);
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    })();
  });

  return router;
}
