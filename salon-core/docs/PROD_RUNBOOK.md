# Production Runbook (Simple)
Date: 2026-01-26

Goal: a minimal, copy‑paste guide to bring up salon-core with DB + KPI rollups.

## Step 1: Set required env
Required:
- DATABASE_URL
- REDIS_URL
- STRICT_WEBHOOK_SIGNATURE=1
- STRICT_TENANT_CONFIG=1
- STRICT_INBOUND_SCHEMA=1

Optional but recommended:
- CORE_DB_WRITE=1
- LOG_TO_DB=1
- METRICS_DB=1

## Step 2: Apply migrations + run KPI rollup once
If using docker migrate (preferred):
```
docker compose run --rm migrate
docker compose run --rm -e RUN_KPI_ROLLUP_DAILY=1 -e RUN_KPI_ROLLUP_HOURLY=1 migrate
```

If using psql directly:
```
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/001_message_log.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/002_tenant_config.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/003_core_tables.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/007_inventory_tables.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/008_feedback_tables.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/009_kpi_rollup.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/010_booking_events.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/006_metrics_views.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/kpi_rollup_daily.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/kpi_rollup_hourly.sql
```

## Step 3: Start services + verify
Health:
```
GET /health
GET /health/queues
GET /health/metrics
```

KPI:
```
GET /kpi/summary?tenantId=<tenant>&period=day
```

## Step 4: Enable cron (rollups)
Daily + hourly:
```
RUN_KPI_ROLLUP_DAILY=1
RUN_KPI_ROLLUP_HOURLY=1
```
Use `scripts/cron/maintenance.sh` as the cron target (see `docs/deployment.md`).

## One-button (Docker)
If you want a one-command setup (Docker only):
```
powershell -ExecutionPolicy Bypass -File scripts/prod_one_button.ps1
```
It will:
1) Start Postgres + Redis
2) Apply migrations
3) Run KPI rollups
4) Start app + workers
