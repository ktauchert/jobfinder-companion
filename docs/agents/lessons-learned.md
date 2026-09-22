# Lessons learned

Post-incident notes for agents and humans. Not ADRs — no formal decision record.
Add a dated entry when a bug or workflow mistake is worth remembering.

## 2026-09-22 — Empty search, ingest, and UI crashes (#56 branch)

Context: must-have hard filter (#56), profile-driven ingest (#50–51), local
dev with truncated jobs table, and several follow-up fixes in one session.

### Symptoms we confused with each other

| Symptom | Often actually |
| -------- | --------------- |
| Job list empty | Zero rows in `jobs`, or zero rows with `embedded_at` set — not a search bug |
| List empty after Require skill | Must-have SQL filter (#56) + skill not in `job_skills` (only in title text) |
| `PUT /profile` 500 | BullMQ job id with wrong colon segment count (profile embed queue) |
| UI "Something went wrong" / `.length` | Render assumed `skillMatches` or API arrays were always defined |
| Endless network errors during ingest | Polling `/jobs` and `/ingest/status` under Postgres load (`ECONNRESET`) |
| Redis `[ioredis] Unhandled error event` | Subscriber connection running ioredis ready check (`INFO`) while subscribed |
| API crash on startup (`seedSources`, `ECONNRESET`) | Docker Postgres port forwarding broken after unclean shutdown (Windows). `docker exec … psql` works; host/`localhost` does not. **`docker restart jobfinder-postgres`** |
| Vite `http proxy error` / `ECONNREFUSED` | API not listening (crashed on startup) — fix API first, not the web app |

### Code rules (now enforced or documented)

1. **BullMQ job ids** — see `apps/api/src/adapters/queue/job-ids.ts` and its tests.
   Wrong segment count throws at runtime when enqueueing (e.g. profile save).
2. **Redis pub/sub** — use `createRedisSubscriber()`; `enableReadyCheck: false`.
3. **Must-have filter** — hard SQL filter on `job_skills`, not description text.
   See `docs/SEARCH-AND-EMBEDDINGS.md` and ADR 0006.
4. **Only embedded jobs appear in search** — `embedded_at IS NOT NULL` in the
   search repository. Fetch/extract can complete before the list grows.
5. **`apps/web` arrays from the API** — treat list fields defensively
   (`?? []`) before `.length` / `.map`; TanStack Query cache can hold partial data.

### Agent workflow

1. **Verify data before debugging logic** — `GET /api/jobs` (`total`), profile
   fields, ingestion stats or DB counts. Do not assume the filter is wrong.
2. **One tracer bullet per fix** — queue ids, Redis, search filter, and UI
   refresh are separate; commit each slice; do not leave fixes uncommitted while
   iterating on the next symptom.
3. **Do not add poll loops to mask stale cache** — prefer existing SSE
   (`IngestionEventsProvider`) to invalidate TanStack Query keys when embed count
   rises or a run completes. Polling while ingest is active hammered Postgres.
4. **After API 500 on profile update** — DB may already be updated while the
   client cache is stale; explain that, do not only say "reload".
5. **Run `npm run check` before push** — matches CI (`check:quality` +
   `check:integration`); format check is not optional.

### Human workflow

1. **Reload during ingest is safe** — does not stop the run.
2. **Empty list after Require** — check skill chips on job cards; re-ingest or
   fix extraction if the skill never landed in `job_skills`.
3. **Truncating jobs** — expect an empty list until a new ingest finishes embed
   for at least one batch.

### References

- Search behaviour: `docs/SEARCH-AND-EMBEDDINGS.md`
- Must-have decision: `docs/adr/0006-must-have-hard-filter.md`
- Local/CI gates: `AGENTS.md` (Commands)
