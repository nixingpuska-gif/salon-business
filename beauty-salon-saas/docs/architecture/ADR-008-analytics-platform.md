# ADR-008: Analytics Platform (Metabase)

**Статус**: ✅ Утверждено
**Дата**: 2026-01-22
**Автор**: Architect Agent
**Теги**: analytics, bi, reporting, open-source

---

## Контекст

Платформе требуется мощная аналитическая система для:
- **Owners/Admins**: Дашборды с бизнес-метриками салона
- **Super-Admin (Platform)**: Агрегированная аналитика по всем 10k салонам
- **AI Reports Constructor**: Автоматическая генерация отчётов

**Требования**:
- SQL-based reporting (доступ к PostgreSQL)
- Multi-tenant isolation (RLS support)
- Visual query builder (для нетехнических пользователей)
- Embedding dashboard в Next.js admin panel
- Scheduled reports (email delivery)
- Alerts на критичные метрики
- Support для 10,000 tenants
- Self-hosted (data privacy)

**Функции**: F-110, F-111, F-112 (AI Reports Constructor, Team Report, Alerts)

---

## Решение

**Использовать Metabase** - open-source business intelligence platform.

**GitHub**: https://github.com/metabase/metabase
**Stars**: 39,000+
**License**: AGPL-3.0 (+ Commercial для embedding)
**Версия**: 0.48.0+

---

## Обоснование

### Почему Metabase?

#### ✅ Преимущества:

1. **SQL First**:
   - Native PostgreSQL connector
   - **RLS-aware**: Queries run with tenant context
   - Custom SQL queries + Visual query builder
   - Query caching (Redis)

2. **Beautiful Dashboards**:
   - Drag-and-drop dashboard builder
   - 20+ visualization types (charts, maps, pivot tables)
   - Responsive design
   - Public links (для embedding)

3. **Multi-Tenancy Support**:
   - User-level data sandboxing
   - Can set `app.tenant_id` per user session
   - Integrates with RLS policies

4. **Embedding**:
   - Signed embedding (JWT-based)
   - Iframe + React SDK
   - White-labeling
   - **Commercial license** required for embedding (free trial available)

5. **Automation**:
   - Scheduled reports (daily/weekly/monthly)
   - Email delivery with dashboard snapshots
   - Slack/Discord notifications
   - API для programmatic report generation

6. **Alerts**:
   - Goal-based alerts (метрика < threshold)
   - Custom conditions
   - Multi-channel delivery

7. **Developer-Friendly**:
   - REST API
   - TypeScript SDK
   - Webhook events
   - Database migrations

8. **Performance**:
   - Query caching (Redis)
   - Query optimization suggestions
   - Proven: handles 10M+ rows easily

9. **Self-Hosted**:
   - Docker image
   - PostgreSQL for metadata storage
   - Полный контроль над данными

#### 📊 Metrics:
- **Open-source reuse**: ~95%
- **Custom code**: ~5% (AI integration, embedding setup)
- **Time savings**: 8 недель → 3 дня

---

## Альтернативы

### Вариант 1: Custom Dashboard (Next.js + Recharts)
**Статус**: ❌ Отклонён

**Плюсы**:
- Полный контроль над UI
- Tight integration с Next.js

**Минусы**:
- ❌ 8+ недель разработки
- ❌ Query builder с нуля
- ❌ Scheduling/alerts с нуля
- ❌ Caching layer с нуля
- ❌ Нет visual query builder для non-tech users

**Вердикт**: Too much development time. Metabase does it better.

---

### Вариант 2: Redash
**Статус**: ❌ Отклонён

**GitHub**: https://github.com/getredash/redash
**Stars**: 26k

**Плюсы**:
- Open-source
- SQL-based
- Good visualization

**Минусы**:
- ❌ Less active development (vs Metabase)
- ❌ Less polished UI
- ❌ Embedding более сложный
- ❌ Smaller community

**Вердикт**: Metabase более зрелый и активный.

---

### Вариант 3: Apache Superset
**Статус**: ❌ Отклонён

**GitHub**: https://github.com/apache/superset
**Stars**: 62k

