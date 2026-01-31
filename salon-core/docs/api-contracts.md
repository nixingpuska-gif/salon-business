# API Contracts (salon-core)

## Health
- GET /health -> 200 { status: "ok" }
- GET /health/queues -> 200 { status, group, queues, reminders }
- GET /health/metrics -> 200 text/plain (Prometheus exposition)
  - Optional header: `x-health-token` (required if HEALTH_TOKEN is set)

## Webhooks (inbound)
- POST /webhooks/telegram/:tenantId?
- POST /webhooks/vkmax/:tenantId?
- POST /webhooks/instagram/:tenantId?
- POST /webhooks/whatsapp/:tenantId?

Each webhook must:
- Validate signature
- Resolve tenant
- Upsert client
- Enqueue message processing

Headers:
- `x-tenant-id` (or use `/:tenantId` path param)
- `x-signature` (HMAC SHA256 over raw body, hex)
- `x-erxes-integration-id` (required to create conversation)

Signature secret resolution order:
1) tenant config (`TENANT_CONFIG_PATH`) for this `tenantId` + channel
2) global env secret (e.g., `TELEGRAM_WEBHOOK_SECRET`)

Strict mode:
- If `STRICT_WEBHOOK_SIGNATURE=1`, requests without a resolved secret are rejected (401).

Tenant resolution:
- If `STRICT_TENANT_CONFIG=1`, any request without tenant config is rejected (401).
- Tenant config can carry per-salon Cal.com/erxes credentials.
- If `TENANT_FROM_HOST=1`, tenantId is resolved from subdomain if not provided.
- Optionally set `TENANT_HOST_SUFFIX` to extract subdomain from a known base domain.

IntegrationId allowlist:
- If tenant config includes `erxes.integrationIds`, inbound messages are accepted only if `integrationId` is in the list.

Cal.com webhook:
- POST `/webhooks/calcom/:tenantId?`
- Headers: `x-tenant-id` (or path), `x-signature` (HMAC SHA256 hex over raw body)
- Body must include booking id and status fields. If status is terminal (cancelled/rejected/no_show), reminders are removed.
- If status/event indicates booking created/confirmed/accepted/scheduled/rescheduled and payload includes `metadata.channel`, `metadata.to`, and `start`, reminders are scheduled.

Body fields (minimal for inbound message):
```
{
  "integrationId": "ERXES_INTEGRATION_ID",
  "messageId": "external-message-id",
  "message": "Hello",
  "phone": "+79991234567"
}
```

Booking via webhook (optional, Cal.com v2 format):
```
{
  "tenantId": "tenant-1",
  "messageId": "external-message-id",
  "booking": {
    "idempotencyKey": "tenant-1:booking:123",
    "eventTypeId": 123,
    "start": "2026-01-24T10:00:00.000Z",
    "attendee": {
      "name": "Client Name",
      "email": "client@example.com",
      "timeZone": "Europe/Moscow",
      "language": "ru"
    },
    "channel": "telegram",
    "to": "123456789",
    "reminders": {
      "enable24h": true,
      "enable1h": true,
      "message24h": "Reminder: your appointment is in 24 hours",
      "message1h": "Reminder: your appointment is in 1 hour"
    }
  }
}
```
Legacy payload compatibility:
- `responses` + top-level `timeZone`/`language` are still accepted and mapped to v2 `attendee`.

Quiet hours:
- Default 22:00–09:00 (configurable via QUIET_HOURS_START/END)
- Reminders in quiet hours are shifted to end of quiet hours

## Integrations (internal)
- POST /integrations/calcom/bookings
- POST /integrations/erxes/contacts
- POST /send/:channel
- POST /queue/tx
- POST /queue/mk
- POST /queue/reminders
- GET /tenants/:tenantId/config
- PUT /tenants/:tenantId/config
- DELETE /tenants/:tenantId/config

## Notes
- All requests include tenant context
- Idempotency key required for message + booking operations

## Cal.com booking payload (minimum, v2)
```
{
  "tenantId": "tenant-1",
  "idempotencyKey": "tenant-1:booking:123",
  "eventTypeId": 123,
  "start": "2026-01-24T10:00:00.000Z",
  "attendee": {
    "name": "Client Name",
    "email": "client@example.com",
    "timeZone": "Europe/Moscow",
    "language": "ru"
  },
  "location": "Salon address"
}
```
Notes:
- `language` is optional for v2 (defaults to Cal.com settings if omitted).

## erxes contact upsert payload (minimum)
```
{
  "tenantId": "tenant-1",
  "primaryPhone": "+79991234567",
  "primaryEmail": "client@example.com",
  "firstName": "Anna",
  "lastName": "Ivanova",
  "state": "customer",
  "brandId": "ERXES_BRAND_ID"
}
```

## send message payload (minimum)
```
{
  "tenantId": "tenant-1",
  "idempotencyKey": "tenant-1:msg:123",
  "to": "+79991234567",
  "message": "Reminder text",
  "metadata": {
    "botToken": "per-tenant-telegram-token",
    "sendUrl": "override-send-url",
    "token": "channel-token",
    "apiBase": "https://graph.facebook.com/v19.0",
    "phoneId": "whatsapp-phone-id"
  }
}
```

## queue:tx payload (minimum)
```
{
  "tenantId": "tenant-1",
  "idempotencyKey": "tenant-1:tx:1",
  "type": "reminder",
  "channel": "telegram",
  "to": "123456789",
  "message": "Reminder text",
  "metadata": {}
}
```

## queue:mk payload (minimum)
```
{
  "tenantId": "tenant-1",
  "idempotencyKey": "tenant-1:mk:1",
  "campaignId": "optional-campaign-id",
  "type": "campaign",
  "channel": "whatsapp",
  "to": "+79991234567",
  "message": "Promo text",
  "clientId": "optional-client-id",
  "timeZone": "Europe/Moscow",
  "metadata": {
    "timeZone": "Europe/Moscow"
  }
}
```

## reminders payload (minimum)
```
{
  "tenantId": "tenant-1",
  "idempotencyKey": "tenant-1:rem:1",
  "remindAt": "2026-01-24T10:00:00.000Z",
  "channel": "telegram",
  "to": "123456789",
  "message": "Reminder text",
  "metadata": {}
}
```

Notes:
- Telegram expects `to` = chat_id
- WhatsApp expects `to` = phone in international format
- Instagram expects `to` = recipient id (IG user id)
- VK Max depends on provider API

## Per-tenant bots (tokens/URLs)
If each salon uses its own bot/token, configure `TENANT_CONFIG_PATH` and put per-tenant channel settings there.
The sender resolves credentials in this order:
1) `metadata` in the send payload
2) tenant config file (by `tenantId`)
3) global env variables

Example file: `docs/tenant-config.example.json`

## Tenant config API (admin)
Auth:
- `x-admin-token: <ADMIN_API_TOKEN>` or `Authorization: Bearer <ADMIN_API_TOKEN>`
- or per-tenant `access.ownerTokens` / `access.staffTokens`

GET `/tenants/:tenantId/config`
- Returns tenant config (from DB or file). Staff role receives masked access tokens.

PUT `/tenants/:tenantId/config`
- Requires DB source (`TENANT_CONFIG_SOURCE=db` or `auto` with DATABASE_URL).
- Requires admin or owner role.
- Body is the tenant config JSON.

DELETE `/tenants/:tenantId/config`
- Requires DB source.
- Requires admin or owner role.
