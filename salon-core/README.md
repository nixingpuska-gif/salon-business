# salon-core

Glue service for SalonHELP. Provides tenant mapping, idempotency, rate limits, webhook intake, and integration between Cal.com and erxes.

## What this repo is
- Source of truth for tenant mapping (erxes brand_id ↔ cal.com team_id)
- Webhook intake for TG/VK/IG/WA
- Queue orchestration (TX vs MK)
- Idempotency and rate limiting
- Audit logging hooks

## What this repo is NOT
- The booking engine (Cal.com does that)
- The CRM UI (erxes does that)

## Quick start (dev)
1) Copy `.env.example` → `.env`
2) Install deps: `npm install`
3) Run: `npm run dev`
4) Start sender worker: `npm run worker:sender`
5) Start tx worker: `npm run worker:tx`
6) Start mk worker: `npm run worker:mk`
7) Start reminder worker: `npm run worker:reminder`

## Channel adapters
- Telegram uses `TELEGRAM_BOT_TOKEN` (or `TELEGRAM_SEND_URL` override)
- WhatsApp uses `WHATSAPP_TOKEN` + (`WHATSAPP_API_BASE` + `WHATSAPP_PHONE_ID`) or `WHATSAPP_SEND_URL`
- Instagram uses `INSTAGRAM_SEND_URL` + `INSTAGRAM_TOKEN`
- VK Max uses `VKMAX_SEND_URL` + `VKMAX_TOKEN`

## Per-tenant bots
If each salon has its own bot/token, set `TENANT_CONFIG_PATH` to a JSON file.
salon-core resolves credentials in this order:
1) send payload `metadata`
2) tenant config file (by `tenantId`)
3) global env vars

Example: `docs/tenant-config.example.json`

## Per-tenant webhook secrets
For inbound webhooks, the signature secret is resolved as:
1) tenant config (`TENANT_CONFIG_PATH`) by `tenantId` + channel
2) global env secret (e.g., `TELEGRAM_WEBHOOK_SECRET`)

Strict mode:
- Set `STRICT_WEBHOOK_SIGNATURE=1` to reject requests without a resolved secret.

## Tenant mapping enforcement
- Set `STRICT_TENANT_CONFIG=1` to reject requests for unknown tenants.
- Tenant config can include per-tenant Cal.com and erxes credentials.

## Tenant config storage (DB)
- Set `TENANT_CONFIG_SOURCE=db` (or `auto` with DATABASE_URL) to store tenant config in Postgres.
- Admin endpoints require `ADMIN_API_TOKEN`:
  - GET `/tenants/:tenantId/config`
  - PUT `/tenants/:tenantId/config`
  - DELETE `/tenants/:tenantId/config`
 - Per-tenant roles can be set in tenant config: `access.ownerTokens` / `access.staffTokens`

## Integration allowlist
- If `erxes.integrationIds` is set in tenant config, inbound messages accept only those integrationIds.

## Cal.com webhooks
- Endpoint: `/webhooks/calcom/:tenantId?`
- If a webhook reports a terminal status (cancelled/rescheduled), reminders for that booking are cleared.
- If a webhook reports created/confirmed and includes `metadata.channel`, `metadata.to`, and `start`, reminders are scheduled.

## Inbound normalization
- salon-core normalizes common WhatsApp/Instagram/VK/Telegram webhook shapes into `message`, `messageId`, `phone`, `name`.
- If a channel does not provide phone/email, you can enable synthetic contacts:
  - `ALLOW_SYNTHETIC_CONTACT=1`
  - `SYNTHETIC_CONTACT_DOMAIN=salonhelp.local`

## Strict inbound schema
- Set `STRICT_INBOUND_SCHEMA=1` to reject malformed inbound payloads.

## Log redaction
- Enable `MASK_PII_LOGS=1` to mask phone/email/name/tokens in logs.
- Optional: `MASK_MESSAGE_CONTENT=1` to mask message bodies in logs.

## Logging
- JSONL logs written to `LOG_DIR` (default: `logs/`)

## Docs
See `docs/` for integration map, API contracts, queues, and deployment notes.
