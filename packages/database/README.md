# @jobfinder/database

Drizzle schema, migrations, and DB client. Repository adapters live in
`apps/api/src/adapters/db/`, not here.

```bash
npm run db:generate   # from repo root — drizzle-kit generate
npm run db:migrate    # apply migrations via drizzle-orm/migrator
npm run db:seed       # canonical skills; upsert by name (a second run does not duplicate rows)
npm run db:studio     # Drizzle Studio
```

Scripts read `DATABASE_URL` from the environment. When a repo-root `.env` exists it is
loaded automatically; CI sets `DATABASE_URL` in the workflow instead.