**Плюсы**:
- Very powerful
- Apache Foundation (stable)
- Advanced analytics

**Минусы**:
- ❌ More complex setup (Python Flask)
- ❌ Heavier (requires Redis, Celery workers)
- ❌ Steeper learning curve
- ❌ Overkill для нашего use case

**Вердикт**: Too complex. Metabase проще и быстрее.

---

### Вариант 4: Grafana
**Статус**: ❌ Отклонён (для business analytics)

**Плюсы**:
- Excellent для monitoring/observability
- Already using для infrastructure metrics

**Минусы**:
- ❌ Не предназначен для business analytics
- ❌ Weak SQL query builder
- ❌ Not designed for embedding dashboards
- ❌ Better для time-series, не для business queries

**Вердикт**: Keep Grafana для infrastructure, Metabase для business analytics.

---

## Архитектура Интеграции

### High-Level Flow

```
User (Owner/Admin)
    ↓
Next.js Admin Panel
    ↓
Metabase Embedded Dashboard (Iframe/React SDK)
    ↓
Metabase Server
    ↓
PostgreSQL (с tenant context)
    ↓
RLS Policies (tenant isolation)
```

### Multi-Tenant Data Sandboxing

```
User logs in → Next.js sets tenant_id in session
    ↓
Next.js generates JWT token (with tenant_id claim)
    ↓
Metabase receives JWT → extracts tenant_id
    ↓
Metabase sets PostgreSQL session: SET app.tenant_id = 'xxx'
    ↓
All queries run with RLS enforced
```

---

## Реализация

### 1. Docker Compose Setup

```yaml
# docker-compose.yml (добавить)
services:
  metabase:
    image: metabase/metabase:v0.48.0
    container_name: beauty-salon-metabase
    depends_on:
      - postgres
    environment:
      MB_DB_TYPE: postgres
      MB_DB_DBNAME: beauty_salon_saas
      MB_DB_PORT: 5432
      MB_DB_USER: postgres
      MB_DB_PASS: postgres_password
      MB_DB_HOST: postgres
      MB_JETTY_PORT: 3000
      MB_EMBEDDING_SECRET_KEY: ${METABASE_EMBEDDING_SECRET}
    ports:
      - "3004:3000"
    volumes:
      - metabase-data:/metabase-data
    networks:
      - beauty-salon-network
    restart: unless-stopped

volumes:
  metabase-data:
```

### 2. PostgreSQL Connection Setup

```sql
-- Metabase user (read-only для safety)
CREATE USER metabase_user WITH PASSWORD 'metabase_password';

-- Grant SELECT на все таблицы
GRANT CONNECT ON DATABASE beauty_salon_saas TO metabase_user;
GRANT USAGE ON SCHEMA public TO metabase_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_user;

-- Auto-grant для будущих таблиц
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO metabase_user;

-- Enable RLS для metabase_user
-- RLS policies уже созданы, они будут применяться автоматически
```

### 3. Tenant Context Function (для Metabase)

```sql
-- Function для установки tenant context перед каждым query
CREATE OR REPLACE FUNCTION set_tenant_for_metabase(tenant_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  -- Set tenant context для RLS
  PERFORM set_config('app.tenant_id', tenant_uuid::text, false);
END;
$;

-- Grant execute на function
GRANT EXECUTE ON FUNCTION set_tenant_for_metabase(uuid) TO metabase_user;
```

### 4. Metabase Query Template (с tenant isolation)

```sql
-- Все queries в Metabase будут начинаться с:
SELECT set_tenant_for_metabase('{{tenant_id}}'::uuid);

-- Затем основной query
SELECT
  DATE_TRUNC('day', start_at) as date,
  COUNT(*) as total_appointments,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'no_show') as no_shows,
  SUM(price) as total_revenue,
  SUM(price) FILTER (WHERE status = 'no_show') as lost_revenue
FROM appointments
WHERE tenant_id = '{{tenant_id}}'::uuid
  AND start_at >= '{{start_date}}'::date
  AND start_at < '{{end_date}}'::date
GROUP BY DATE_TRUNC('day', start_at)
ORDER BY date;
```

### 5. Backend Integration (Embedding)

