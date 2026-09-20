import type { SkillsSearchResponse } from "@jobfinder/types";
import { Router } from "express";
import { z } from "zod";

import { searchSkills } from "../../application/search-skills.js";
import type { SkillRepository } from "../../ports/skill-repository.js";

const skillsQuerySchema = z.object({
  q: z.string().optional().default(""),
  limit: z.coerce.number().int().positive().max(20).optional().default(8),
});

export interface SkillsRouterDeps {
  skills: SkillRepository;
}

export function createSkillsRouter(deps: SkillsRouterDeps): Router {
  const router = Router();

  router.get("/skills", (req, res, next) => {
    void (async () => {
      try {
        const parsed = skillsQuerySchema.safeParse(req.query);
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

        const body: SkillsSearchResponse = await searchSkills(
          { q: parsed.data.q, limit: parsed.data.limit },
          deps,
        );
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    })();
  });

  return router;
}
