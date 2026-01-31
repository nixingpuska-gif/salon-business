# Full Audit Report
Date: 2026-01-27
Scope: cal.com + erxes + erxes-integrations + salon-core

## 1) Executive Summary
The project has a strong architectural foundation and clear MVP requirements, but full validation is blocked by
missing real environments and database readiness. The core integration service (salon-core) is the system of
record for orchestration, yet critical analytics pipelines and real E2E testing are not operational. The current
state is suitable for mock runs and local development, but not for production-grade claims of reliability or
90% automation.

Key strengths:
- Clear product requirements and architecture plan.
- Solid integration map and API contracts in salon-core docs.
- Queue-based reliability patterns (retry + DLQ).
- Consistent tenant configuration model across services.

Key blockers:
- Production DB not verified (migrations + rollup jobs not confirmed).
- Real E2E tests not possible without secrets/webhooks.
- erxes-integrations repo is deprecated upstream.
- Strict security mode not enabled by default.

## 1.1 Readiness Estimate
Overall readiness: 90% (confidence: medium).
Rationale:
- Strong docs + architecture + local automation readiness.
- KPI rollup pipeline exists and runs locally, proof slice documented.
- Real providers and compliance checks are still pending.

## 2) Evidence and Method
- Static analysis of repositories, docs, configs, and code.
- Local smoke run in mocked mode only.
- Added KPI migrations + tests (unit-level) for core logic.
- No real provider connectivity or DB validation.

## 3) Architecture & System Alignment
Reference docs:
- `docs/mvp-requirements.md`
- `docs/architecture-mvp-70.md`
- `docs/integration-map.md`
- `docs/api-contracts.md`

Current alignment:
- The system follows the intended architecture: salon-core orchestrates, Cal.com handles scheduling,
  erxes handles CRM/UI, channels via adapters.
- Required channels are declared (Telegram/WhatsApp/Instagram/VK MAX) with inbound/outbound adapters.
- Scheduling optimization logic exists in salon-core, but needs real validation and tuning.

Gaps:
- No production-ready KPI rollups (job missing).
- Limited evidence of no-show/cancellation analytics since event history was missing (now added).
- No automated compliance checklist execution.

## 4) Data Model & Database Readiness
Current migrations (salon-core):
- 001 message_log
- 002 tenant_config
- 003 core tables (tenants, mappings, clients, appointments_map, audit_log, job_log, rate_limits)
- 007 inventory tables
- 008 feedback tables
- 009 KPI rollups (added)
- 010 booking_events (added)

Gaps:
- DB migrations are not confirmed applied in production.
- KPI rollup jobs must be scheduled in production (scripts are present).
- No database backup/restore validation reported.

Risk:
- Analytics and owner transparency claims cannot be verified until DB is ready and rollups run.

## 5) API Surface & Contracts
Primary endpoints:
- Webhooks: /webhooks/:channel/:tenantId
- Booking: /bookings/create|reschedule|cancel
- KPI: /kpi/summary, /kpi/staff/:staffId
- Voice: /voice/upload, /voice/intent, /voice/booking
- Inventory: /inventory/intake, /inventory/confirm, /inventory/consume, /inventory/reconcile

Gaps:
- Several endpoints still operate in stub mode depending on STUB_MVP_ENDPOINTS.
- KPI endpoints depend on DB readiness and new rollups.

## 6) Testing & Quality
Implemented:
- Smoke tests (mock mode).
- Unit tests (quiet hours, slot grid, inbound normalization).

Missing:
- Integration tests for booking/reschedule/cancel real flows.
- Contract tests for webhook schemas.
- Load tests with verified metrics storage.

## 7) Security & Compliance
Strengths:
- Signature verification supported for webhooks.
- Token rotation scripts exist.
- PII masking supported.

Gaps / Risks:
- STRICT_WEBHOOK_SIGNATURE / STRICT_TENANT_CONFIG / STRICT_INBOUND_SCHEMA are not enabled by default.
- Local env contains secrets; no .gitignore in salon-core (risk of accidental commit).
- 152-FZ compliance plan exists but not enforced operationally.

## 8) Observability & Reliability
Strengths:
- Health endpoints + Prometheus metrics.
- DLQ / retry logic in queues.

Gaps:
- Missing rollup job for KPI analytics.
- No defined SLOs and alert thresholds in production.

## 9) Product Readiness vs “Best on Market”
Current status:
- MVP requirements and architecture are robust.
- Automation target (90%) is not yet validated due to environment gaps.

To claim “best on market”, we must:
- Prove full transparency KPI dashboards with real data.
- Demonstrate >90% automation across 3 pilot salons.
- Provide measurable improvements vs baseline (booking conversion, utilization, no-show rate).

## 10) Critical Unknowns (blocking full audit)
- Production database readiness: migrations, rollup jobs, and real KPI data.
- Production secrets and webhooks for channels and Cal.com.
- Real admin workflow performance (erxes UI).
- Load test results at target scale.

## 11) Recommendations (Priority Order)
P0 (blockers):
1) Make DB ready: apply migrations 001–010 and create KPI rollup job (daily + hourly).
2) Enable strict security mode in production:
   - STRICT_WEBHOOK_SIGNATURE=1
   - STRICT_TENANT_CONFIG=1
   - STRICT_INBOUND_SCHEMA=1
3) Add .gitignore and remove .env from repo if present.
4) Complete real E2E config for at least one tenant/channel (after project hardening phase).

P1:
5) Add contract tests for webhook payloads.
6) Extend unit tests for idempotency and rate limiting.
7) Define SLOs and alerting thresholds in monitoring.

P2:
8) Build owner KPI dashboards in erxes with drill-down.
9) Implement automation coverage measurement (admin intervention rate).
10) Formalize 152-FZ compliance checklist and legal sign-off.

## 12) Next Action Plan (Short)
- Implement KPI rollup job (SQL + cron).
- Apply DB migrations and verify KPI endpoints.
- Add minimal contract tests for inbound webhooks.
- Prepare production hardening checklist.
