import { Redis } from "ioredis";

/** BullMQ requires `maxRetriesPerRequest: null` on ioredis. */
export function createRedisConnection(redisUrl: string): Redis {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });
}