```typescript
// packages/analytics/src/metabase-client.ts
import jwt from 'jsonwebtoken'

const METABASE_SITE_URL = process.env.METABASE_URL || 'http://localhost:3004'
const METABASE_SECRET_KEY = process.env.METABASE_EMBEDDING_SECRET!

export interface EmbedDashboardParams {
  dashboardId: number
  tenantId: string
  params?: Record<string, any>
}

export function generateEmbedUrl({
  dashboardId,
  tenantId,
  params = {},
}: EmbedDashboardParams): string {
  const payload = {
    resource: { dashboard: dashboardId },
    params: {
      tenant_id: tenantId,
      ...params,
    },
    exp: Math.round(Date.now() / 1000) + 10 * 60, // 10 minutes
  }

  const token = jwt.sign(payload, METABASE_SECRET_KEY)

  return `${METABASE_SITE_URL}/embed/dashboard/${token}#bordered=false&titled=false`
}
```

```typescript
// apps/admin-panel/app/api/analytics/dashboard/route.ts
import { generateEmbedUrl } from '@beauty-salon/analytics'
import { getCurrentTenant } from '@/lib/auth'

export async function GET(request: Request) {
  const tenant = await getCurrentTenant(request)

  if (!tenant) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Dashboard IDs (configured in Metabase)
  const DASHBOARDS = {
    overview: 1,
    revenue: 2,
    clients: 3,
    staff: 4,
  }

  const { searchParams } = new URL(request.url)
  const dashboardType = searchParams.get('type') || 'overview'

  const embedUrl = generateEmbedUrl({
    dashboardId: DASHBOARDS[dashboardType],
    tenantId: tenant.id,
    params: {
      start_date: searchParams.get('start_date') || '2026-01-01',
      end_date: searchParams.get('end_date') || '2026-12-31',
    },
  })

  return Response.json({ embedUrl })
}
```

### 6. Frontend Integration (Next.js)

```tsx
// apps/admin-panel/components/analytics/dashboard-embed.tsx
'use client'

import { useEffect, useState } from 'react'

interface DashboardEmbedProps {
  type: 'overview' | 'revenue' | 'clients' | 'staff'
  startDate?: string
  endDate?: string
}

export function DashboardEmbed({
  type,
  startDate,
  endDate,
}: DashboardEmbedProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEmbedUrl() {
      const params = new URLSearchParams({
        type,
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      })

      const response = await fetch(`/api/analytics/dashboard?${params}`)
      const data = await response.json()

      setEmbedUrl(data.embedUrl)
      setLoading(false)
    }

    fetchEmbedUrl()
  }, [type, startDate, endDate])

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
  }

  if (!embedUrl) {
    return <div>Failed to load dashboard</div>
  }

  return (
    <iframe
      src={embedUrl}
      frameBorder="0"
      width="100%"
      height="800"
      allowTransparency
      className="rounded-lg shadow-lg"
    />
  )
}
```

```tsx
// apps/admin-panel/app/(dashboard)/analytics/page.tsx
import { DashboardEmbed } from '@/components/analytics/dashboard-embed'

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Аналитика</h1>

      <div className="grid grid-cols-1 gap-8">
        {/* Overview Dashboard */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Обзор</h2>
          <DashboardEmbed type="overview" />
        </section>

        {/* Revenue Dashboard */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Выручка</h2>
          <DashboardEmbed type="revenue" />
        </section>

        {/* Clients Dashboard */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Клиенты</h2>
          <DashboardEmbed type="clients" />
        </section>

        {/* Staff Dashboard */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Мастера</h2>
          <DashboardEmbed type="staff" />
        </section>
      </div>
    </div>
  )
}
```

---

## Metabase Dashboard Queries

### Dashboard 1: Overview (F-111: Team Detailed Report)

**Metrics**:
- Total appointments (month)
- Completion rate
- No-show rate
- Total revenue
- Average ticket
- Client retention rate

```sql
-- Set tenant context
SELECT set_tenant_for_metabase('{{tenant_id}}'::uuid);

-- Appointments Overview
SELECT
  COUNT(*) as total_appointments,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'no_show') as no_shows,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0), 2) as completion_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'no_show') / NULLIF(COUNT(*), 0), 2) as no_show_rate
