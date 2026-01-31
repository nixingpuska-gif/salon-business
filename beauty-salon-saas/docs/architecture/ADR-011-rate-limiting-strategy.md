# ADR-011: Rate Limiting Strategy (3-Level System)

**Статус**: ✅ Утверждено
**Дата**: 2026-01-22
**Автор**: Architect Agent
**Теги**: rate-limiting, anti-fraud, anti-spam, security, open-source

---

## Контекст

Платформа требует многоуровневую систему rate limiting для:
- **Anti-fraud** (F-022): Защита от злоупотреблений (массовые записи, spam)
- **Anti-spam** (F-055): Защита клиентов от спама (marketing messages)
- **API Protection**: Защита API от DDoS и злоупотреблений
- **Channel Limits**: Соблюдение API limits мессенджеров (Telegram 30 msg/s, WhatsApp 20 msg/s)

**Требования**:
- **Level 1**: Client-level limits (anti-fraud для записей, anti-spam для marketing)
- **Level 2**: Tenant-level limits (daily message quotas)
- **Level 3**: Channel-level limits (API rate limits провайдеров)
- Distributed rate limiting (Redis-based)
- Flexible configuration per tenant
- Graceful degradation (не блокировать critical operations)

**Функции**: F-022, F-055, F-056 (Anti-fraud, Anti-spam, Quiet hours)

---

## Решение

**Использовать rate-limiter-flexible** - comprehensive rate limiting library with Redis support.

**GitHub**: https://github.com/animir/node-rate-limiter-flexible
**Stars**: 3,000+
**License**: MIT

---

## Обоснование

### Почему rate-limiter-flexible?

#### ✅ Преимущества:

1. **Multiple Backends**:
   - Redis (distributed)
   - In-memory (fast, single instance)
   - MongoDB, PostgreSQL (persistent)

2. **Flexible Strategies**:
   - Fixed window
   - Sliding window (more accurate)
   - Token bucket
   - Leaky bucket

3. **Features**:
   - Points system (consume multiple points)
   - Block duration
   - Penalty points
   - Exponential backoff
   - Group limits

4. **Performance**:
   - Proven: handles 10k+ req/s
   - Low latency (<1ms with Redis)
   - Minimal overhead

5. **Developer Experience**:
   - Simple API
   - TypeScript support
   - Good documentation

#### 📊 Metrics:
- **Open-source reuse**: ~70%
- **Custom code**: ~30% (business logic, tenant config)
- **Time savings**: 2 недели → 2 дня

---

## Альтернативы

### Вариант 1: express-rate-limit
**Статус**: ❌ Отклонён

**Минусы**:
- ❌ Express-only (не работает с Next.js App Router)
- ❌ Less flexible (no points system)
- ❌ Worse Redis support

**Вердикт**: rate-limiter-flexible более гибкий.

---

### Вариант 2: Custom Redis Lua Script
**Статус**: ❌ Отклонён

**Минусы**:
- ❌ 2+ недели разработки
- ❌ Нужно писать тесты
- ❌ Maintenance burden

**Вердикт**: rate-limiter-flexible уже проверен в production.

---

## Архитектура: 3-Level Rate Limiting

```
┌─────────────────────────────────────────────────┐
│           Level 1: Client Limits                │
│  - Booking: 10 appointments/hour (anti-fraud)   │
│  - Marketing: 1 message per 3 days (anti-spam)  │
└────────────┬────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────┐
│           Level 2: Tenant Limits                │
│  - TX messages: 3000/day                        │
│  - MK messages: 1500/day                        │
│  - API calls: 10,000/hour                       │
└────────────┬────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────┐
│         Level 3: Channel Limits                 │
│  - Telegram: 30 msg/s (global)                  │
│  - WhatsApp: 20 msg/s (global)                  │
│  - MAX: 30 RPS (global)                         │
└─────────────────────────────────────────────────┘
```

---

## Реализация

### 1. Installation

```bash
npm install rate-limiter-flexible
```

### 2. Redis Configuration

```typescript
// packages/rate-limiting/src/redis.ts
import Redis from 'ioredis'

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 1, // Use separate DB for rate limiting
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
})
```

### 3. Level 1: Client Limits

