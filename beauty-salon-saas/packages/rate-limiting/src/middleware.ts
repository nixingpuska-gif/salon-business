import type { RateLimiterRes } from "rate-limiter-flexible";

export interface RateLimiterConsume {
  consume: (key: string, points?: number) => Promise<RateLimiterRes>;
}

export interface RateLimitMiddlewareOptions {
  limiter: RateLimiterConsume;
  key: string;
  points?: number;
}

export type RateLimitDecision =
  | {
      allowed: true;
      remainingPoints?: number;
      msBeforeNext?: number;
    }
  | {
      allowed: false;
      retryAfter: number;
      remainingPoints: number;
      msBeforeNext: number;
    };

export function isRateLimiterRes(error: unknown): error is RateLimiterRes {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as RateLimiterRes;
  return (
    typeof candidate.msBeforeNext === "number" &&
    typeof candidate.remainingPoints === "number"
  );
}

export async function rateLimitMiddleware(
  options: RateLimitMiddlewareOptions
): Promise<RateLimitDecision> {
  const { limiter, key, points = 1 } = options;

  try {
    const result = await limiter.consume(key, points);
    return {
      allowed: true,
      remainingPoints: result.remainingPoints,
      msBeforeNext: result.msBeforeNext,
    };
  } catch (error) {
    if (isRateLimiterRes(error)) {
      return {
        allowed: false,
        retryAfter: Math.ceil(error.msBeforeNext / 1000),
        remainingPoints: error.remainingPoints,
        msBeforeNext: error.msBeforeNext,
      };
    }

    throw error;
  }
}