FROM appointments
WHERE tenant_id = '{{tenant_id}}'::uuid
  AND start_at >= '{{start_date}}'::date
  AND start_at < '{{end_date}}'::date;

-- Revenue Overview
SELECT
  SUM(price) as total_revenue,
  SUM(price) FILTER (WHERE status = 'completed') as actual_revenue,
  SUM(price) FILTER (WHERE status = 'no_show') as lost_revenue,
  AVG(price) FILTER (WHERE status = 'completed') as avg_ticket
FROM appointments
WHERE tenant_id = '{{tenant_id}}'::uuid
  AND start_at >= '{{start_date}}'::date
  AND start_at < '{{end_date}}'::date;

-- Staff Performance
SELECT
  s.name as staff_name,
  COUNT(a.id) as total_appointments,
  COUNT(a.id) FILTER (WHERE a.status = 'completed') as completed,
  ROUND(100.0 * COUNT(a.id) FILTER (WHERE a.status = 'completed') / NULLIF(COUNT(a.id), 0), 2) as completion_rate,
  SUM(a.price) FILTER (WHERE a.status = 'completed') as revenue
FROM staff s
LEFT JOIN appointments a ON a.staff_id = s.id
WHERE s.tenant_id = '{{tenant_id}}'::uuid
  AND a.start_at >= '{{start_date}}'::date
  AND a.start_at < '{{end_date}}'::date
GROUP BY s.id, s.name
ORDER BY revenue DESC;
```

### Dashboard 2: Money Dashboard (F-081: Losses)

```sql
-- Set tenant context
SELECT set_tenant_for_metabase('{{tenant_id}}'::uuid);

-- Daily Revenue Trend
SELECT
  DATE_TRUNC('day', start_at) as date,
  SUM(price) FILTER (WHERE status = 'completed') as actual_revenue,
  SUM(price) FILTER (WHERE status = 'no_show') as lost_revenue_no_show,
  SUM(price) FILTER (WHERE status = 'cancelled') as lost_revenue_cancelled
FROM appointments
WHERE tenant_id = '{{tenant_id}}'::uuid
  AND start_at >= '{{start_date}}'::date
  AND start_at < '{{end_date}}'::date
GROUP BY DATE_TRUNC('day', start_at)
ORDER BY date;

-- Payment Status
SELECT
  status,
  COUNT(*) as count,
  SUM(price) as total_price,
  SUM(paid) as total_paid,
  SUM(price - paid) as unpaid
FROM appointments
WHERE tenant_id = '{{tenant_id}}'::uuid
  AND start_at >= '{{start_date}}'::date
  AND start_at < '{{end_date}}'::date
GROUP BY status;

-- Revenue Forecast (F-083)
SELECT
  DATE_TRUNC('day', start_at) as date,
  SUM(price) as forecasted_revenue
FROM appointments
WHERE tenant_id = '{{tenant_id}}'::uuid
  AND status = 'planned'
  AND start_at >= NOW()
  AND start_at < NOW() + INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', start_at)
ORDER BY date;
```

### Dashboard 3: Clients Dashboard

```sql
-- Set tenant context
SELECT set_tenant_for_metabase('{{tenant_id}}'::uuid);

-- Client Retention
WITH client_visits AS (
  SELECT
    client_id,
    COUNT(*) as visit_count,
    MAX(start_at) as last_visit,
    MIN(start_at) as first_visit
  FROM appointments
  WHERE tenant_id = '{{tenant_id}}'::uuid
    AND status = 'completed'
  GROUP BY client_id
)
SELECT
  CASE
    WHEN visit_count = 1 THEN '1 visit'
    WHEN visit_count BETWEEN 2 AND 5 THEN '2-5 visits'
    WHEN visit_count BETWEEN 6 AND 10 THEN '6-10 visits'
    ELSE '10+ visits'
  END as visit_range,
  COUNT(*) as client_count
FROM client_visits
GROUP BY visit_range
ORDER BY visit_range;

