import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const monorepoRoot = path.resolve(import.meta.dirname, "../..");

export default defineConfig(({ mode }) => {
  // Root `.env` (WEB_PORT, VITE_*) — bash `${WEB_PORT:-5173}` breaks on Windows cmd.
  const env = loadEnv(mode, monorepoRoot, "");
  const apiProxyTarget = env.VITE_API_BASE_URL ?? "http://localhost:3000";
  const port = Number(env.WEB_PORT ?? 5173);

  return {
    envDir: monorepoRoot,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    plugins: [
      tailwindcss(),
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      viteReact(),
    ],
    server: {
      port,
      proxy: {
        "/api/ingest/events": {
          target: apiProxyTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("Accept", "text/event-stream");
            });
            proxy.on("proxyRes", (proxyRes) => {
              proxyRes.headers["cache-control"] = "no-cache, no-transform";
              proxyRes.headers["content-type"] = "text/event-stream";
            });
          },
        },
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
