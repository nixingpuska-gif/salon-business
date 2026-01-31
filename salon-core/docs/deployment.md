# Deployment Notes (Windows dev → Linux prod)

## Dev (Windows)
- Use Docker Desktop + WSL2
- Run services independently: erxes, cal.com, salon-core
 - Optional: use `docker-compose.yml` in salon-core for Redis/Postgres + workers

## Prod (Linux)
- Reverse proxy: Nginx
- Persistent storage: Postgres (SSD), Archive Postgres (HDD)
- Redis for queues
- Required prod flags:
  - STRICT_WEBHOOK_SIGNATURE=1
  - STRICT_TENANT_CONFIG=1
  - STRICT_INBOUND_SCHEMA=1

## Minimum services
- Postgres hot
- Postgres archive
- Redis
- erxes (integrations are inside erxes)
- cal.com
- salon-core

## Docker Compose (local)
```
docker compose up -d postgres redis
docker compose run --rm migrate
docker compose up -d app worker_sender worker_tx worker_mk worker_reminder
```

### One-step local bootstrap (Windows)
If you need a fully automated local setup without touching DB credentials:
```
powershell -ExecutionPolicy Bypass -File scripts/bootstrap_local.ps1
```
This uses `docker-compose.local.yml` to avoid port conflicts and runs migrations + KPI rollups.

## Production runbook (simple)
See `docs/PROD_RUNBOOK.md` for a 3-step production checklist.

## Database
- Apply `scripts/sql/001_message_log.sql` to enable message logging
- Apply `scripts/sql/002_tenant_config.sql` for tenant config storage (DB mode)
- Apply `scripts/sql/003_core_tables.sql` to create core mapping tables (optional)
- Apply `scripts/sql/007_inventory_tables.sql` for inventory ledger and drafts (required for inventory automation)
- Apply `scripts/sql/008_feedback_tables.sql` for feedback storage (required for KPI + ratings)
- Apply `scripts/sql/009_kpi_rollup.sql` for KPI rollups (summary dashboards)
- Apply `scripts/sql/010_booking_events.sql` for booking lifecycle analytics
- Agent runbook: `docs/agent-db-runbook.md`
- Optional: `scripts/sql/004_retention.sql` (scheduled cleanup)
- Optional: `scripts/sql/005_partitions.sql` (partitioned message_log/job_log)
- Optional: `scripts/sql/006_metrics_views.sql` (job_log + appointments metrics views)
- Set `LOG_TO_DB=1` to write message_log
- Set `CORE_DB_WRITE=1` to write core tables + job_log

## Maintenance jobs (cron)
- Script: `scripts/cron/maintenance.sh` (psql + DATABASE_URL required)
- Daily retention:
  - `RUN_RETENTION=1` (default) executes `scripts/sql/004_retention.sql`
- Monthly partitions (only if using partitions):
  - `RUN_PARTITIONS=1` executes `scripts/sql/005_partitions.sql`
- KPI rollup (daily):
  - `RUN_KPI_ROLLUP_DAILY=1` executes `scripts/sql/kpi_rollup_daily.sql`
- KPI rollup (hourly):
  - `RUN_KPI_ROLLUP_HOURLY=1` executes `scripts/sql/kpi_rollup_hourly.sql`

Example crontab (Linux):
```
# daily retention at 03:30
30 3 * * * DATABASE_URL=postgresql://... /opt/salon-core/scripts/cron/maintenance.sh >> /var/log/salon-core/cron.log 2>&1
# monthly partitions on day 1 at 04:10
10 4 1 * * DATABASE_URL=postgresql://... RUN_PARTITIONS=1 /opt/salon-core/scripts/cron/maintenance.sh >> /var/log/salon-core/cron.log 2>&1
# hourly KPI rollup at minute 5
5 * * * * DATABASE_URL=postgresql://... RUN_KPI_ROLLUP_HOURLY=1 /opt/salon-core/scripts/cron/maintenance.sh >> /var/log/salon-core/cron.log 2>&1
# daily KPI rollup at 02:45
45 2 * * * DATABASE_URL=postgresql://... RUN_KPI_ROLLUP_DAILY=1 /opt/salon-core/scripts/cron/maintenance.sh >> /var/log/salon-core/cron.log 2>&1
```

### systemd alternative
- Units in `scripts/systemd/`
- Create `/etc/salon-core/env` with DATABASE_URL and other env vars.
- Enable timers:
  - `systemctl enable --now salon-core-retention.timer`
  - `systemctl enable --now salon-core-partitions.timer`

