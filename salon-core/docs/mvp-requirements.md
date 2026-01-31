# MVP Product Requirements: 70% Salon Automation (2026-01-26)

Purpose: a single, non-negotiable reference for agents and developers. If any item below is missing, the MVP is considered a failure.

Related architecture plan: `docs/architecture-mvp-70.md`
Related backlog: `docs/backlog-mvp-70.md`
Related backlog breakdown: `docs/backlog-mvp-70-sprints.md`
Related load test plan: `docs/load-test-plan.md`
Load test scripts: `scripts/loadtest/README.md`
Related data model: `docs/data-model-mvp.md`
Related API outline: `docs/api-surface-mvp.md`
OpenAPI spec: `docs/openapi-mvp.yaml`

## 1) Core Business Goal
Provide at least 70% automation of salon business operations, not just scheduling or messaging.
The owner must have full transparency into processes, money flow, and staff performance.
Only the physical work of masters (service delivery) remains manual.

## 2) Scale Targets (MVP + Future)
MVP capacity targets:
- Active salons (concurrent): ~1,000
- Bookings per salon per day: ~300 (assume bookings)
- Messages per booking: 3-4
- Total outbound messages/day: ~1.2M
- Peak load: design for 10-20x average

Future target:
- System must be able to scale to 10,000 concurrent sessions without data loss.

## 3) Channels (No SMS)
Required channels in MVP:
- MAX (https://max.ru/), WhatsApp, Instagram, Telegram
- Inbound + outbound for all listed channels
- Voice message support: user can send a voice note, system must recognize intent and create a booking
  - STT provider selection rule: choose the lowest total cost per minute at target volume.
  - Default direction: self-hosted STT if cheaper than managed APIs at scale.

Explicitly out-of-scope for MVP:
- SMS (not used in RU market)

## 4) Scheduling Optimization (Non-negotiable)
Problem: idle hours and inefficient time slots reduce revenue.
Required behavior:
- Off-peak demand shaping: promote morning/late slots with incentives or dynamic suggestions.
- Slot grid enforcement: no bookings at arbitrary minutes (e.g., 09:17). Only aligned grid slots allowed.
- Slot rounding rules: align to service duration + cleanup buffer and a consistent grid (e.g., 10/15 min).
- Capacity packing: scheduling logic must maximize daily throughput and minimize gaps.
- Reject or auto-shift suboptimal slots when it would reduce total daily capacity.

## 5) Owner Transparency & Quality Control
Owner must see:
- Revenue, cancellations, no-shows, repeat visits, and real utilization per day/week/month.
- Staff performance: ratings, rebook rate, average ticket, cancellations.
- Ability to answer ad-hoc business questions with drill-down (who/what/when/where).
Required automation:
- Post-service feedback requests (rating + comment) after each service.
- KPI dashboard for owner with drill-down to staff, service, and time window.

## 6) Inventory Automation (Non-negotiable)
Required features:
- Inbound supply registration by photo (OCR -> draft -> confirm).
- Automatic consumption based on service execution.
- Stock reconciliation: detect differences between expected vs physical counts.
- If differences are due to system errors, system must allow correction and keep audit trails.

## 7) Data Safety & Updates (Non-negotiable)
SaaS updates must be safe:
- No data loss during upgrades.
- Backward-compatible migrations or controlled rolling upgrades.
- Immutable audit trail for key financial and inventory events.
- Pricing data integrity: versioned price lists and no loss of historical prices.

## 8) Compliance: 152-FZ (RU)
The platform must comply with Russian personal data law (152-FZ) and localization requirements.
Minimum compliance checkpoints:
- Operator obligations and security measures must be implemented (organizational + technical).
- If required, notify Roskomnadzor before processing personal data.
- Data localization: primary storage of Russian citizens' personal data must be in Russia (per 242-FZ amendments).

Note: this section requires a legal review before production.

## 9) MVP Definition of Done
MVP is accepted only when:
- All items in sections 3-8 are implemented and tested.
- Load tests at target scale are executed and documented.
- Owner dashboard demonstrates full transparency for at least 3 pilot salons.
