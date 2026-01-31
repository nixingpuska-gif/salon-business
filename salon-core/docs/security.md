# Security and Rotation

## Token rotation (tenant access)
Use `scripts/security/rotate_tenant_tokens.js` to rotate owner/staff tokens in tenant config.

Required env:
- `SALON_CORE_URL`
- `TENANT_ID`
- `ADMIN_API_TOKEN`

Optional env:
- `ROTATE_OWNER=1` (default)
- `ROTATE_STAFF=1` (default)
- `OWNER_TOKENS_COUNT=1`
- `STAFF_TOKENS_COUNT=1`
- `DRY_RUN=1` (prints tokens, does not update)

Example:
```bash
SALON_CORE_URL=http://localhost:8080 \
TENANT_ID=salon-1 \
ADMIN_API_TOKEN=... \
node scripts/security/rotate_tenant_tokens.js
```

## Webhook secrets rotation
Webhook secrets are typically managed per channel provider (Telegram/WhatsApp/etc).
Rotate them by:
1) Update provider secret
2) Update tenant config (`webhooks.<channel>.secret`)
3) Verify with inbound smoke test

## Env audit
Run a quick audit of required env configuration:
```bash
npm run env:audit
```
Use strict mode to fail on errors:
```bash
STRICT=1 npm run env:audit
```

## Recommended cadence
- Access tokens: rotate every 30-90 days
- Webhook secrets: rotate every 90-180 days
- Revoke tokens immediately on staff/offboarding events

## Production hardening (required)
These flags are mandatory in production:
- STRICT_WEBHOOK_SIGNATURE=1
- STRICT_TENANT_CONFIG=1
- STRICT_INBOUND_SCHEMA=1
