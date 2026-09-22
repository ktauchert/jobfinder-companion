import { Redis } from "ioredis";

/** BullMQ requires `maxRetriesPerRequest: null` on ioredis. */
export function createRedisConnection(redisUrl: string): Redis {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });
}

/** Pub/sub connections must not run ioredis ready checks (`INFO`) while subscribed. */
export function createRedisSubscriber(parent: Redis): Redis {
  return parent.duplicate({
    enableReadyCheck: false,
  });
}
