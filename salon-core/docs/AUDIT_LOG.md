# Audit Log

## 2026-01-26 - Full audit (multi-repo)
Scope: salon-core + cal.com + erxes + erxes-integrations
Completion: 85% (confidence: medium)
Assumptions: salon-core docs reflect current integration design; external services not fully configured for real runs.
Key findings:
- Architecture and integration flows are well documented in salon-core docs (integration map, API contracts, deployment, security).
- salon-core CI builds and runs smoke tests; E2E is mocked by default and unit tests are not present.
- salon-core build passes locally (`npm run build`).
- Env audit warns about missing CALCOM/ERXES bases and channel tokens (per-tenant config not set).
- Real secrets and webhooks for cal.com/channels/erxes are not configured, blocking real E2E validation.
- erxes repo has local modifications and new salonhelp modules that are not tracked upstream.
- erxes-integrations repo is deprecated upstream; continuing there increases drift risk.
Actions:
- Populate real secrets, disable mocks, configure webhooks, and run full smoke in real mode.
- Add minimal unit tests around normalization, idempotency, and quiet-hours scheduling.
- Decide on integrations strategy: migrate to erxes/integrations or archive erxes-integrations.
- Create compliance checklist (AGPLv3 + data localization) before production rollout.

## 2026-01-26 - Smoke execution (local)
Scope: salon-core (health + inbound + booking + calcom webhook + queue + send)
Completion: 85% (confidence: medium)
Assumptions: running instance uses default dev env; strict signatures disabled.
Key findings:
- Health endpoints OK: /health, /health/queues, /health/metrics.
- Inbound webhook test passed with unsigned payloads.
- Booking webhook test passed, but bookingId indicates mocked Cal.com flow.
- Queue and send tests passed (senders mocked).
Actions:
- Confirm runtime env for salon-core (MOCK_* flags) and restart with real settings.
- Configure real ERXES_API_BASE and channel tokens; enable strict signature verification.

## 2026-01-26 - Metrics + tests hardening
Scope: salon-core metrics plumbing and unit tests
Completion: 88% (confidence: medium)
Assumptions: KPI rollups will be computed via a scheduled job.
Key findings:
- Added KPI rollup and booking events migrations (009/010).
- KPI endpoints now surface extended metrics with safe fallbacks.
- Unit tests added for quiet-hours, slot grid, and inbound normalization.
Actions:
- Add rollup job (daily/hourly) for kpi_rollup tables.
- Enable STRICT_INBOUND_SCHEMA in production env.

## 2026-01-26 - Local DB bootstrap (docker)
Scope: salon-core local infra (postgres/redis/app)
Completion: 90% (confidence: medium)
Assumptions: local docker environment only; no real providers.
Key findings:
- DB migrations 001–010 applied via docker migrate container.
- KPI rollup scripts are runnable via maintenance or migrate with RUN_KPI_ROLLUP_*.
- App runs in docker on port 18081 with KPI endpoints responding.
Actions:
- Decide target DB environment for production and re-apply migrations there.

## 2026-01-27 - Full audit refresh + readiness %
Scope: all repos (cal.com, erxes, erxes-integrations, salon-core)
Completion: 88% (confidence: medium)
Assumptions: local docker only; production DB and real providers not configured.
Key findings:
- KPI rollup scripts exist and run locally; KPI endpoints respond.
- Mock E2E smoke passes on docker instance.
- Production readiness still blocked by real secrets/webhooks and compliance checks.
Actions:
- Apply migrations and cron rollups in production DB.
- Run real E2E flows when secrets are available.

## 2026-01-27 - Day 3 (Best-on-market proof)
Scope: documentation + proof slice
Completion: 90% (confidence: medium)
Assumptions: proof based on mock + local DB.
Key findings:
- Proof slice documented (KPI pipeline + mock E2E + scheduling tests).
- KPI/health/smoke demo checklist ready.
Actions:
- Convert proof slice into real evidence after secrets are provisioned.
