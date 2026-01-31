# Architecture Plan: MVP 70% Salon Automation (2026-01-26)

This document defines the target architecture for MVP and the path to 10k concurrent sessions.
It is derived from `docs/mvp-requirements.md` and is non-negotiable.

## 1) Goals and Constraints
- MVP removes 70% of salon business routine (not only scheduling).
- Full owner transparency (money, staff performance, inventory, losses).
- Channels: MAX (https://max.ru/), WhatsApp, Instagram, Telegram. No SMS.
- Voice messages: STT -> intent -> booking.
- Scheduling optimization: slot grid + packing + off-peak shaping.
- Inventory: OCR intake, auto-consumption, reconciliation and audit trail.
- 10k concurrent sessions capability.
- Safe upgrades with zero data loss.
- 152-FZ compliance (data localization in RU; legal review required).

## 2) Recommended Architecture (Default Option)
Event-driven modular architecture with a central orchestration service (salon-core) and workers.
Keep Cal.com and erxes as external products integrated via API. Do NOT merge codebases.

### Core services
- API Gateway / Ingress: validates auth, tenant, and rate limits.
- salon-core API: business logic + orchestration + tenant config.
- Scheduler Engine: slot grid, packing, off-peak suggestions.
- Messaging Workers: outbound queue + retries + dead-letter.
- Inbound Normalizer: channel adapters + strict validation.
- CRM Sync: contact + conversation sync to erxes.
- Booking Adapter: Cal.com API v2 integration.
- Inventory Service: stock ledger, intake, auto-consumption, reconciliation.
- OCR Service: file intake -> OCR -> structured draft -> human confirm.
- Analytics/KPI Service: owner dashboards, staff performance, losses.
- STT Service: voice -> text -> intent classification.

### External systems
- Cal.com (self-hosted): booking + availability.
- erxes (self-hosted): CRM + owner/admin UI.
- Channel providers: MAX, WhatsApp, Instagram, Telegram.

## 3) Data Stores
- Postgres (salon-core): core entities, queues metadata, inventory ledger, pricing history.
- Redis Streams: queues (tx/mk/sender/reminder), rate limits, idempotency.
- Object storage (S3 compatible): uploads (voice, inventory documents, photos).
- erxes MongoDB: CRM data (contacts, conversations).

## 4) Key Data Models (salon-core)
- tenant
- staff
- service_catalog
- price_list (versioned)
- booking (synced from Cal.com)
- client
- message_log
- inventory_item
- inventory_ledger (immutable append-only)
- stock_snapshot (for reconciliation)
- feedback (rating/comment)
- kpi_rollups (daily/weekly/monthly)

## 5) Core Flows (text diagram)

Inbound message -> normalize -> intent ->
  if booking intent -> Scheduler Engine -> Cal.com booking -> confirm ->
  CRM sync (erxes) -> message send -> feedback schedule

Inventory intake -> OCR -> draft -> human confirm -> inventory_ledger
Service completed -> auto-consumption -> inventory_ledger -> KPI update
Inventory count -> compare ledger -> reconciliation -> variance report

## 6) Scheduling Optimization Logic
- Slot grid: only aligned slots (e.g., 10/15 min) with cleanup buffer.
- Rounding: if user asks 09:17, auto suggest 09:15/09:30.
- Packing: choose slots that maximize daily capacity.
- Off-peak shaping: show morning/late slots as top suggestions; optional incentives.

Heuristic approach (MVP):
- Precompute available slots by service duration + buffer.
- Score slots by:
  - gap minimization (fill smallest gaps first)
  - load balancing (avoid uneven idle blocks)
  - off-peak bonus
- Only offer slots above threshold.

## 7) Voice Booking (STT + Intent)
- Inbound voice -> store file -> STT -> intent classifier.
- If booking intent: extract date/time/service/staff.
- If missing fields: ask clarification.
- STT provider rule: cheapest cost per minute at target volume.
- Default direction: self-hosted STT if cheaper than managed APIs.

## 8) Inventory Automation
- Intake by photo:
  - OCR -> parse items -> draft -> human confirm.
- Auto-consumption:
  - service -> consume items by norm -> ledger append.
- Reconciliation:
  - physical count vs ledger -> variance report.
  - corrections logged with reason and actor.

## 9) Owner Transparency
- KPIs: revenue, cancellations, no-shows, repeat visits, avg ticket.
- Staff: ratings, rebook rate, cancellations, utilization.
- Losses: variance in inventory, revenue leakage points.
- Feedback: rating + text after each service.

## 10) Scale and Capacity
Target: 10k concurrent sessions.
- All APIs stateless; horizontal scaling.
- Queue workers scale independently.
- Redis cluster for streams if needed.
- Rate limits per tenant + channel.
- Load tests must simulate 10-20x peak message rate.

## 11) Reliability and Upgrades
- Backward-compatible migrations (expand/contract).
- Write-ahead audit for financial + inventory events.
- Safe deployment: rolling + canary.
- Backups for Postgres/Mongo/Redis.

## 12) Observability
- Structured logs with tenantId + correlationId.
- Metrics: queue depth, send latency, booking success rate, OCR accuracy.
- Alerts: failed sends, high retry rate, booking failures.

## 13) Compliance (152-FZ)
- Data localization in RU.
- Access controls + audit logs.
- Encryption at rest and in transit.
- Legal review before production launch.

## 14) MVP Implementation Phases (high-level)
Phase A: Scheduling optimization + channels + feedback.
Phase B: Inventory OCR + auto-consumption + reconciliation.
Phase C: Owner analytics/KPI + loss attribution.
Phase D: Scale tests + compliance hardening.

Definition of Done:
- Meets requirements in `docs/mvp-requirements.md`.
- Load tests at target scale documented.
- Pilot salons validate transparency and automation.
