# Real Evidence Plan (1 Day)
Date: 2026-01-27

Goal: replace mock proof with real evidence for at least one tenant + one channel.

## Preconditions
- Real secrets available (Cal.com, erxes, channel provider).
- Tenant config ready (brandId, integrationIds, tokens, webhook secrets).
- Cal.com webhook configured for tenant.

## Step-by-Step (timeboxed)
### 1) Prepare tenant (60–90 min)
- Create/verify tenant config in erxes salonhelp UI.
- Ensure:
  - erxes.brandId + integrationIds
  - calcom.apiKey + webhookSecret + teamId
  - channel tokens + webhook secrets

### 2) Enable strict mode (15 min)
- Set in env:
  - STRICT_WEBHOOK_SIGNATURE=1
  - STRICT_TENANT_CONFIG=1
  - STRICT_INBOUND_SCHEMA=1

### 3) Disable mocks (15 min)
- MOCK_SENDERS=0
- MOCK_CALCOM=0
- MOCK_ERXES=0

### 4) Real E2E run (60–90 min)
Run smoke with real secrets:
```
SMOKE_ENV_FILE=/path/to/real.env npm run smoke:gitbash
```
Expected:
- inbound webhook accepted
- booking created in Cal.com
- message delivered by channel provider

### 5) KPI confirmation (15 min)
- Run KPI rollup:
```
RUN_KPI_ROLLUP_DAILY=1 RUN_KPI_ROLLUP_HOURLY=1 scripts/cron/maintenance.sh
```
- Check:
```
GET /kpi/summary?tenantId=<tenant>&period=day
```

### 6) Rollback plan (10 min)
If failures:
- Re-enable mocks
- Disable strict signature temporarily
- Capture logs + payloads

## Success Criteria (real evidence)
- Booking created and confirmed with real channel delivery.
- Webhook signatures validated.
- KPI reflects real data (not mock).

## Risks
- Provider API limits or invalid webhook configuration.
- Missing tenant config or wrong secrets.