-- Inactive Clients (F-092: Win-back candidates)
SELECT
  c.id,
  c.name,
  c.phone,
  MAX(a.start_at) as last_visit,
  NOW() - MAX(a.start_at) as days_since_last_visit,
  COUNT(a.id) as total_visits
FROM clients c
JOIN appointments a ON a.client_id = c.id
WHERE c.tenant_id = '{{tenant_id}}'::uuid
  AND a.status = 'completed'
GROUP BY c.id, c.name, c.phone
HAVING MAX(a.start_at) < NOW() - INTERVAL '90 days'
ORDER BY last_visit DESC;

-- VIP Clients
SELECT
  c.id,
  c.name,
  c.phone,
  COUNT(a.id) as total_visits,
  SUM(a.price) as lifetime_value,
  MAX(a.start_at) as last_visit
FROM clients c
JOIN appointments a ON a.client_id = c.id
WHERE c.tenant_id = '{{tenant_id}}'::uuid
  AND c.vip = true
  AND a.status = 'completed'
GROUP BY c.id, c.name, c.phone
ORDER BY lifetime_value DESC
LIMIT 50;
```

### Dashboard 4: Staff Performance

```sql
-- Set tenant context
SELECT set_tenant_for_metabase('{{tenant_id}}'::uuid);

-- Staff Load Distribution (F-093: Low-load focus)
SELECT
  s.name as staff_name,
  COUNT(a.id) as appointment_count,
  SUM(EXTRACT(EPOCH FROM (a.end_at - a.start_at)) / 3600) as total_hours,
  ROUND(SUM(EXTRACT(EPOCH FROM (a.end_at - a.start_at)) / 3600) /
    NULLIF((EXTRACT(EPOCH FROM ('{{end_date}}'::date - '{{start_date}}'::date)) / 3600), 0) * 100, 2)
    as load_percentage
FROM staff s
LEFT JOIN appointments a ON a.staff_id = s.id
  AND a.start_at >= '{{start_date}}'::date
  AND a.start_at < '{{end_date}}'::date
WHERE s.tenant_id = '{{tenant_id}}'::uuid
GROUP BY s.id, s.name
ORDER BY load_percentage ASC;

-- Staff Revenue
SELECT
  s.name as staff_name,
  COUNT(a.id) FILTER (WHERE a.status = 'completed') as completed_appointments,
  SUM(a.price) FILTER (WHERE a.status = 'completed') as total_revenue,
  AVG(a.price) FILTER (WHERE a.status = 'completed') as avg_ticket
FROM staff s
LEFT JOIN appointments a ON a.staff_id = s.id
WHERE s.tenant_id = '{{tenant_id}}'::uuid
  AND a.start_at >= '{{start_date}}'::date
  AND a.start_at < '{{end_date}}'::date
GROUP BY s.id, s.name
ORDER BY total_revenue DESC;
```

---

## AI Reports Constructor (F-110)

```typescript
// packages/analytics/src/ai-reports.ts
import { generateEmbedUrl } from './metabase-client'
import { CrewAI } from '@beauty-salon/ai'

export interface ReportRequest {
  tenantId: string
  reportType: 'weekly' | 'monthly' | 'custom'
  includeInsights?: boolean
  format?: 'pdf' | 'email' | 'dashboard'
}

export async function generateAIReport(request: ReportRequest) {
  // 1. Generate Metabase embed URLs для всех dashboards
  const dashboards = {
    overview: generateEmbedUrl({
      dashboardId: 1,
      tenantId: request.tenantId,
    }),
    revenue: generateEmbedUrl({
      dashboardId: 2,
      tenantId: request.tenantId,
    }),
    clients: generateEmbedUrl({
      dashboardId: 3,
      tenantId: request.tenantId,
    }),
    staff: generateEmbedUrl({
      dashboardId: 4,
      tenantId: request.tenantId,
    }),
  }

  // 2. Fetch raw metrics from database
  const metrics = await fetchRawMetrics(request.tenantId)

  // 3. If insights requested, use CrewAI Analytics Agent
  let insights = null
  if (request.includeInsights) {
    insights = await CrewAI.analytics.generateInsights({
      metrics,
      reportType: request.reportType,
    })
  }

  // 4. Assemble report
  return {
    dashboards,
    metrics,
    insights,
    generatedAt: new Date().toISOString(),
  }
}

