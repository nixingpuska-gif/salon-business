# Integration Checklist (erxes + cal.com)

## erxes setup
- Set env in erxes core-api:
  - `SALON_CORE_API_URL`
  - `SALON_CORE_ADMIN_TOKEN`
- Enable plugin:
  - `ENABLED_PLUGINS=salonhelp`
- (Optional) `PLUGINS_BASE_URL` if plugin assets are hosted separately
- Verify salonhelp UI:
  - Open settings page, save tenant config
  - Confirm salon-core `/tenants/:tenantId/config` returns data

## cal.com setup
- Create API key
- Run Cal.com API v2 service (calcom-api) and set `CALCOM_API_BASE` + `CALCOM_API_VERSION` in salon-core
- Set webhook to salon-core:
  - `POST /webhooks/calcom/:tenantId?`
  - Provide `x-signature` HMAC SHA256 using per-tenant or global secret
- Ensure payload contains:
  - `status` or `event`
  - `start` or `startTime`
  - `metadata.channel`, `metadata.to`, `metadata.timeZone` (if needed)

## salon-core setup
- Apply migrations:
  - `001_message_log.sql`, `002_tenant_config.sql`, `003_core_tables.sql`
  - `006_metrics_views.sql` if DB metrics used
- Configure tenant config:
  - `TENANT_CONFIG_SOURCE=db` + `ADMIN_API_TOKEN`
  - Per-tenant `calcom.apiKey` + `erxes.brandId` + `erxes.integrationIds`
- Enable strict modes in prod:
  - `STRICT_WEBHOOK_SIGNATURE=1`
  - `STRICT_TENANT_CONFIG=1`
- Run workers:
  - sender, tx, mk, reminder

## Verification
- Run smoke scripts (`scripts/smoke/run_all.sh`)
- Check /health/metrics for queue + DB metrics
