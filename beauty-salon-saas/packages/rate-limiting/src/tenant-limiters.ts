import { RateLimiterRedis } from "rate-limiter-flexible";
import { redis } from "./redis";

/**
 * Transactional messages (high priority).
 * Limit: 3000 per day per tenant.
 */
export const tenantTxLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:tenant:tx",
  points: 3000,
  duration: 60 * 60 * 24,
});

/**
 * Marketing messages (low priority).
 * Limit: 1500 per day per tenant.
 */
export const tenantMkLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:tenant:mk",
  points: 1500,
  duration: 60 * 60 * 24,
});

/**
 * API calls.
 * Limit: 10,000 per hour per tenant.
 */
export const tenantApiLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:tenant:api",
  points: 10000,
  duration: 60 * 60,
  blockDuration: 60 * 10,
});