```typescript
// packages/rate-limiting/src/client-limiters.ts
import { RateLimiterRedis } from 'rate-limiter-flexible'
import { redis } from './redis'

/**
 * Anti-fraud: Prevent mass bookings
 * Limit: 10 appointments per hour
 */
export const clientBookingLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:client:booking',
  points: 10, // Max 10 appointments
  duration: 3600, // Per hour
  blockDuration: 3600, // Block for 1 hour if exceeded
})

/**
 * Anti-spam: Marketing messages
 * Limit: 1 message per 3 days
 */
export const clientMarketingLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:client:marketing',
  points: 1, // Max 1 message
  duration: 259200, // Per 3 days (72 hours)
  blockDuration: 0, // Don't block, just skip
})

/**
 * Review requests: 1 per visit
 * Limit: 1 request per 7 days per client
 */
export const clientReviewLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:client:review',
  points: 1,
  duration: 604800, // 7 days
})
```

### 4. Level 2: Tenant Limits

```typescript
// packages/rate-limiting/src/tenant-limiters.ts
import { RateLimiterRedis } from 'rate-limiter-flexible'
import { redis } from './redis'

/**
 * Transactional messages (high priority)
 * Limit: 3000 per day per tenant
 */
export const tenantTxLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:tenant:tx',
  points: 3000,
  duration: 86400, // 24 hours
})

/**
 * Marketing messages (low priority)
 * Limit: 1500 per day per tenant
 */
export const tenantMkLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:tenant:mk',
  points: 1500,
  duration: 86400, // 24 hours
})

/**
 * API calls
 * Limit: 10,000 per hour per tenant
 */
export const tenantApiLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:tenant:api',
  points: 10000,
  duration: 3600, // 1 hour
  blockDuration: 600, // Block for 10 minutes if exceeded
})
```

### 5. Level 3: Channel Limits

```typescript
// packages/rate-limiting/src/channel-limiters.ts
import { RateLimiterRedis } from 'rate-limiter-flexible'
import { redis } from './redis'

/**
 * Telegram Bot API
 * Limit: 30 messages per second (global)
 */
export const telegramChannelLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:channel:telegram',
  points: 30,
  duration: 1, // Per second
})

/**
 * WhatsApp Business API
 * Limit: 20 messages per second (global)
 */
export const whatsappChannelLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:channel:whatsapp',
  points: 20,
  duration: 1,
})

/**
 * MAX Messenger API
 * Limit: 30 RPS (requests per second)
 */
export const maxChannelLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:channel:max',
  points: 30,
  duration: 1,
})

/**
 * Instagram Messaging API
 * Limit: 25 messages per second
 */
export const instagramChannelLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:channel:instagram',
  points: 25,
  duration: 1,
})

/**
 * VK Bots API
 * Limit: 20 messages per second
 */
export const vkChannelLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:channel:vk',
  points: 20,
  duration: 1,
})

// Map для удобства
export const channelLimiters = {
  telegram: telegramChannelLimiter,
  whatsapp: whatsappChannelLimiter,
  max: maxChannelLimiter,
  instagram: instagramChannelLimiter,
  vk: vkChannelLimiter,
}
```

### 6. Middleware для API Routes

```typescript
// packages/rate-limiting/src/middleware.ts
import { RateLimiterRes } from 'rate-limiter-flexible'
import { tenantApiLimiter } from './tenant-limiters'
import type { NextRequest, NextResponse } from 'next/server'

export async function rateLimitMiddleware(
  request: NextRequest,
  tenantId: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    await tenantApiLimiter.consume(tenantId, 1)
    return { allowed: true }
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      return {
        allowed: false,
        retryAfter: Math.ceil(error.msBeforeNext / 1000),
      }
    }
    throw error
  }
}

// Usage in API route
export async function GET(request: NextRequest) {
  const tenant = await getCurrentTenant(request)
  const rateLimit = await rateLimitMiddleware(request, tenant.id)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: rateLimit.retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': rateLimit.retryAfter!.toString(),
          'X-RateLimit-Limit': '10000',
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  // Process request
  return NextResponse.json({ data: '...' })
}
```

### 7. Usage в Notification Service

