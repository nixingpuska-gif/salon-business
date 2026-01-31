import Redis from "ioredis";

const DEFAULT_REDIS_URL = "redis://localhost:6380";
const DEFAULT_RATE_LIMIT_DB = 1;

const redisUrl = process.env.REDIS_URL || DEFAULT_REDIS_URL;
const rateLimitDb = Number.parseInt(
  process.env.REDIS_RATE_LIMIT_DB || String(DEFAULT_RATE_LIMIT_DB),
  10
);

function resolveDbFromUrl(url: string): number | undefined {
  try {
    const parsed = new URL(url);
    if (!parsed.pathname || parsed.pathname === "/") {
      return undefined;
    }

    const maybeDb = Number.parseInt(parsed.pathname.slice(1), 10);
    return Number.isFinite(maybeDb) ? maybeDb : undefined;
  } catch {
    return undefined;
  }
}

const urlDb = resolveDbFromUrl(redisUrl);

export const redis = new Redis(redisUrl, {
  db: Number.isFinite(urlDb ?? NaN) ? (urlDb as number) : rateLimitDb,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
});

if (process.env.NODE_ENV !== "test") {
  redis.on("error", (error) => {
    console.warn("[rate-limiting] Redis error", error);
  });
}
