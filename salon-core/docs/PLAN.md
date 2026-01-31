# Plan

## Stage S1: Real test readiness
Goal: Enable real provider integration for at least one tenant and channel.
Deliverables:
- Real secrets populated in env (cal.com, erxes, channel providers)
- Mocks disabled for target flows
- Cal.com webhook configured for tenant(s)
- Tenant config completed (brandId, integrationIds, tokens, webhook secrets)

Acceptance criteria:
- Health endpoints OK (GET /health, /health/queues, /health/metrics)
- Mock flags are off for target flows
- Tenant config retrievable via GET /tenants/:tenantId/config

Tests:
- npm run env:audit (STRICT=1)
- npm run smoke (real mode with secrets)

Risks:
- External services unavailable or rate-limited
- Provider webhook signatures misconfigured

Dependencies:
- Cal.com API v2 reachable
- erxes core-api + gateway running
- Channel provider credentials provisioned

## Stage S2: Real test execution
Goal: Validate E2E flows end to end in real mode.
Deliverables:
- Inbound -> booking -> CRM -> outbound confirmed
- Cal.com webhook reschedule/cancel path verified
- Voice, inventory, feedback flows validated at least once

Acceptance criteria:
- No pending queues after flows complete
- Data written to DB (message_log, clients, appointments_map, job_log)

Tests:
- scripts/smoke/run_all.sh (ALLOW_* flags set for real)

Risks:
- Gaps in inventory/feedback DB migrations
- STT/OCR provider errors

Dependencies:
- DB migrations applied (001/002/003/007/008)
- STT/OCR endpoints configured
