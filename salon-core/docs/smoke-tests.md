# Smoke Tests (E2E)

Prereqs:
- Redis, Postgres, erxes, cal.com, salon-core running
- Redis 6.2+ recommended for reclaiming stale stream messages (XAUTOCLAIM)
- WORKERS running: sender, tx, mk, reminder
- `CORE_DB_WRITE=1` enabled if you want DB checks
- Tenant config exists (file or DB) with channel tokens + webhook secrets

## 1) Health + Metrics
- GET /health -> 200
- GET /health/queues -> 200 (include `x-health-token` if set)
- GET /health/metrics -> 200 text/plain
  - Quick check: `scripts/smoke/health_check.sh` (set `SALON_CORE_URL` + optional `HEALTH_TOKEN`)
  - Full run: `scripts/smoke/run_all.sh` (see `scripts/smoke/README.md`)

Local docker-compose:
- `SALON_CORE_URL=http://localhost:8080`
- Optional: copy `scripts/smoke/.env.example` to `.env.smoke`
- For mock runs: set `MOCK_SENDERS=1`, `MOCK_CALCOM=1`, `MOCK_ERXES=1`

## 2) Tenant Config
- In erxes UI (salonhelp plugin), save tenant config
- Verify:
  - salon-core returns config via GET /tenants/:tenantId/config
  - tenant_mappings updated (if CORE_DB_WRITE=1)

## 3) Inbound Message (each channel)
Send a test webhook payload to:
- /webhooks/telegram/:tenantId?
- /webhooks/vkmax/:tenantId?
- /webhooks/instagram/:tenantId?
- /webhooks/whatsapp/:tenantId?
  - Quick check: `scripts/smoke/webhook_inbound_test.sh`
    - Set `CHANNEL`, `WEBHOOK_SECRET`, `ERXES_INTEGRATION_ID`, `TENANT_ID`

Verify:
- Contact exists in erxes
- Message inserted into erxes conversation
- message_log row (if LOG_TO_DB=1)
- clients row created/updated (if CORE_DB_WRITE=1)

## 4) Booking via inbound webhook
Send message with `booking` block (Cal.com v2 format with `attendee`, or legacy `responses` + top-level `timeZone`/`language`).
  - Quick check: `scripts/smoke/booking_webhook_test.sh`
    - Set `EVENT_TYPE_ID`, `START_ISO`, `TIME_ZONE`, `LANGUAGE`, `TENANT_ID`
Verify:
- Booking created in Cal.com
- appointments_map updated with booking id
- Reminders scheduled (check `reminders:global` zset length)

## 5) Cal.com webhook
Send Cal.com webhook with booking status change:
- Terminal status (cancelled/rejected/no_show) -> reminders removed
- Active status (confirmed/created) -> reminders scheduled
- Rescheduled -> reminders removed + re-scheduled (requires start + metadata.channel/to)
  - Quick check: `scripts/smoke/calcom_webhook_test.sh`
    - Set `CALCOM_WEBHOOK_SECRET`, `START_ISO`, `TENANT_ID`
Verify:
- appointments_map updated with status
- reminders removed/scheduled

## 6) Outbound send
POST /send/:channel with `idempotencyKey`, `to`, `message`.
  - Quick check: `scripts/smoke/send_test.sh`
Verify:
- Job in queue:send:*
- Sender worker delivers
- job_log updated to processed (if CORE_DB_WRITE=1)

## 7) Marketing (MK)
POST /queue/mk with `campaignId` or `idempotencyKey`.
  - Quick check: `scripts/smoke/queue_test.sh`
Verify:
- MK rate limits
- Quiet hours deferral (if enabled)
- Delivery via sender

## 8) Dead-letter test
Use invalid channel token and send message.
Verify:
- Retries happen
- Job ends in `queue:dead:*`

## 9) Reminders worker
Create reminder in near-future time (1-2 minutes ahead).
Verify:
- reminder worker enqueues tx job
- tx -> send -> delivered

## 10) Voice (upload + intent)
POST /voice/upload with multipart file (or JSON base64), then /voice/intent.
Verify:
- fileId returned
- STT returns transcript (or set `MOCK_STT=1`)
- intent returned with fields (serviceId/preferredTime if present)
Optional:
- POST /voice/booking with `client + timeZone + serviceId + preferredTime` to create booking.

## 11) Inventory (intake + confirm + consume + reconcile)
Steps:
1) POST /inventory/intake with file or `items`/`text`
2) POST /inventory/intake/confirm with draftId
3) POST /inventory/consume with bookingId + items or serviceId mapping
4) POST /inventory/reconcile with physical counts
Verify:
- ledger entries written (DB or `storage/inventory/ledger.jsonl`)
- intake_doc status moves to confirmed
- reconcile returns variance

## 12) Feedback + KPI
POST /feedback/request (optional channel/to/message)
POST /feedback/submit with rating (1-5)
GET /kpi/summary?tenantId=...&period=day
GET /kpi/staff/:staffId?tenantId=...&period=day
Verify:
- feedback rows inserted (DB)
- KPI endpoints return non-zero counts after submissions
