# Metrics & Instrumentation Spec
Date: 2026-01-26

Purpose: define how we measure automation, transparency, and reliability. This spec aligns with
`docs/OKRS.md`, `docs/mvp-requirements.md`, and `docs/api-surface-mvp.md`.

## 1) Metric Categories (what we must measure)
### Automation
- Admin intervention rate (%)
- Booking automation rate (%)
- Reminder automation rate (%)
- Mean time to resolve booking intent (sec)

### Owner Transparency
- Revenue (gross/net), cancellations, no-shows, repeat visits
- Utilization per staff and per salon
- Average ticket size
- Inventory variance (absolute and %)
- Feedback coverage (%) and average rating

### Scheduling Efficiency
- Grid alignment compliance (%)
- Daily capacity utilization (%)
- Off-peak shift rate (% of bookings moved to off-peak)

### Reliability
- Booking success rate (%)
- Message delivery success rate (%)
- Queue dead-letter rate (%)

## 2) Event Sources (ground truth)
Primary sources already in DB:
- message_log (inbound/outbound messages)
- job_log (queue processing + status)
- appointments_map (booking status and start time)
- feedback (ratings/comments)
- inventory_ledger + stock_snapshot (consumption + variance)
- audit_log (manual actions and exceptions)

Required instrumentation (must be logged):
- booking.intent_received
- booking.created / booking.confirmed / booking.cancelled / booking.rescheduled
- booking.no_show (if available from Cal.com webhook)
- message.inbound / message.outbound / message.failed
- admin.manual_intervention (reply, override, manual reschedule)
- inventory.intake_created / intake_confirmed / consumed / reconciled
- feedback.requested / feedback.submitted

## 3) Data Model Additions (to enable metrics)
### A) KPI Rollups
If not present in SQL migrations, add:
- kpi_rollup
  - id, tenant_id, period_start, period_end, granularity (day/week/month)
  - metrics_json (object), created_at
- staff_kpi_rollup
  - id, tenant_id, staff_id, period_start, period_end, granularity
  - metrics_json (object), created_at

### B) Booking Events (recommended)
For accurate cancellation/no-show tracking:
- booking_events
  - id, tenant_id, booking_id, event_type, source, payload_json, created_at
Rationale: appointments_map stores only latest status; events are needed for audits and KPIs.

### C) Admin Intervention
Use audit_log for manual actions with normalized action codes:
- admin.reply
- admin.override_booking
- admin.manual_reschedule
- admin.manual_cancel

## 4) Metric Definitions (examples)
- booking_success_rate = (bookings_confirmed / booking_attempts) * 100
  - attempts = count(booking.intent_received)
  - confirmed = booking_events where event_type in (created, confirmed)
- admin_intervention_rate = (manual_interventions / booking_attempts) * 100
  - manual_interventions = audit_log action in admin.*
- reminder_delivery_rate = (outbound_delivered / outbound_sent) * 100
  - outbound_sent = job_log queue=send status=accepted/processed
- utilization_rate = (sum(service_duration) / available_working_minutes) * 100
  - requires staff schedule/availability source (from Cal.com or staff schedule config)
- inventory_variance_pct = abs(sum(variance)) / sum(expected) * 100
  - from stock_snapshot

## 5) Aggregation Pipeline
1) Write events to source tables (message_log, job_log, appointments_map, feedback, inventory_ledger).
2) Nightly rollup job aggregates daily KPIs into kpi_rollup and staff_kpi_rollup.
3) Optional hourly rollup for operational dashboards.

Suggested jobs:
- scripts/sql/kpi_rollup_daily.sql (run via scripts/cron/maintenance.sh)
- scripts/sql/kpi_rollup_hourly.sql (run via scripts/cron/maintenance.sh)

## 6) API Surface (metrics endpoints)
Endpoints already defined in `docs/api-surface-mvp.md`:
- GET /kpi/summary
- GET /kpi/staff/:staffId

Recommended query params:
- tenantId (required)
- period: day|week|month
- from, to (ISO dates)
- tz (timezone)

Sample response (summary):
```
{
  "period": "day",
  "from": "2026-01-01",
  "to": "2026-01-31",
  "metrics": {
    "bookingSuccessRate": 98.7,
    "adminInterventionRate": 7.4,
    "utilizationRate": 72.1,
    "noShowRate": 2.1,
    "cancellationRate": 3.8,
    "repeatVisitRate": 18.6,
    "avgTicket": 2400,
    "inventoryVariancePct": 1.7,
    "feedbackAvg": 4.6,
    "feedbackCoverage": 82.0
  }
}
```

## 7) Observability (system health)
- Queue depth by tenant (Redis streams)
- Dead-letter count by queue
- Webhook error rate by channel
- STT/OCR error rate
- Cal.com/erxes API latency and error rate

## 8) Acceptance Criteria
- Each metric has a source table and aggregation rule.
- KPIs are available in /kpi endpoints within 24 hours.
- Admin intervention rate and booking success rate are visible per tenant.