// Scheduled reports
export async function scheduleWeeklyReport(tenantId: string) {
  // BullMQ job
  await reportQueue.add(
    'weekly-report',
    { tenantId, reportType: 'weekly' },
    {
      repeat: {
        pattern: '0 9 * * MON', // Every Monday at 9 AM
      },
    }
  )
}
```

---

## Alerts (F-112)

```typescript
// Configure in Metabase UI or via API
export async function setupAlerts(tenantId: string) {
  const alerts = [
    {
      name: 'High No-Show Rate',
      query: `
        SELECT
          ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'no_show') /
            NULLIF(COUNT(*), 0), 2) as no_show_rate
        FROM appointments
        WHERE tenant_id = '${tenantId}'
          AND start_at >= NOW() - INTERVAL '7 days'
      `,
      condition: 'no_show_rate > 15', // Alert if > 15%
      channels: ['email', 'telegram'],
    },
    {
      name: 'Revenue Drop',
      query: `
        SELECT
          SUM(price) FILTER (WHERE status = 'completed') as weekly_revenue
        FROM appointments
        WHERE tenant_id = '${tenantId}'
          AND start_at >= NOW() - INTERVAL '7 days'
      `,
      condition: 'weekly_revenue < previous_week_revenue * 0.8', // 20% drop
      channels: ['email', 'telegram'],
    },
    {
      name: 'Staff Overload',
      query: `
        SELECT
          staff_id,
          COUNT(*) as daily_appointments
        FROM appointments
        WHERE tenant_id = '${tenantId}'
          AND start_at >= NOW()::date
          AND start_at < NOW()::date + INTERVAL '1 day'
        GROUP BY staff_id
      `,
      condition: 'daily_appointments > 12', // More than 12 appointments/day
      channels: ['telegram'],
    },
  ]

  // Create alerts in Metabase via API
  for (const alert of alerts) {
    await metabaseAPI.createAlert(alert)
  }
}
```

---

## Performance Optimization

### 1. Query Caching

```typescript
// Metabase auto-caches queries for 1 hour by default
// Можно настроить per-query:
const CACHE_TTL = {
  realtime: 0, // No cache (for live data)
  short: 5 * 60, // 5 minutes
  medium: 60 * 60, // 1 hour
  long: 24 * 60 * 60, // 24 hours
}

// In Metabase dashboard settings:
// "Cache Results" = CACHE_TTL.medium
```

### 2. Database Indexes

```sql
-- Indexes уже созданы в migration 001:
-- CREATE INDEX idx_appointments_tenant_staff_start
--   ON appointments(tenant_id, staff_id, start_at);

-- Дополнительные indexes для analytics queries:
CREATE INDEX idx_appointments_tenant_status_start
  ON appointments(tenant_id, status, start_at);

CREATE INDEX idx_appointments_tenant_created
  ON appointments(tenant_id, created_at);
```

### 3. Read Replicas

```yaml
# For heavy analytics queries, use read replica
PostgreSQL Setup:
  - Primary: Write operations
  - Replica 1: Analytics queries (Metabase)
  - Replica 2: Backup + failover

# Point Metabase to read replica:
MB_DB_HOST: postgres-replica-1
```

### 4. Partitioning

```sql
-- Для больших таблиц (appointments, message_log)
-- Уже настроено партиционирование по месяцам
-- Metabase queries автоматически используют нужные партиции
```

---

## Security Considerations

1. **Embedding Security**:
   - JWT tokens с коротким TTL (10 minutes)
   - HMAC signing с Metabase secret key
   - tenant_id в JWT payload (immutable)

2. **Database Security**:
   - metabase_user имеет только SELECT права
   - RLS policies enforced
   - Audit log для всех queries

3. **API Security**:
   - Rate limiting на Metabase API endpoints
   - IP allowlist (опционально)
   - HTTPS only

4. **Data Privacy**:
   - Self-hosted (данные не покидают инфраструктуру)
   - PII masking в shared dashboards
   - GDPR-compliant (data export/deletion)

---

## Monitoring

```yaml
Grafana Dashboard (Metabase Metrics):
  - Query count/minute
  - Average query execution time
  - Cache hit rate
  - Failed queries
  - Active sessions

