#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SALON_CORE_URL:-http://localhost:8080}"
TENANT_ID="${TENANT_ID:-default}"
CHANNEL="${CHANNEL:-telegram}"
TO="${TO:-123456789}"
MESSAGE="${MESSAGE:-smoke queue test}"
CLIENT_ID="${CLIENT_ID:-client-$(date +%s)-$RANDOM}"

TX_IDEMPOTENCY_KEY="${TX_IDEMPOTENCY_KEY:-tx-$(date +%s)-$RANDOM}"
MK_IDEMPOTENCY_KEY="${MK_IDEMPOTENCY_KEY:-mk-$(date +%s)-$RANDOM}"
MK_CAMPAIGN_ID="${MK_CAMPAIGN_ID:-smoke-campaign-$(date +%s)-$RANDOM}"

tx_payload=$(cat <<JSON
{
  "tenantId": "${TENANT_ID}",
  "idempotencyKey": "${TX_IDEMPOTENCY_KEY}",
  "channel": "${CHANNEL}",
  "to": "${TO}",
  "message": "${MESSAGE}"
}
JSON
)

mk_payload=$(cat <<JSON
{
  "tenantId": "${TENANT_ID}",
  "idempotencyKey": "${MK_IDEMPOTENCY_KEY}",
  "campaignId": "${MK_CAMPAIGN_ID}",
  "clientId": "${CLIENT_ID}",
  "channel": "${CHANNEL}",
  "to": "${TO}",
  "message": "${MESSAGE} (mk)"
}
JSON
)

echo "POST ${BASE_URL}/queue/tx"
curl -fsS -X POST "${BASE_URL}/queue/tx" \
  -H "Content-Type: application/json" \
  -d "${tx_payload}"
echo

echo "POST ${BASE_URL}/queue/mk"
curl -fsS -X POST "${BASE_URL}/queue/mk" \
  -H "Content-Type: application/json" \
  -d "${mk_payload}"
echo
