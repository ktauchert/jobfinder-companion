# @jobfinder/web

React SPA scaffolded with the official TanStack Router + Vite CLI
(`npx @tanstack/cli create --router-only`), then adapted for the monorepo.

Layout: Header / Main / Footer. No sidebar.

```bash
npm run dev -w @jobfinder/web   # http://localhost:5173
```

Vite proxies `/api` to `VITE_API_BASE_URL` (default `http://localhost:3000`).
