import type { Response } from "express";
import type { IngestionEvent } from "@jobfinder/types";
import type { Redis } from "ioredis";

import type { RunEventCache } from "../adapters/events/run-event-cache.js";
import { INGESTION_EVENTS_CHANNEL } from "../adapters/events/redis-event-publisher.js";
import { createRedisSubscriber } from "../adapters/queue/connection.js";
import type { GetIngestionStatusDeps } from "../application/get-ingestion-status.js";
import { getIngestionStatus } from "../application/get-ingestion-status.js";

const HEARTBEAT_MS = 15_000;
const MAX_CONNECTIONS = 32;

let openConnections = 0;

export interface IngestSseDeps extends GetIngestionStatusDeps {
  redis: Redis;
  eventCache: RunEventCache;
}

export function handleIngestEvents(deps: IngestSseDeps, res: Response): void {
  if (openConnections >= MAX_CONNECTIONS) {
    res.status(503).json({ error: { code: "too_many_connections", message: "SSE limit reached" } });
    return;
  }

  openConnections += 1;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
  res.write(": connected\n\n");

  const subscriber = createRedisSubscriber(deps.redis);
  subscriber.on("error", () => {
    // Non-fatal: ioredis reconnect quirks on pub/sub; client cleans up on close.
  });
  let closed = false;

  const heartbeat = setInterval(() => {
    writeEvent(res, { type: "heartbeat", at: new Date().toISOString() });
  }, HEARTBEAT_MS);

  void (async () => {
    try {
      const status = await getIngestionStatus(deps);
      if (status.active) {
        const cached = deps.eventCache.getLast(status.active.id);
        if (cached) {
          writeEvent(res, cached);
        }
      }

      await subscriber.subscribe(INGESTION_EVENTS_CHANNEL);
      subscriber.on("message", (_channel, message) => {
        if (closed) {
          return;
        }
        try {
          const event = JSON.parse(message) as IngestionEvent;
          writeEvent(res, event);
        } catch {
          // ignore malformed messages
        }
      });
    } catch {
      cleanup();
    }
  })();

  res.on("close", cleanup);
  res.on("error", cleanup);
  res.req.on("close", cleanup);

  function cleanup() {
    if (closed) {
      return;
    }
    closed = true;
    openConnections = Math.max(0, openConnections - 1);
    clearInterval(heartbeat);
    void subscriber.unsubscribe(INGESTION_EVENTS_CHANNEL);
    void subscriber.quit();
  }
}

function writeEvent(res: Response, event: IngestionEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}
