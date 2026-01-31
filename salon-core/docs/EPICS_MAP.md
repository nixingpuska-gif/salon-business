# Epics Map: From Vision to MVP Backlog
Date: 2026-01-26

This document maps the product vision to concrete epics and existing backlog items.
Source of truth: `docs/backlog-mvp-70.md` and `docs/backlog-mvp-70-sprints.md`.

## Epic E1: Platform Readiness and Safety (P0)
Scope:
- Tenant config end-to-end (erxes UI -> salon-core DB)
- Webhook signature validation + tenant allowlist
- Queue reliability (retry + dead-letter + metrics)
- Idempotency audit for write endpoints
Backlog refs:
- Phase 0 in `docs/backlog-mvp-70-sprints.md`
Success criteria:
- Tenant config saved via UI and applied in live flow
- All queues report healthy with no duplicate processing

## Epic E2: Scheduling Optimization (P0)
Scope:
- Slot grid enforcement
- Slot rounding rules
- Slot scoring (gap minimization + off-peak bonus)
- Policy flags per tenant
Backlog refs:
- P0.A in `docs/backlog-mvp-70.md`
- Phase 1 in `docs/backlog-mvp-70-sprints.md`
Success criteria:
- Only grid-aligned slots are offered
- Capacity simulation meets or exceeds baseline schedule

## Epic E3: Omnichannel Automation (P0)
Scope:
- MAX, WhatsApp, Instagram, Telegram adapters
- Strict inbound validation
- Outbound send with retry + dead-letter
Backlog refs:
- P0.B in `docs/backlog-mvp-70.md`
- Phase 2 in `docs/backlog-mvp-70-sprints.md`
Success criteria:
- End-to-end flow works for each channel

## Epic E4: Voice to Booking (P0)
Scope:
- Voice upload + storage
- STT integration (cheapest at scale)
- Intent extraction + follow-up dialog
Backlog refs:
- P0.C in `docs/backlog-mvp-70.md`
- Phase 2 in `docs/backlog-mvp-70-sprints.md`
Success criteria:
- Voice note creates booking without manual input

## Epic E5: Inventory Automation (P0)
Scope:
- OCR intake -> draft -> confirm
- Append-only ledger
- Auto-consumption and reconciliation
Backlog refs:
- P0.D in `docs/backlog-mvp-70.md`
- Phase 3 in `docs/backlog-mvp-70-sprints.md`
Success criteria:
- Intake, consumption, reconciliation produce correct ledger deltas

## Epic E6: Owner Transparency + KPI (P0)
Scope:
- Feedback request + submission
- KPI rollups (daily/weekly/monthly)
- Owner dashboard with drill-down
- Loss attribution
Backlog refs:
- P0.E in `docs/backlog-mvp-70.md`
- Phase 4 in `docs/backlog-mvp-70-sprints.md`
Success criteria:
- Owner sees staff performance and revenue breakdown with drill-down

## Epic E7: Compliance and Upgrades (P0)
Scope:
- Backward-compatible migrations
- Audit trail for financial + inventory events
- Price list versioning
- 152-FZ checklist and data localization plan
Backlog refs:
- P0.F and P0.G in `docs/backlog-mvp-70.md`
- Phase 5 in `docs/backlog-mvp-70-sprints.md`
Success criteria:
- Upgrade test shows no data loss
- Compliance checklist approved by legal

## Epic E8: MVP Hardening (P1)
Scope:
- Tenant onboarding wizard
- Rate limiting per tenant/channel
- SLO monitoring
- Automated load tests (10-20x peak)
Backlog refs:
- P1 in `docs/backlog-mvp-70.md`

## Dependencies (global)
- External credentials for channels
- Cal.com API v2 availability
- erxes core-api + UI operational

