import { describe, expect, it } from "vitest";

import { createRedisConnection, createRedisSubscriber } from "./connection.js";

describe("createRedisSubscriber", () => {
  it("disables ready check so INFO is not sent in subscribe mode", () => {
    const parent = createRedisConnection("redis://127.0.0.1:6379");
    const subscriber = createRedisSubscriber(parent);
    expect(subscriber.options.enableReadyCheck).toBe(false);
    parent.disconnect();
    subscriber.disconnect();
  });
});
