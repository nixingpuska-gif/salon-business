# Product Vision: Salon Automation OS
Date: 2026-01-26

## Vision
Build the most advanced operating platform for service business owners, providing full transparency over revenue, performance, and losses while automating routine work so that up to 90% of admin tasks can be replaced by the system.

## Target Users
- Owner: full visibility, financial control, and accountability.
- Administrator: fast booking, client handling, and daily operations without manual busywork.
- Staff: clear schedules, reminders, and minimal operational friction.

## North Star Outcomes
- 90% automation of routine admin work (goal).
- >95% booking completion rate with minimal manual intervention.
- Owner can answer "who/what/when/where/why" for revenue and losses in <2 minutes.

## Differentiators (Best-on-Market)
- Transparent, drill-down analytics for revenue, staff performance, cancellations, no-shows, repeat visits.
- Scheduling optimization that maximizes daily capacity (slot grid + packing + off-peak shaping).
- Voice-to-booking in channels with intent detection.
- Inventory automation with OCR intake, ledger-based consumption, and reconciliation.
- Unified multichannel customer journey: MAX, WhatsApp, Instagram, Telegram.

## Core Principles
- Automation first: humans are exceptions, not the default.
- Auditability: every financial and inventory event is traceable.
- Reliability at scale: 10k concurrent sessions without data loss.
- Privacy and compliance: 152-FZ and data localization by design.
- Simple for operators: one coherent system, not many tools.

## Key Capabilities (MVP must-have)
1) Multichannel inbound/outbound (no SMS).
2) Voice messages: STT -> intent -> booking.
3) Scheduling optimization (grid, rounding, packing, off-peak shaping).
4) Owner transparency KPIs (revenue, cancellations, no-shows, utilization, repeat visits).
5) Inventory automation (OCR intake, consumption, reconciliation).
6) Safe upgrades, immutable audit trail, versioned price lists.
7) Compliance with 152-FZ and RU data localization.

## Automation Coverage (Target 90%)
- Booking and rescheduling: automated.
- Client confirmation/reminders: automated.
- Post-service feedback: automated.
- Inventory consumption and reconciliation: automated.
- KPI reporting and alerts: automated.
- Exceptions: manual only when data is missing or customer requests complex changes.

## Success Criteria
- All MVP requirements implemented and tested (see `docs/mvp-requirements.md`).
- Load tests executed at target scale with documented results.
- At least 3 pilot salons demonstrate full owner transparency and reduced admin workload.
- Admin operational time reduced by >= 70% (MVP), aiming for 90% with optimization.

## Out of Scope (MVP)
- SMS channel.
- Payment processing and accounting systems beyond current integration.

## Implementation Phases (High-level)
S1 Real test readiness (secrets, webhooks, tenant config, mocks disabled).
S2 Real E2E validation (booking, CRM sync, outbound, voice, inventory, feedback).
S3 Hardening & compliance (monitoring, 152-FZ checklist, safety gates).
S4 Scale and launch readiness (load tests, SLOs, rollback plan).

## Risks
- External providers (Cal.com, erxes, channels) limit reliability.
- Lack of real E2E tests hides integration defects.
- Compliance and data localization require legal sign-off.
