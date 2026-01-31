# Rate Limiting Package

Three-level rate limiting utilities backed by Redis and `rate-limiter-flexible`.

## Usage

```ts
import {
  clientBookingLimiter,
  tenantTxLimiter,
  channelLimiters,
  rateLimitMiddleware,
} from "@beauty-salon/rate-limiting";

await clientBookingLimiter.consume("client-123", 1);
await tenantTxLimiter.consume("tenant-abc", 1);
await channelLimiters.telegram.consume("global", 1);

const result = await rateLimitMiddleware({
  limiter: tenantTxLimiter,
  key: "tenant-abc",
});
```

## Environment

- `REDIS_URL` (default: `redis://localhost:6380`)
- `REDIS_RATE_LIMIT_DB` (default: `1`)