```typescript
// packages/notifications/src/rate-limited-service.ts
import {
  clientMarketingLimiter,
  tenantTxLimiter,
  tenantMkLimiter,
  channelLimiters,
} from '@beauty-salon/rate-limiting'

export class RateLimitedNotificationService {
  async sendNotification(
    tenantId: string,
    clientId: string,
    channel: string,
    message: string,
    type: 'tx' | 'mk'
  ) {
    try {
      // Level 1: Check client limit (only for marketing)
      if (type === 'mk') {
        await clientMarketingLimiter.consume(clientId, 1)
      }

      // Level 2: Check tenant limit
      const tenantLimiter = type === 'tx' ? tenantTxLimiter : tenantMkLimiter
      await tenantLimiter.consume(tenantId, 1)

      // Level 3: Check channel limit
      const channelLimiter = channelLimiters[channel as keyof typeof channelLimiters]
      if (channelLimiter) {
        await channelLimiter.consume('global', 1)
      }

      // All checks passed, send message
      await this.sendMessage(channel, clientId, message)

      return { success: true }
    } catch (error) {
      if (error instanceof RateLimiterRes) {
        console.warn(`Rate limit exceeded: ${error.remainingPoints}`)

        // Queue for later (BullMQ with delay)
        await notificationQueue.add(
          'delayed-notification',
          { tenantId, clientId, channel, message, type },
          {
            delay: error.msBeforeNext,
          }
        )

        return { success: false, retryAfter: error.msBeforeNext }
      }
      throw error
    }
  }
}
```

### 8. Anti-Fraud для Bookings

```typescript
// apps/booking-api/controllers/appointment-controller.ts
import { clientBookingLimiter } from '@beauty-salon/rate-limiting'

export async function createAppointment(req: Request, res: Response) {
  const { clientId } = req.body

  try {
    // Check rate limit
    await clientBookingLimiter.consume(clientId, 1)

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: req.body,
    })

    return res.json({ appointment })
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      return res.status(429).json({
        error: 'Too many bookings. Please try again later.',
        retryAfter: Math.ceil(error.msBeforeNext / 1000),
        remainingPoints: error.remainingPoints,
      })
    }
    throw error
  }
}
```

---

## Database Configuration (Tenant Overrides)

```prisma
// packages/database/prisma/schema.prisma

model TenantRateLimitConfig {
  id       String @id @default(uuid())
  tenantId String @unique @map("tenant_id")

  // Client-level overrides
  clientBookingLimit      Int @default(10) @map("client_booking_limit")
  clientBookingDuration   Int @default(3600) @map("client_booking_duration")
  clientMarketingLimit    Int @default(1) @map("client_marketing_limit")
  clientMarketingDuration Int @default(259200) @map("client_marketing_duration")

  // Tenant-level overrides
  tenantTxLimit Int @default(3000) @map("tenant_tx_limit")
  tenantMkLimit Int @default(1500) @map("tenant_mk_limit")

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@map("tenant_rate_limit_configs")
}

model Tenant {
  // ... existing fields
  rateLimitConfig TenantRateLimitConfig?
}
```

### Dynamic Configuration

```typescript
// Load tenant-specific limits
export async function getTenantLimiters(tenantId: string) {
  const config = await prisma.tenantRateLimitConfig.findUnique({
    where: { tenantId },
  })

  if (!config) {
    // Use defaults
    return {
      txLimiter: tenantTxLimiter,
      mkLimiter: tenantMkLimiter,
    }
  }

  // Create custom limiters
  return {
    txLimiter: new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `rl:tenant:${tenantId}:tx`,
      points: config.tenantTxLimit,
      duration: 86400,
    }),
    mkLimiter: new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `rl:tenant:${tenantId}:mk`,
      points: config.tenantMkLimit,
      duration: 86400,
    }),
  }
}
```

---

## Quiet Hours (F-056)

```typescript
// packages/rate-limiting/src/quiet-hours.ts
import { prisma } from '@beauty-salon/database'

export interface QuietHoursConfig {
  enabled: boolean
  startHour: number // 22 (10 PM)
  endHour: number // 9 (9 AM)
  timezone: string
}

export async function isQuietHours(
  tenantId: string
): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      quietHoursEnabled: true,
      quietHoursStart: true,
      quietHoursEnd: true,
      timezone: true,
    },
  })

  if (!tenant?.quietHoursEnabled) {
    return false
  }

  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tenant.timezone,
    hour: 'numeric',
    hour12: false,
  })

  const currentHour = parseInt(formatter.format(now))

  // Check if current hour is within quiet hours
  const start = tenant.quietHoursStart || 22
  const end = tenant.quietHoursEnd || 9

  if (start < end) {
    // Same day (e.g., 1 AM - 6 AM)
    return currentHour >= start && currentHour < end
  } else {
    // Crosses midnight (e.g., 10 PM - 9 AM)
    return currentHour >= start || currentHour < end
  }
}

// Usage
export async function canSendMarketingMessage(
  tenantId: string,
  clientId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Check quiet hours first
  if (await isQuietHours(tenantId)) {
    return { allowed: false, reason: 'quiet_hours' }
  }

  // Check rate limit
  try {
    await clientMarketingLimiter.consume(clientId, 1)
    return { allowed: true }
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      return { allowed: false, reason: 'rate_limit_exceeded' }
    }
    throw error
  }
}
```

