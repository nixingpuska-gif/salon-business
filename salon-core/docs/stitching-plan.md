# Stitching Plan (2026-01-25)

## Scope and Success Criteria
- All channels supported: Telegram, VK Max, Instagram, WhatsApp.
- Inbound message -> booking -> CRM sync -> outbound confirmation/reminders works end-to-end.
- Multi-tenant isolation enforced across all flows.
- Admin UI in erxes can manage tenant config in salon-core.
- Production deployable with repeatable build + run steps.

## Must-Keep Repos
- cal.com (booking engine)
- erxes (CRM + UI)
- salon-core (glue/orchestration)
- erxes-integrations is deprecated; use integrations inside erxes instead.

## Strategy
- Polyrepo + gateway (salon-core as glue/BFF).
- Reasons: different stacks, fastest integration path, lowest integration risk.

## Inventory Summary
- cal.com: Node.js, Next.js, tRPC, Prisma, Postgres, Yarn, Docker.
- erxes: Nx monorepo, Node/TS, GraphQL federation, MongoDB/Redis/Elastic, pnpm, module federation.
- salon-core: Node/TS, Express, Redis + Postgres, queue/workers; no Dockerfile/CI yet.
- erxes-integrations: deprecated.

## Source of Truth
- Booking and availability: cal.com
- CRM, contacts, campaigns: erxes
- Tenancy mapping + orchestration: salon-core

## Auth and Tenancy
- Tenant mapping: tenantId (salon-core) <-> brandId (erxes) <-> teamId (cal.com).
- Tenant config stored in DB or file; DB preferred for prod.
- Enforce strict modes in prod: STRICT_TENANT_CONFIG=1, STRICT_WEBHOOK_SIGNATURE=1.
- erxes salonhelp UI proxies to salon-core for tenant config CRUD.

## Integration Order (Safe Path)
1. Tenant config storage (DB) and admin access controls.
2. Webhooks (TG/VK/IG/WA + cal.com) with strict signature validation.
3. Cal.com booking creation + reminders.
4. erxes contact upsert + widgetsInsertMessage.
5. Outbound sender + queues + rate limiting.
6. Campaign/marketing flow routing.
7. Ops hardening: CI, containers, logging/metrics, alerts.
8. E2E smoke tests for all channels.

## Risks and Mitigations
- Queue reliability: BLPOP has no ack; move to Redis Streams or add visibility/ack pattern.
- Data model mismatch: only message_log and tenant_config are implemented; either add migrations or update spec.
- Security defaults: strict modes off by default; enable in prod.
- Observability: local JSONL logs only; add centralized logs + metrics.
- Secrets: manage with a vault/secret manager and rotation.

## Validation Checklist
- Inbound message -> booking -> CRM sync -> outbound confirmation.
- Reminder scheduling honors quiet hours and time zones.
- Rate limit and idempotency enforced per tenant.
- No cross-tenant data leakage in webhooks or API.

## Roadmap
- See `docs/roadmap-real-tests.md` for the real-test readiness plan.
