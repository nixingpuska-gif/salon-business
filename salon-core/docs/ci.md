# CI (GitHub Actions)

## Smoke tests in CI
The workflow runs a safe "health-only" smoke by default.

To enable the full E2E smoke run, set the secret:
- `SMOKE_ENABLE=1`

### Required secrets (only if enabling E2E)
- `SMOKE_TENANT_ID`
- `SMOKE_CHANNEL`
- `SMOKE_TO`
- `SMOKE_ERXES_INTEGRATION_ID`
- `SMOKE_WEBHOOK_SECRET`
- `SMOKE_EVENT_TYPE_ID`
- `SMOKE_CALCOM_WEBHOOK_SECRET`

### Optional secrets
- `SMOKE_TIME_ZONE` (default: Europe/Moscow)
- `SMOKE_LANGUAGE` (default: ru)

### Safety gates
To actually send messages or create bookings, set allow flags:
- `SMOKE_ALLOW_SEND=1`
- `SMOKE_ALLOW_INBOUND=1`
- `SMOKE_ALLOW_BOOKING=1`
- `SMOKE_ALLOW_CALCOM=1`

If you want to test unsigned webhooks:
- `SMOKE_ALLOW_UNSIGNED_WEBHOOK=1`
- `SMOKE_ALLOW_UNSIGNED_CALCOM=1`
