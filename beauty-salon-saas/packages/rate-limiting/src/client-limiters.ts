import { RateLimiterRedis } from "rate-limiter-flexible";
import { redis } from "./redis";

/**
 * Anti-fraud: prevent mass bookings.
 * Limit: 10 appointments per hour per client.
 */
export const clientBookingLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:client:booking",
  points: 10,
  duration: 60 * 60,
  blockDuration: 60 * 60,
});

/**
 * Anti-spam: marketing messages.
 * Limit: 1 message per 3 days per client.
 */
export const clientMarketingLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:client:marketing",
  points: 1,
  duration: 60 * 60 * 72,
  blockDuration: 0,
});

/**
 * Review requests: 1 per 7 days per client.
 */
export const clientReviewLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:client:review",
  points: 1,
  duration: 60 * 60 * 24 * 7,
});
