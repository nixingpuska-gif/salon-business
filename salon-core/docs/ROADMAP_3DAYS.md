# 3-Day Roadmap (Sprint Plan)
Date: 2026-01-27
Goal: deliver a stable, demonstrable "best-on-market" MVP slice in 3 days.

## Scope (realistic for 3 days)
- KPI analytics pipeline works end-to-end (DB + rollup + API).
- Mock E2E flow is stable and repeatable.
- Strict security modes documented and ready for production.
- Clear next steps for real integrations and compliance.

## Day 1 (Foundation + KPI)
Owner: Communicator + Coder
Deliverables:
- DB migrations applied (001–010).
- KPI rollup scripts runnable (daily + hourly).
- KPI endpoint returns metrics from rollups.
Success:
- /health -> 200
- /kpi/summary?tenantId=default&period=day -> 200 with metrics

Coder tasks:
- Verify rollup SQL correctness on local DB.
- Ensure booking_events writes exist in all booking flows.

Tester tasks:
- Run npm test + npm run build.
- Smoke test (mock) on docker instance.

## Day 2 (Automation coverage + stability)
Owner: Communicator + Coder + Tester
Deliverables:
- Mock E2E pass (webhooks + booking + queue + send).
- KPI rollups scheduled (Windows Task Scheduler).
- Check_kpi script verified.
Success:
- Smoke run passes on docker instance.
- KPI rollup jobs scheduled and run at least once.

Coder tasks:
- Add/adjust tests for strict inbound schema + idempotency.
- Fix any flakiness found by tester.

Tester tasks:
- Execute smoke in mock mode.
- Validate KPI endpoint after rollup.

## Day 3 (Best-on-market proof slice)
Owner: Communicator + Coder + Tester
Deliverables:
- Document "Best-on-market" proof points (metrics + automation coverage).
- Runbook for production deployment.
- Final audit status update.
Success:
- Updated docs/PRODUCT_VISION.md and docs/OKRS.md aligned with delivered slice.
- docs/FULL_AUDIT.md updated with readiness % and blockers.

Coder tasks:
- Minor polishing fixes if any regressions.

Tester tasks:
- Re-run npm test + smoke if any fixes landed.

## Out of Scope (after Day 3)
- Real provider credentials and real E2E (requires secrets).
- Compliance legal sign-off (152-FZ).
- Load tests at target scale.
