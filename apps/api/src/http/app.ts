import cors from "cors";
import express from "express";
import type { IncomingMessage } from "node:http";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";

import type { GetHealthDeps } from "../application/get-health.js";
import type { Env } from "../env.js";
import { createErrorHandler } from "./error-handler.js";
import { createHealthRouter } from "./routes/health.js";

export interface CreateAppOptions {
  env: Env;
  logger: Logger;
  health: GetHealthDeps;
}

export function createApp(options: CreateAppOptions) {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin: options.env.CORS_ORIGIN,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(
    pinoHttp({
      logger: options.logger,
      autoLogging: {
        ignore: (req: IncomingMessage) => req.url === "/api/health",
      },
    }),
  );

  app.use("/api", createHealthRouter(options.health));

  app.use(createErrorHandler(options.logger));

  return app;
}
