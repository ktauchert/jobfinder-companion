import type { IngestionEvent } from "@jobfinder/types";
import type { Redis } from "ioredis";

import type { EventPublisher } from "../../ports/event-publisher.js";

export const INGESTION_EVENTS_CHANNEL = "ingestion:events";

export function createRedisEventPublisher(
  redis: Redis,
  onPublish?: (event: IngestionEvent) => void,
): EventPublisher {
  return {
    async publish(event: IngestionEvent) {
      onPublish?.(event);
      await redis.publish(INGESTION_EVENTS_CHANNEL, JSON.stringify(event));
    },
  };
}
