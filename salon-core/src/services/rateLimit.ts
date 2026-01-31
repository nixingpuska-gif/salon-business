import { getRedis } from "./redis.js";

export type RateLimitInput = {
  key: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
};

export const rateLimit = {
  async consume({ key, limit, windowSeconds }: RateLimitInput): Promise<RateLimitResult> {
    const redis = getRedis();
    const now = Math.floor(Date.now() / 1000);
    const window = Math.floor(now / windowSeconds);
    const redisKey = `rl:${key}:${window}`;

    const current = await redis.incr(redisKey);
    if (current === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    const allowed = current <= limit;
    return {
      allowed,
      remaining: Math.max(0, limit - current),
      resetInSeconds: windowSeconds - (now % windowSeconds),
    };
  },
};
