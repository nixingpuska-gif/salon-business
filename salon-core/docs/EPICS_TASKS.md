# Epics → Tasks Breakdown (MVP + Best-on-Market)
Date: 2026-01-26

This document expands `docs/EPICS_MAP.md` into actionable tasks with estimates.
Estimates: S=1, M=3, L=5, XL=8.

## E1 Platform Readiness and Safety (P0)
Tasks:
- E1.1 Tenant config UI -> DB flow (erxes plugin save + salon-core API) [M]
- E1.2 Strict webhook signature validation + tenant allowlist [M]
- E1.3 Idempotency audit: enforce required keys on write endpoints [M]
- E1.4 Queue reliability: retry/backoff + dead-letter metrics [M]
- E1.5 Admin tokens + per-tenant access roles [S]
Dependencies: erxes core-api + plugin wiring
Acceptance: tenant config saved via UI and applied in live flow

## E2 Scheduling Optimization (P0)
Tasks:
- E2.1 Slot grid enforcement in suggest + booking [L]
- E2.2 Slot rounding rules (duration + buffer + grid) [M]
- E2.3 Slot scoring (gap minimization + off-peak bonus) [L]
- E2.4 Per-tenant policy flags and defaults [M]
- E2.5 Simulation tests for capacity baseline [M]
Dependencies: Cal.com slot API v2
Acceptance: offered slots are grid-aligned and capacity >= baseline

## E3 Omnichannel Automation (P0)
Tasks:
- E3.1 MAX inbound adapter + signature validation [L]
- E3.2 MAX outbound sender + retry + DLQ [L]
- E3.3 WhatsApp inbound/outbound integration [L]
- E3.4 Instagram inbound/outbound integration [L]
- E3.5 Telegram inbound/outbound integration [M]
Dependencies: channel credentials + webhook setup
Acceptance: end-to-end flow per channel

## E4 Voice to Booking (P0)
Tasks:
- E4.1 Voice upload + storage (multipart + base64) [M]
- E4.2 STT integration (provider abstraction + cheapest selection rule) [L]
- E4.3 Intent extraction + slot selection [L]
- E4.4 Follow-up dialog for missing fields [L]
Dependencies: STT provider availability
Acceptance: voice note can create booking without admin intervention

## E5 Inventory Automation (P0)
Tasks:
- E5.1 Inventory catalog + service norms [M]
- E5.2 Intake OCR -> draft -> confirm [L]
- E5.3 Append-only ledger with audit trail [M]
- E5.4 Auto-consumption on service completion [L]
- E5.5 Reconciliation and variance reporting [M]
Dependencies: OCR provider and DB migrations (007)
Acceptance: ledger + reconciliation produce correct deltas

## E6 Owner Transparency + KPI (P0)
Tasks:
- E6.1 Feedback request + submit pipeline [M]
- E6.2 KPI rollups (daily/weekly/monthly) [L]
- E6.3 Owner dashboard (erxes UI) [L]
- E6.4 Loss attribution (inventory variance + cancellations) [M]
Dependencies: KPI schema + metrics spec
Acceptance: drill-down KPI visible for owner

## E7 Compliance and Upgrades (P0)
Tasks:
- E7.1 Backward-compatible migration strategy [M]
- E7.2 Audit log coverage for financial/inventory events [M]
- E7.3 Price list versioning rules [M]
- E7.4 152-FZ checklist + data localization plan [L]
Dependencies: legal review
Acceptance: upgrade test with no data loss, compliance checklist signed off

## E8 MVP Hardening (P1)
Tasks:
- E8.1 Tenant onboarding wizard [M]
- E8.2 Per-tenant/channel rate limits [S]
- E8.3 SLO monitoring + alerts [M]
- E8.4 Load tests at 10-20x peak [L]
Dependencies: metrics + monitoring pipeline

## E9 Best-on-Market Differentiators (P1/P2)
Tasks:
- E9.1 Off-peak incentives engine (dynamic suggestions) [M]
- E9.2 Admin “zero-touch day” mode (auto-approval + auto-rebook) [L]
- E9.3 Owner “loss radar” alerts (inventory anomalies + no-show spikes) [M]
- E9.4 Staff coaching insights (repeat visit + rating trends) [M]
Dependencies: KPI rollups + events instrumentation

## Critical Path (high-level)
E1 -> E2 -> E3/E4 -> E5 -> E6 -> E7 -> E8 -> E9

## Notes
- Tasks map to backlog in `docs/backlog-mvp-70.md` and `docs/backlog-mvp-70-sprints.md`.
- Any missing P0 item blocks MVP acceptance.
