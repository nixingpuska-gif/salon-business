# Config Matrix (cal.com + erxes)

This document lists required environment variables and per-tenant overrides for Cal.com, erxes, and channel providers.

## Cal.com
**Purpose:** booking creation and webhook processing.

### Global env (fallback)
- `CALCOM_API_BASE` (required unless per-tenant set)
- `CALCOM_API_KEY` (required unless per-tenant set)
- `CALCOM_API_VERSION` (optional; default `2024-08-13`)
- `CALCOM_WEBHOOK_SECRET` (optional; per-tenant preferred)
- `MOCK_CALCOM=1` for mock mode (no external API calls)

### Per-tenant config
```
calcom: {
  apiBase,
  apiKey,
  apiVersion,
  webhookSecret,
  teamId
}
```
Notes:
- `apiBase` can be a host; API version `/v2` is appended automatically if missing.
- `apiVersion` is sent as `cal-api-version` header for Cal.com v2 (default `2024-08-13`).
- `teamId` is stored for mapping/audits.

## erxes
**Purpose:** CRM contacts + conversations.

### Global env (fallback)
- `ERXES_API_BASE` (required unless per-tenant set)
- `ERXES_APP_TOKEN` (optional, but recommended)
- `ERXES_NGINX_HOSTNAME` (optional; required in some multi-tenant setups)
- `ERXES_BRAND_ID` (fallback brand)
- `MOCK_ERXES=1` for mock mode (no external API calls)

### Per-tenant config
```
erxes: {
  apiBase,
  appToken,
  nginxHostname,
  brandId,
  integrationIds
}
```
Notes:
- `integrationIds` allowlist inbound messages by tenant.

## Scheduling services (per-tenant)
```
services: {
  svc-id: {
    calcomEventTypeId,
    eventTypeSlug,
    username,
    teamSlug,
    organizationSlug,
    durationMinutes,
    bufferMinutes,
    gridMinutes
  }
}
```
Notes:
- `serviceId` in `/slots/suggest` resolves to this map first.

## Inventory consumption mapping (per-tenant)
```
inventory: {
  services: {
    svc-id: {
      items: [{ sku, name, qty, unit }]
    }
  }
}
```
Notes:
- `/inventory/consume` can resolve items by `serviceId`.

## Channel senders
**Purpose:** outbound delivery and inbound webhook validation.

### Global env (fallback)
- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_SEND_URL`, `TELEGRAM_WEBHOOK_SECRET`
- WhatsApp: `WHATSAPP_TOKEN`, `WHATSAPP_API_BASE`, `WHATSAPP_PHONE_ID`, `WHATSAPP_SEND_URL`, `WHATSAPP_WEBHOOK_SECRET`
- Instagram: `INSTAGRAM_TOKEN`, `INSTAGRAM_SEND_URL`, `INSTAGRAM_WEBHOOK_SECRET`
- VK Max: `VKMAX_TOKEN`, `VKMAX_SEND_URL`, `VKMAX_WEBHOOK_SECRET`
- `MOCK_SENDERS=1` to skip external send calls

### Per-tenant config
```
channels: {
  telegram: { botToken, sendUrl },
  whatsapp: { token, apiBase, phoneId, sendUrl },
  instagram: { token, sendUrl },
  vkmax: { token, sendUrl }
},
webhooks: {
  telegram: { secret },
  whatsapp: { secret },
  instagram: { secret },
  vkmax: { secret }
}
```

## Tenant resolution and strict modes
- `STRICT_TENANT_CONFIG=1` rejects unknown tenants.
- `STRICT_WEBHOOK_SIGNATURE=1` rejects webhooks without secrets.
- `TENANT_FROM_HOST=1` or `TENANT_HOST_SUFFIX` to resolve tenantId by host.
- `TENANT_CONFIG_SOURCE=db|file|auto` and `TENANT_CONFIG_PATH` control config storage.

## Scheduling optimization
- `SLOT_GRID_MINUTES` (default 15) aligns booking slots to a fixed grid.
- `SLOT_BUFFER_MINUTES` (default 0) adds cleanup buffer between services.
- `OFFPEAK_MORNING_END_HOUR` (default 11) defines morning off-peak window.
- `OFFPEAK_EVENING_START_HOUR` (default 19) defines evening off-peak window.
- `SLOT_SUGGEST_HORIZON_DAYS` (default 3) search window for suggestions.
- `SLOT_SUGGEST_LIMIT` (default 10) number of suggestions returned.

## Voice uploads
- `VOICE_STORAGE_PATH` (default `storage/voice`) base directory for uploaded voice files.
- `VOICE_MAX_SIZE_MB` (default 20) max voice upload size.

## STT (voice-to-text)
- `STT_PROVIDER` (default `openai` or `http`)
- `STT_API_BASE` (required for real STT)
- `STT_API_KEY` (optional)
- `STT_ENDPOINT` (optional override)
- `STT_MODEL` (default `whisper-1` for openai-compatible)
- `STT_LANGUAGE` (optional)
- `MOCK_STT=1` to return a stub transcript

## Inventory uploads
- `INVENTORY_STORAGE_PATH` (default `storage/inventory`) base directory for intake files + drafts.
- `INVENTORY_MAX_SIZE_MB` (default 20) max intake upload size.

## OCR (inventory intake)
- `OCR_PROVIDER` (default `http`)
- `OCR_API_BASE` (required for real OCR)
- `OCR_API_KEY` (optional)
- `OCR_ENDPOINT` (optional override)
- `MOCK_OCR=1` to return stub extracted items

## Feedback storage
- `FEEDBACK_STORAGE_PATH` (default `storage/feedback`) local fallback storage if DB is disabled.

## Precedence order
1) Request `metadata` (send payload)
2) Tenant config (DB/file)
3) Global env

## Suggested production defaults
- Use per-tenant config for all tokens and secrets
- Enable `STRICT_TENANT_CONFIG=1` and `STRICT_WEBHOOK_SIGNATURE=1`
- Keep global env values as emergency fallbacks only