## Tenant config storage
- `TENANT_CONFIG_SOURCE=db` uses Postgres table `tenant_config`
- Admin token: `ADMIN_API_TOKEN`
- Per-tenant roles: `access.ownerTokens` / `access.staffTokens`

## Tenant auto-resolution
- `TENANT_FROM_HOST=1` to resolve tenantId from host subdomain
- `TENANT_HOST_SUFFIX=.yourdomain` to force parsing only when host matches suffix

## Erxes plugin integration (optional)
- Configure erxes core-api with `SALON_CORE_API_URL` and `SALON_CORE_ADMIN_TOKEN`
- Enable plugin: `ENABLED_PLUGINS=salonhelp`
- Optional: `PLUGINS_BASE_URL` to point to your plugin host

## Workers
- Start sender worker: `npm run worker:sender`
- Failed outbound jobs go to `queue:dead:send:*`
- Start tx worker: `npm run worker:tx`
- Start mk worker: `npm run worker:mk`
- Start reminder worker: `npm run worker:reminder`

## Queue config (Streams)
- Set QUEUE_GROUP / QUEUE_CONSUMER for stable consumer identities
- QUEUE_ACK_TIMEOUT_MS controls stale reclaim timeout
- Redis 6.2+ required for XAUTOCLAIM; older Redis will not reclaim stale messages
- ACK still works on Redis < 6.2; only stale reclaim is unavailable

## Monitoring
- Health endpoint: GET /health/queues (set HEALTH_TOKEN and pass `x-health-token`)
- Metrics endpoint: GET /health/metrics (Prometheus format)
- Track `queue:dead:*` lengths and pending counts per group
- DB metrics in /health/metrics (set `METRICS_DB=1` and apply `006_metrics_views.sql`)
  - Includes per-tenant job_log + appointments aggregates

### Prometheus
- Alert rules: `monitoring/prometheus/alerts.yaml`
- Grafana dashboard: `monitoring/grafana/salon-core-queues.json`

Scrape config (example):
```
scrape_configs:
  - job_name: "salon-core"
    metrics_path: /health/metrics
    static_configs:
      - targets: ["salon-core:8080"]
```

If HEALTH_TOKEN is set, either:
- expose /health/metrics only on an internal network, or
- inject `x-health-token` via reverse proxy.

## Smoke tests
- E2E checklist: `docs/smoke-tests.md`
- Scripts: `scripts/smoke/README.md`
- CI smoke setup: `docs/ci.md`
- Mock-smoke: set `MOCK_CALCOM=1` (Cal.com API calls are bypassed)

## Security
- Rotation guide: `docs/security.md`
- Integration config matrix: `docs/config-matrix.md`
- Integration checklist: `docs/checklist-integration.md`
- Env audit: `npm run env:audit`

## Quiet hours
- QUIET_HOURS_START / QUIET_HOURS_END (default 22–9) applies to reminders

## Per-tenant bots
- Configure `TENANT_CONFIG_PATH` to a JSON file with per-tenant tokens/URLs
- Optional reload interval: `TENANT_CONFIG_RELOAD_SECONDS` (default 30s)

## Per-tenant webhook secrets
- Put `webhooks.<channel>.secret` in tenant config for per-salon HMAC keys
- If not set, global env secret is used
- Set `STRICT_WEBHOOK_SIGNATURE=1` to require a secret for every inbound webhook

## Tenant mapping enforcement
- Set `STRICT_TENANT_CONFIG=1` to reject requests for unknown tenants
- Tenant config can include per-tenant Cal.com + erxes credentials

## Cal.com webhook
- Set `CALCOM_WEBHOOK_SECRET` (global) or per-tenant `calcom.webhookSecret`
- Endpoint: `/webhooks/calcom/:tenantId?`
- For reminder scheduling, include `metadata.channel`, `metadata.to`, and `start` in the webhook payload

## Marketing + throttling
- MK client rate limit: `MK_CLIENT_LIMIT_COUNT` per `MK_CLIENT_LIMIT_DAYS`
- Respect quiet hours: `MK_RESPECT_QUIET_HOURS=1`
- Channel RPS: `CHANNEL_RPS_*`
- MK dedupe: pass `campaignId` to avoid duplicate sends per client

## Inbound schema
- Set `STRICT_INBOUND_SCHEMA=1` to reject malformed inbound payloads

## Log redaction
- `MASK_PII_LOGS=1` masks phone/email/name/tokens in logs
- `MASK_MESSAGE_CONTENT=1` masks message bodies