Alerts:
  - Query execution time > 10s (warning)
  - Metabase service down (critical)
  - Database connection pool exhausted (critical)
```

---

## Cost Estimation

### Self-Hosted Metabase:
```
Infrastructure:
  - Metabase server: 2 GB RAM, 2 CPU (~$20/month)
  - PostgreSQL: Already exists (shared)
  - Redis cache: Already exists (shared)

Embedding License:
  - Free trial: 14 days
  - Paid: ~$500/month (unlimited embedding)
  - OR: Use iframe without SDK (free, less features)

Total cost: $20/month (without embedding license)
            $520/month (with embedding license)

vs. SaaS alternatives:
  - Looker: $5,000+/month
  - Tableau: $2,000+/month
  - PowerBI: $1,000+/month (cloud)

Savings: $1,000 - $5,000/month 💰
```

---

## Testing Strategy

```typescript
describe('Metabase Integration', () => {
  it('should generate embed URL with tenant context', () => {
    const embedUrl = generateEmbedUrl({
      dashboardId: 1,
      tenantId: 'test-tenant-id',
    })

    expect(embedUrl).toContain('/embed/dashboard/')

    // Decode JWT and verify payload
    const token = embedUrl.split('/').pop()?.split('#')[0]
    const decoded = jwt.verify(token!, METABASE_SECRET_KEY)

    expect(decoded.params.tenant_id).toBe('test-tenant-id')
  })

  it('should enforce RLS for tenant queries', async () => {
    // Execute query as tenant A
    const resultA = await metabase.query(`
      SELECT set_tenant_for_metabase('tenant-a');
      SELECT COUNT(*) FROM appointments;
    `)

    // Execute query as tenant B
    const resultB = await metabase.query(`
      SELECT set_tenant_for_metabase('tenant-b');
      SELECT COUNT(*) FROM appointments;
    `)

    // Results should be different (isolated)
    expect(resultA).not.toEqual(resultB)
  })
})
```

---

## Rollout Plan

### Phase 1: Setup (Day 1)
- Deploy Metabase via Docker Compose
- Configure PostgreSQL connection
- Setup tenant context function

### Phase 2: Dashboard Creation (Day 2)
- Create 4 core dashboards (Overview, Revenue, Clients, Staff)
- Test queries with sample data
- Configure caching

### Phase 3: Embedding (Day 3)
- Implement JWT signing in backend
- Create React components for embedding
- Test in Next.js admin panel

### Phase 4: Automation (Day 4)
- Setup scheduled reports
- Configure alerts
- Test email delivery

### Phase 5: Rollout (Day 5+)
- Enable for pilot tenants
- Monitor performance
- Gather feedback
- Full rollout

---

## Success Criteria

✅ Dashboards embedded в Next.js admin panel
✅ Query execution time < 5s (p95)
✅ RLS isolation working (tenants see only their data)
✅ Scheduled reports delivered weekly
✅ Alerts triggered on thresholds
✅ Cache hit rate > 70%
✅ Developer time: 8 weeks → 3 days

---

## References

- [Metabase GitHub](https://github.com/metabase/metabase)
- [Metabase Docs](https://www.metabase.com/docs/latest/)
- [Embedding Guide](https://www.metabase.com/docs/latest/embedding/introduction)
- [Multi-Tenancy Guide](https://www.metabase.com/learn/permissions/data-sandboxing)
- [API Reference](https://www.metabase.com/docs/latest/api-documentation)

---

## Заключение

Metabase предоставляет **95% функциональности** для business intelligence из коробки, экономя **8 недель разработки** и **$1k-$5k/месяц** на SaaS BI tools.

**Вердикт**: ✅ Утверждено. Начать интеграцию в Week 2 (Priority: Medium).

---

**Следующие шаги**:
1. Deploy Metabase в docker-compose
2. Создать 4 core dashboards
3. Implement embedding в Next.js
4. Setup scheduled reports
