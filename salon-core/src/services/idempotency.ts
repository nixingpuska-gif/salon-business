import { getRedis } from "./redis.js";

type RedisLike = {
  set: (key: string, value: string, mode: "EX", ttlSeconds: number, flag: "NX") => Promise<string | null>;
};

export const createIdempotency = (getRedisFn: () => RedisLike) => ({
  async checkAndSet(key: string, ttlSeconds: number) {
    const redis = getRedisFn();
    const result = await redis.set(key, "1", "EX", ttlSeconds, "NX");
    return result === "OK";
  },
});

export const idempotency = createIdempotency(getRedis);
