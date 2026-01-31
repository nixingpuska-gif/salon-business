# MVP Backlog: 70% Salon Automation (2026-01-26)

This backlog is ordered and non-negotiable. If any P0 item is missing, MVP is not accepted.
All items map to `docs/mvp-requirements.md` and `docs/architecture-mvp-70.md`.
Breakdown and sequencing: `docs/backlog-mvp-70-sprints.md`

## P0 (MVP must-have)
### A) Scheduling Optimization
- Slot grid enforcement (no arbitrary minutes).
  - Accept only aligned slots (e.g., 10/15 min grid).
  - Auto-suggest nearest valid slots if user requests 09:17.
- Capacity packing (maximize daily throughput).
  - Scoring algorithm that minimizes gaps.
  - Auto-shift or reject suboptimal slots that reduce total capacity.
- Off-peak shaping.
  - Promote morning/late slots in suggestions.
  - Optional incentives (discount flag or bonus).

Acceptance:
- For a given day and service duration, offered slots are only grid-aligned.
- Suggested slots produce >= baseline daily capacity in simulation.

### B) Channels (Inbound + Outbound)
- MAX (https://max.ru/), WhatsApp, Instagram, Telegram adapters.
- Strict inbound validation by tenant + signature.
- Outbound send with retry + dead-letter.

Acceptance:
- End-to-end message flow works for each channel (inbound -> booking -> outbound).

### C) Voice Booking (STT + Intent)
- Store voice file -> STT -> intent detection -> booking.
- If missing fields, ask follow-up questions.
- STT provider rule: lowest total cost per minute at target volume.
- Default: self-hosted STT if cheaper than managed APIs.

Acceptance:
- Voice message can create a booking without manual input.

### D) Inventory Automation
- OCR intake (photo -> OCR -> draft -> confirm).
- Auto-consumption on service completion.
- Reconciliation workflow with variance detection and audit log.

Acceptance:
- Intake creates ledger entries, consumption updates stock, and reconciliation reports variance.

### E) Owner Transparency + KPI
- Owner dashboard with revenue, cancellations, no-shows, utilization.
- Staff performance: rating, rebook rate, avg ticket, cancellations.
- Post-service feedback request after each service.

Acceptance:
- Dashboard shows KPI for last 7/30 days with drill-down.

### F) Data Safety + Updates
- Backward-compatible migrations.
- Immutable audit trail for financial + inventory events.
- Price list versioning.

Acceptance:
- Upgrade test proves no data loss and historical prices preserved.

### G) Compliance (152-FZ)
- Data localization to RU.
- Access control, audit logs, encryption in transit and at rest.
- Legal review before production.

Acceptance:
- Compliance checklist signed off by legal.

## P1 (Should-have for MVP hardening)
- Tenant onboarding wizard (brand/integration creation, channel tokens).
- Rate limiting per tenant + per channel.
- SLO monitoring: booking success, send latency, queue depth.
- Automated load tests for peak 10-20x.

## P2 (Post-MVP / Phase 2)
- Dynamic pricing by demand (off-peak incentives).
- Advanced staff scheduling optimization.
- AI-based retention suggestions.
- Multi-branch inventory transfer.

## Dependencies
- External channel credentials and webhook setup.
- Cal.com API v2 availability.
- erxes running with salonhelp UI.

## Definition of Done
- All P0 items implemented and tested.
- Load tests at target scale completed.
- Pilot salons validate automation and transparency.
