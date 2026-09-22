import { REMOTE_TYPES, type ProfileResponse, type UpdateProfileRequest } from "@jobfinder/types";
import { Router } from "express";
import { z } from "zod";

import { getProfile } from "../../application/get-profile.js";
import { updateProfile } from "../../application/update-profile.js";
import type { ProfileQueue } from "../../ports/profile-queue.js";
import type { ProfileRepository } from "../../ports/profile-repository.js";
import type { SkillRepository } from "../../ports/skill-repository.js";

export const profileInputSchema = z.object({
  name: z.string().trim().min(1),
  mustHaveSkills: z.array(z.string()),
  excludeSkills: z.array(z.string()),
  summary: z.string(),
  ingestQueries: z.array(z.string()),
  remoteTypes: z.array(z.enum(REMOTE_TYPES)),
  countryCodes: z.array(z.string().length(2)),
  minSalary: z.number().int().nonnegative().nullable(),
}) satisfies z.ZodType<UpdateProfileRequest>;

export interface ProfileRouterDeps {
  profiles: ProfileRepository;
  skills: SkillRepository;
  profileQueue: ProfileQueue;
}

export function createProfileRouter(deps: ProfileRouterDeps): Router {
  const router = Router();
  const useCaseDeps = {
    profiles: deps.profiles,
    skills: deps.skills,
    profileQueue: deps.profileQueue,
  };

  router.get("/profile", (_req, res, next) => {
    void (async () => {
      try {
        const body: ProfileResponse = await getProfile(useCaseDeps);
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    })();
  });

  router.put("/profile", (req, res, next) => {
    void (async () => {
      try {
        const parsed = profileInputSchema.safeParse(req.body);
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

        const body: ProfileResponse = await updateProfile(parsed.data, useCaseDeps);
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    })();
  });

  return router;
}