---

## Monitoring

```typescript
// Get rate limit stats
export async function getRateLimitStats(tenantId: string) {
  const txKey = `rl:tenant:tx:${tenantId}`
  const mkKey = `rl:tenant:mk:${tenantId}`

  const [txRemaining, mkRemaining] = await Promise.all([
    redis.get(txKey),
    redis.get(mkKey),
  ])

  return {
    tx: {
      limit: 3000,
      used: txRemaining ? 3000 - parseInt(txRemaining) : 0,
      remaining: txRemaining ? parseInt(txRemaining) : 3000,
    },
    mk: {
      limit: 1500,
      used: mkRemaining ? 1500 - parseInt(mkRemaining) : 0,
      remaining: mkRemaining ? parseInt(mkRemaining) : 1500,
    },
  }
}

// Grafana metrics
export async function exportMetrics() {
  const tenants = await prisma.tenant.findMany()

  for (const tenant of tenants) {
    const stats = await getRateLimitStats(tenant.id)

    // Push to Prometheus
    rateLimitGauge.set(
      { tenant_id: tenant.id, type: 'tx' },
      stats.tx.remaining
    )
    rateLimitGauge.set(
      { tenant_id: tenant.id, type: 'mk' },
      stats.mk.remaining
    )
  }
}
```

---

## Testing

```typescript
describe('Rate Limiting', () => {
  beforeEach(async () => {
    // Clear Redis before each test
    await redis.flushdb()
  })

  it('should allow 10 bookings per hour', async () => {
    const clientId = 'test-client'

    // First 10 bookings should succeed
    for (let i = 0; i < 10; i++) {
      await expect(
        clientBookingLimiter.consume(clientId, 1)
      ).resolves.not.toThrow()
    }

    // 11th booking should fail
    await expect(
      clientBookingLimiter.consume(clientId, 1)
    ).rejects.toThrow()
  })

  it('should allow 1 marketing message per 3 days', async () => {
    const clientId = 'test-client'

    // First message succeeds
    await clientMarketingLimiter.consume(clientId, 1)

    // Second message immediately should fail
    await expect(
      clientMarketingLimiter.consume(clientId, 1)
    ).rejects.toThrow()
  })

  it('should respect tenant TX limit', async () => {
    const tenantId = 'test-tenant'

    // Consume 3000 points
    await tenantTxLimiter.consume(tenantId, 3000)

    // Next one should fail
    await expect(
      tenantTxLimiter.consume(tenantId, 1)
    ).rejects.toThrow()
  })

  it('should enforce quiet hours', async () => {
    // Mock current time to 11 PM (quiet hours)
    jest.useFakeTimers().setSystemTime(new Date('2026-01-22T23:00:00Z'))

    const inQuietHours = await isQuietHours('test-tenant')
    expect(inQuietHours).toBe(true)
  })
})
```

---

## Performance

```yaml
Benchmarks (Redis):
  - Single consume(): <1ms
  - 10k consumes/second: <5ms p99
  - Memory: ~1KB per client

Redis Memory Estimation:
  - 10,000 tenants
  - 100,000 clients
  - ~100MB total (very low)
```

---

## Success Criteria

✅ Client booking limit enforced (anti-fraud)
✅ Marketing spam prevented (1 per 3 days)
✅ Tenant quotas respected (3000 TX, 1500 MK)
✅ Channel limits not exceeded
✅ Quiet hours respected
✅ API rate limiting works (10k/hour)
✅ Graceful degradation (queue delayed messages)

---

## Заключение

rate-limiter-flexible + Custom business logic предоставляет **70% reuse**, экономя **2 недели разработки**.

**Вердикт**: ✅ Утверждено. Интеграция в Week 1 (Priority: High, 2 days).

---

**Следующие шаги**:
1. Setup Redis connection
2. Implement 3 levels of limiters
3. Add middleware для API routes
4. Test с real traffic patterns
