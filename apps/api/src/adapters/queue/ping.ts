import { Redis } from "ioredis";

import { withTimeout } from "../lib/with-timeout.js";

export async function pingRedis(redisUrl: string, timeoutMs: number): Promise<boolean> {
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 0,
    enableOfflineQueue: false,
    connectTimeout: timeoutMs,
    lazyConnect: true,
  });
  try {
    await withTimeout(
      (async () => {
        await redis.connect();
        await redis.ping();
      })(),
      timeoutMs,
    );
    return true;
  } finally {
    redis.disconnect();
  }
}
