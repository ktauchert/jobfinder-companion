import type { Redis } from "ioredis";

/** Token bucket: 1 token per `intervalMs`, shared via Redis when provided. */
export function createRateLimiter(options: {
  key: string;
  intervalMs: number;
  redis?: Redis;
}): { acquire(): Promise<void> } {
  if (!options.redis) {
    let lastAt = 0;
    return {
      async acquire(): Promise<void> {
        const now = Date.now();
        const wait = Math.max(0, options.intervalMs - (now - lastAt));
        if (wait > 0) {
          await sleep(wait);
        }
        lastAt = Date.now();
      },
    };
  }

  const redis = options.redis;
  return {
    async acquire(): Promise<void> {
      const key = `ratelimit:${options.key}`;
      // SET NX with TTL implements a simple 1 req / interval gate.
      while (true) {
        const acquired = await redis.set(key, "1", "PX", options.intervalMs, "NX");
        if (acquired === "OK") {
          return;
        }
        await sleep(50);
      }
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
