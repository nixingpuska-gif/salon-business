import assert from "node:assert/strict";
import test, { after } from "node:test";

process.env.NODE_ENV = "test";

import {
  clientBookingLimiter,
  tenantTxLimiter,
  telegramChannelLimiter,
  rateLimitMiddleware,
  redis,
} from "../src";

const uniqueId = `test-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const clientKey = `${uniqueId}-client`;
const tenantKey = `${uniqueId}-tenant`;
const channelKey = `${uniqueId}-channel`;

const keysToCleanup = [
  `rl:client:booking:${clientKey}`,
  `rl:tenant:tx:${tenantKey}`,
  `rl:tenant:tx:${tenantKey}-mw`,
  `rl:channel:telegram:${channelKey}`,
];

after(async () => {
  await redis.del(keysToCleanup);
  await redis.quit();
});

test("client booking limiter allows 10 per hour", async () => {
  for (let i = 0; i < 10; i += 1) {
    await assert.doesNotReject(async () => {
      await clientBookingLimiter.consume(clientKey, 1);
    });
  }

  await assert.rejects(async () => {
    await clientBookingLimiter.consume(clientKey, 1);
  });
});

test("tenant tx limiter caps at 3000 per day", async () => {
  await assert.doesNotReject(async () => {
    await tenantTxLimiter.consume(tenantKey, 3000);
  });

  await assert.rejects(async () => {
    await tenantTxLimiter.consume(tenantKey, 1);
  });
});

test("channel limiter caps at 30 per second", async () => {
  await assert.doesNotReject(async () => {
    await telegramChannelLimiter.consume(channelKey, 30);
  });

  await assert.rejects(async () => {
    await telegramChannelLimiter.consume(channelKey, 1);
  });
});

test("rateLimitMiddleware returns retryAfter on rejection", async () => {
  await tenantTxLimiter.consume(`${tenantKey}-mw`, 3000);

  const result = await rateLimitMiddleware({
    limiter: tenantTxLimiter,
    key: `${tenantKey}-mw`,
  });

  assert.equal(result.allowed, false);
  if (!result.allowed) {
    assert.ok(result.retryAfter >= 0);
    assert.ok(result.msBeforeNext >= 0);
  }
});
