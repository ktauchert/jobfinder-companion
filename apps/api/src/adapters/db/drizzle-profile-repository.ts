import { createDb, profiles, type Database } from "@jobfinder/database";
import type { Profile, ProfileInput } from "@jobfinder/types";
import { eq } from "drizzle-orm";

import type { ProfileRepository } from "../../ports/profile-repository.js";
import { mapProfileRow } from "./map-profile.js";
import { parseEmbedding } from "./parse-embedding.js";

const DEFAULT_PROFILE_NAME = "default";

export function createDrizzleProfileRepository(databaseUrl: string): ProfileRepository {
  return createDrizzleProfileRepositoryFromDb(createDb(databaseUrl));
}

export function createDrizzleProfileRepositoryFromDb(db: Database): ProfileRepository {
  return {
    async ensureDefault() {
      const existing = await db
        .select()
        .from(profiles)
        .where(eq(profiles.name, DEFAULT_PROFILE_NAME))
        .limit(1);

      const row = existing[0];
      if (row) {
        return mapProfileRow(row);
      }

      const inserted = await db
        .insert(profiles)
        .values({
          name: DEFAULT_PROFILE_NAME,
          ingestQueries: ["softwareentwickler"],
        })
        .returning();

      const created = inserted[0];
      if (!created) {
        throw new Error("Failed to create default profile");
      }

      return mapProfileRow(created);
    },

    async getDefault() {
      const rows = await db
        .select()
        .from(profiles)
        .where(eq(profiles.name, DEFAULT_PROFILE_NAME))
        .limit(1);

      const row = rows[0];
      if (!row) {
        throw new Error("Default profile not found");
      }

      return mapProfileRow(row);
    },

    async getSearchContext() {
      const rows = await db
        .select()
        .from(profiles)
        .where(eq(profiles.name, DEFAULT_PROFILE_NAME))
        .limit(1);

      const row = rows[0];
      if (!row) {
        throw new Error("Default profile not found");
      }

      return {
        id: row.id,
        embedding: parseEmbedding(row.embedding),
        mustHaveSkills: row.mustHaveSkills ?? [],
        excludeSkills: row.excludeSkills ?? [],
        remoteTypes: (row.remoteTypes ?? []) as Profile["remoteTypes"],
        countryCodes: row.countryCodes ?? [],
        minSalary: row.minSalary,
      };
    },

    async update(input: ProfileInput) {
      const current = await this.getDefault();

      const updated = await db
        .update(profiles)
        .set({
          name: input.name,
          mustHaveSkills: input.mustHaveSkills,
          excludeSkills: input.excludeSkills,
          summary: input.summary,
          ingestQueries: input.ingestQueries,
          remoteTypes: input.remoteTypes,
          countryCodes: input.countryCodes,
          minSalary: input.minSalary,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, current.id))
        .returning();

      const row = updated[0];
      if (!row) {
        throw new Error("Failed to update profile");
      }

      return mapProfileRow(row);
    },

    async findEmbedInput(profileId: string) {
      const rows = await db
        .select({
          summary: profiles.summary,
          mustHaveSkills: profiles.mustHaveSkills,
        })
        .from(profiles)
        .where(eq(profiles.id, profileId))
        .limit(1);

      const row = rows[0];
      if (!row) {
        return null;
      }

      return {
        summary: row.summary,
        mustHaveSkills: row.mustHaveSkills,
      };
    },

    async setEmbedding(profileId: string, embedding: number[]) {
      await db
        .update(profiles)
        .set({
          embedding,
          embeddedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, profileId));
    },
  };
}
