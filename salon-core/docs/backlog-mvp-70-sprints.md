# MVP Backlog Breakdown and Sequencing (2026-01-26)

This document expands `docs/backlog-mvp-70.md` into ordered work packages.
All P0 items must be delivered to accept MVP.
Estimates are in points (S=1, M=3, L=5, XL=8) and assume a 2-4 engineer team.

## Phase 0: Platform Readiness (P0)
- Tenant config end-to-end (erxes UI -> salon-core DB) [M]
- Channel webhook signature validation + tenant allowlist [M]
- Queue reliability: retry + dead-letter + metrics [M]
- Idempotency audit for all write endpoints [M]
Acceptance:
- Tenant config saved via UI and applied in live flow.
- All queues report healthy + no duplicate processing.

## Phase 1: Scheduling Optimization (P0)
- Slot grid enforcement in suggestion + booking [L]
- Slot rounding rules (duration + buffer + grid) [M]
- Slot scoring (gap minimization + off-peak bonus) [L]
- Policy flags per tenant (grid size, off-peak bonus) [M]
Acceptance:
- Any request for non-grid time returns only aligned slots.
- Daily capacity in simulation >= baseline schedule.

## Phase 2: Channels + Voice Booking (P0)
- MAX adapter (inbound/outbound) [L]
- WhatsApp adapter (inbound/outbound) [L]
- Instagram adapter (inbound/outbound) [L]
- Telegram adapter (inbound/outbound) [M]
- Voice upload endpoint + storage [M]
- STT service integration (cheapest at volume) [L]
- Intent extraction + follow-up dialog [L]
Acceptance:
- Voice note can create a booking without manual admin input.
- All channels pass end-to-end flow tests.

## Phase 3: Inventory Automation (P0)
- Inventory catalog + norms per service [M]
- Intake flow (photo -> OCR draft -> confirm) [L]
- Inventory ledger (append-only) [M]
- Auto-consumption on service completion [L]
- Reconciliation + variance workflow [M]
Acceptance:
- Intake, consumption, and reconciliation produce correct ledger deltas.

## Phase 4: Owner Transparency + KPI (P0)
- Feedback request after service + submission [M]
- KPI rollups (daily/weekly/monthly) [L]
- Owner dashboard (revenue, utilization, staff KPI) [L]
- Loss attribution (inventory variance + cancellations) [M]
Acceptance:
- Owner can see staff performance and revenue breakdown with drill-down.

## Phase 5: Reliability + Compliance (P0)
- Backward-compatible migrations strategy [M]
- Price list versioning + historical integrity [M]
- Audit logs for financial/inventory events [M]
- 152-FZ compliance checklist + data localization plan [L]
Acceptance:
- Upgrade test shows no data loss.
- Compliance checklist approved by legal.

## Dependencies
- External channel credentials (MAX/WhatsApp/Instagram/Telegram).
- Cal.com API v2 availability.
- erxes core-api + UI operational.

## Notes
- The ordering above is critical path. Phases can overlap if dependencies are met.
- Any missing P0 item = MVP not accepted.
