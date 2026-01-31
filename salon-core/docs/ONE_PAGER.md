# One-Pager: Salon Automation OS
Date: 2026-01-27

## What it is
An operating system for salon owners that provides full transparency over revenue and performance and automates routine admin work up to 90%.

## Who it’s for
- Owners: full visibility, accountability, and loss control.
- Admins: faster booking and fewer manual actions.
- Staff: clear schedules and fewer operational interruptions.

## Why it’s best on market
- **Transparent analytics**: revenue, cancellations, no-shows, utilization, repeat visits.
- **Automation-first**: inbound → booking → reminders without manual steps.
- **Scheduling optimization**: slot grid + capacity packing + off-peak shaping.
- **Inventory automation**: OCR intake, ledger-based consumption, reconciliation.

## Current proof (mock + local DB)
- KPI pipeline works end-to-end (rollups + API).
- Mock E2E flow works (webhook → booking → queue → send).
- Scheduling rules verified by tests.

## Proof checklist (5 minutes)
1) Health:
   - `GET /health` → 200
2) KPI:
   - `GET /kpi/summary?tenantId=default&period=day`
3) Smoke:
   - `npm run smoke:gitbash` (mock mode)

## Next proof (real evidence)
Use `docs/REAL_EVIDENCE_PLAN.md` to run real E2E with secrets.

## KPI targets (north-star)
- Admin intervention rate < 10%
- Booking success > 99%
- Utilization +10% vs baseline
- Inventory variance visible within 24 hours

