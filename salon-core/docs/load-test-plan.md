# Load Test Plan: MVP 70% (2026-01-26)

Goal: validate 10,000 concurrent sessions and peak messaging throughput.

Scripts: `scripts/loadtest/k6/mvp_load.js` (see `scripts/loadtest/README.md`)

## 1) Assumptions
- 1,000 salons active concurrently (MVP).
- ~300 bookings/day/salon (assumed).
- 3-4 messages per booking.
- Average throughput ~14 msg/sec, peak 10-20x.
- Channels: MAX, WhatsApp, Instagram, Telegram.

## 2) Targets (Pass/Fail)
- API P95 latency: <= 300 ms for lightweight endpoints, <= 800 ms for booking and OCR initiation.
- Error rate: < 0.1% for core endpoints.
- Queue backlog: clears within 5 minutes after peak burst.
- No data loss; idempotency guarantees for repeated messages.

## 3) Workload Model
### Concurrent sessions (10k)
- Mix of read/write API calls with session stickiness.
- 70% read (availability, dashboard), 30% write (booking, messages).

### Messaging throughput
- Average: 14 msg/sec.
- Peak bursts: 200-300 msg/sec for 15-30 minutes.

### Booking
- Create/reschedule/cancel mix: 70/20/10.

## 4) Scenarios
S1: Availability + slot suggestion flood (read-heavy).
S2: Booking create + reminder schedule.
S3: Inbound message burst (all channels).
S4: Outbound send with retry and dead-letter.
S5: Inventory intake (OCR start) + auto-consumption.
S6: Dashboard KPI queries (owner view).

## 5) Tooling
- k6 or Locust for HTTP + Webhook load.
- Separate worker scripts to emulate channel webhooks.
- Synthetic media for OCR/STT (use small test files).

## 6) Environment
- Staging cluster with production-like topology.
- Separate Postgres, Redis, object storage.
- Cal.com and erxes running in staging mode.

## 7) Data Setup
- Seed 1,000 tenants.
- Seed staff/services per tenant.
- Seed availability windows in Cal.com.

## 8) Observability Checks
- Metrics: queue depth, booking success, send latency, OCR latency.
- Logs: correlationId, tenantId, channel.
- Alerts: booking failures > 1%, send failure spikes.

## 9) Reporting
- Record throughput, latencies, error rates, queue drain time.
- Archive results with date/time and config.

## 10) Rollback Plan
- If error rate > threshold, abort test and capture logs.
- Verify data integrity post-test.
