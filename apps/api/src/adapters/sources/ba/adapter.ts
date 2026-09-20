import type { FetchJobData, NormalizedJob, SourceDefinition } from "@jobfinder/types";

import type { FetchContext, SourceAdapter } from "../../../ports/source-adapter.js";
import type { BaClient } from "./client.js";
import { mapBaDetailToNormalizedJob, mapBaListItemToPartial } from "./mapper.js";

export const BA_MAX_PAGES = 50;
export const BA_PAGE_SIZE = 100;

interface BaSearchResponse {
  ergebnisliste?: unknown[];
  maxErgebnisse?: number;
  page?: number;
  size?: number;
}

export function createBaAdapter(client: BaClient, definition: SourceDefinition): SourceAdapter {
  return {
    definition,

    async *fetch(input: FetchJobData, ctx: FetchContext): AsyncIterable<NormalizedJob> {
      let page = 1;
      let done = 0;
      let total: number | null = null;

      while (page <= BA_MAX_PAGES) {
        if (ctx.signal.aborted) {
          return;
        }

        await ctx.limiter.acquire();

        const params = buildSearchParams(input, page);
        const payload = (await client.searchJobs(params)) as BaSearchResponse;
        const items = payload.ergebnisliste ?? [];

        if (total === null && typeof payload.maxErgebnisse === "number") {
          total = payload.maxErgebnisse;
        }

        if (items.length === 0) {
          break;
        }

        for (const item of items) {
          if (ctx.signal.aborted) {
            return;
          }

          const partial = mapBaListItemToPartial(item);
          if (!partial) {
            continue;
          }

          try {
            await ctx.limiter.acquire();
            const detail = await client.fetchJobDetails(partial.externalId);
            const job = mapBaDetailToNormalizedJob(item, detail);
            done += 1;
            ctx.progress(done, total, `Fetched ${done} BA jobs`);
            yield job;
          } catch {
            continue;
          }
        }

        if (total !== null && page * BA_PAGE_SIZE >= total) {
          break;
        }

        page += 1;
      }
    },
  };
}

function buildSearchParams(input: FetchJobData, page: number): URLSearchParams {
  const params = new URLSearchParams({
    was: input.query,
    page: String(page),
    size: String(BA_PAGE_SIZE),
    angebotsart: "1",
    veroeffentlichtseit: "30",
  });

  if (input.location) {
    params.set("wo", input.location);
    params.set("umkreis", "50");
  }

  return params;
}
