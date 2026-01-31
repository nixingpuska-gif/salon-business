# Roadmap: Ready for Real Tests (2026-01-25)

Goal: make the system ready for live integration testing with real channels, cal.com, and erxes.
Progress: 85% (updated 2026-01-26)

Reference (non-negotiable MVP requirements): `docs/mvp-requirements.md`
Architecture plan: `docs/architecture-mvp-70.md`
MVP backlog: `docs/backlog-mvp-70.md`
Backlog breakdown: `docs/backlog-mvp-70-sprints.md`
Load test plan: `docs/load-test-plan.md`
Data model: `docs/data-model-mvp.md`
API outline: `docs/api-surface-mvp.md`
OpenAPI spec: `docs/openapi-mvp.yaml`

## Phase 0: Code correctness (salon-core)
- [x] Cal.com reschedule handling clears old reminders and allows new scheduling.
- [x] Reminder idempotency keys include start time to allow reschedules.
- [x] Default reminder messages are ASCII-safe (no encoding issues).
- [x] Windows runner for smoke tests (`npm run smoke:gitbash`).
- [x] Dev scripts for API/UI use `node` directly (dotenv CLI removed).

## Phase 1: Environment readiness (requires secrets)
- [ ] Fill real secrets in `.env` (copy from `.env.prod.example`).
- [ ] Disable mocks: `MOCK_CALCOM=0`, `MOCK_ERXES=0`, `MOCK_SENDERS=0` (Cal.com done; erxes/senders pending).
- [ ] Configure STT + OCR: `STT_API_BASE`, `OCR_API_BASE` (or set `MOCK_STT=1`, `MOCK_OCR=1` for mock tests).
- [x] Cal.com API v2 service running (`calcom-api` container).
- [x] Cal.com base URL set (self-host default is `http://localhost:3003`).
- [x] Seeded Cal.com API key for local dev: `cal_0123456789abcdef0123456789abcdef` (user `owner1-acme@example.com`).
- [x] Cal.com API version set (`CALCOM_API_VERSION=2024-08-13`).
- [x] Cal.com API auth verified (GET `/v2/atoms/event-types` returns 200).
- [x] Cal.com API license check bypassed for local testing (`IS_E2E=true` in cal.com).
- [ ] For production: disable `IS_E2E` and ensure CALCOM_LICENSE_KEY validates against console API.
- [x] Erxes plugin env set: `SALON_CORE_API_URL`, `SALON_CORE_ADMIN_TOKEN`.
- [x] Erxes core-api + frontline + gateway running on Windows; gateway uses Apollo Router via Docker (container `erxes-apollo-router`, port 50000).
- [x] Erxes core-ui dev server runs on port 3005 (port 3001 is busy); UI remotes use `ENABLED_PLUGINS_UI`.
- [ ] Cal.com webhook configured: `POST /webhooks/calcom/:tenantId?` + HMAC with `CALCOM_WEBHOOK_SECRET` (or per-tenant `calcom.webhookSecret`).
- [ ] Tenant config set via salonhelp UI: `erxes.brandId`, `erxes.integrationIds`, `calcom.apiKey` (or global), channel tokens + webhook secrets.

## Agent checklist (DB + STT/OCR)
Goal: agents prepare DB + real voice/inventory pipelines without owner action.

1) Apply DB migrations
- Windows:
  - `powershell -ExecutionPolicy Bypass -File scripts/sql/apply_all.ps1`
- Git Bash:
  - `bash scripts/sql/apply_all.sh`

2) Enable DB writes + metrics
- `CORE_DB_WRITE=1`
- `LOG_TO_DB=1`
- `METRICS_DB=1`

3) Configure STT/OCR (real)
- `STT_PROVIDER=openai` (or `http`)
- `STT_API_BASE=...`
- `STT_API_KEY=...` (if required)
- `OCR_PROVIDER=http`
- `OCR_API_BASE=...`
- `OCR_API_KEY=...` (if required)

4) Disable mocks
- `MOCK_CALCOM=0`
- `MOCK_ERXES=0`
- `MOCK_SENDERS=0`
- `MOCK_STT=0`
- `MOCK_OCR=0`

5) Run smoke
- PowerShell: `scripts/smoke/mvp_no_db_test.ps1` (if DB not ready yet)
- Git Bash: `scripts/smoke/mvp_no_db_test.sh`

6) Verify tables exist
- `inventory_item`, `inventory_ledger`, `stock_snapshot`, `intake_doc`, `feedback`

## Phase 2: Real test execution (manual)
- [x] Health checks: `GET /health`, `/health/queues`, `/health/metrics`.
- [x] Inbound webhooks per channel (Telegram/VK/Instagram/WhatsApp) in mock mode (generic payload, strict inbound off).
- [x] Booking via inbound webhook (with `booking` payload) in mock mode.
- [x] Cal.com webhook (created/confirmed + rescheduled + cancelled) in mock mode.
- [x] Outbound send test (`/send/:channel`) in mock mode.
- [x] MK flow (`/queue/mk`) in mock mode.
- [x] Verify DB: `message_log`, `clients`, `appointments_map`, `job_log` populated after smoke run.
- [ ] Voice flow: `/voice/upload` -> `/voice/intent` with real STT (or `MOCK_STT=1`).
- [ ] Inventory flow: intake -> confirm -> consume -> reconcile (apply `007_inventory_tables.sql`).
- [ ] Feedback/KPI flow: submit rating -> KPI summary (apply `008_feedback_tables.sql`).
Notes:
- Use `scripts/smoke/run_all.sh` with:
  - `ALLOW_VOICE=1 SERVICE_ID=... PREFERRED_TIME=...`
  - `ALLOW_INVENTORY=1`
  - `ALLOW_FEEDBACK=1`

## Success criteria (ready for real tests)
- Real secrets configured and mocks disabled.
- All health endpoints OK.
- Inbound -> booking -> CRM -> outbound works for at least one tenant/channel.
- Cal.com reschedule updates reminders correctly.
- Voice, inventory, and feedback flows pass once with real services.
- No pending/failed queues after test flow completes.

## Blocking items
- External credentials and upstream services availability (cal.com, erxes, channel providers).
- Cal.com API v2 must be reachable at `CALCOM_API_BASE`.
