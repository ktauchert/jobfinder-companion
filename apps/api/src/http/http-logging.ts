import type { IncomingMessage, ServerResponse } from "node:http";
import type { Logger } from "pino";
import { pinoHttp, type Options } from "pino-http";

/** Poll/SSE routes that would flood the dev console every few seconds. */
const QUIET_PATHS = new Set(["/api/health", "/api/ingest/status", "/api/ingest/events"]);

export function requestPath(url: string | undefined): string {
  if (!url) {
    return "";
  }
  const path = url.split("?")[0] ?? url;
  return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
}

export function shouldQuietHttpLog(url: string | undefined): boolean {
  return QUIET_PATHS.has(requestPath(url));
}

export function createHttpLogger(logger: Logger) {
  const options: Options = {
    logger,
    autoLogging: {
      ignore: (req: IncomingMessage) => shouldQuietHttpLog(req.url),
    },
    serializers: {
      req: (req: IncomingMessage) => ({
        method: req.method,
        path: requestPath(req.url),
      }),
      res: (res: ServerResponse) => ({
        statusCode: res.statusCode,
      }),
    },
    customSuccessMessage: (req, res, responseTime) =>
      `${req.method} ${requestPath(req.url)} ${res.statusCode} ${responseTime}ms`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${requestPath(req.url)} ${res.statusCode} ${err.message}`,
  };

  return pinoHttp(options);
}
