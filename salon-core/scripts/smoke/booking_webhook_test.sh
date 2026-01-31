#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SALON_CORE_URL:-http://localhost:8080}"
TENANT_ID="${TENANT_ID:-default}"
CHANNEL="${CHANNEL:-telegram}"
INTEGRATION_ID="${ERXES_INTEGRATION_ID:-ERXES_INTEGRATION_ID}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-}"

MESSAGE_ID="${MESSAGE_ID:-booking-$(date +%s)}"
EVENT_TYPE_ID="${EVENT_TYPE_ID:-123}"
START_ISO="${START_ISO:-2026-01-26T10:00:00.000Z}"
TIME_ZONE="${TIME_ZONE:-Europe/Moscow}"
LANGUAGE="${LANGUAGE:-ru}"
NAME="${NAME:-Smoke Booking}"
EMAIL="${EMAIL:-smoke@example.com}"
TO="${TO:-123456789}"

payload=$(cat <<JSON
{
  "tenantId": "${TENANT_ID}",
  "integrationId": "${INTEGRATION_ID}",
  "email": "${EMAIL}",
  "phone": "${TO}",
  "messageId": "${MESSAGE_ID}",
  "booking": {
    "idempotencyKey": "${TENANT_ID}:booking:${MESSAGE_ID}",
    "eventTypeId": ${EVENT_TYPE_ID},
    "start": "${START_ISO}",
    "timeZone": "${TIME_ZONE}",
    "language": "${LANGUAGE}",
    "responses": {
      "name": "${NAME}",
      "email": "${EMAIL}"
    },
    "channel": "${CHANNEL}",
    "to": "${TO}"
  }
}
JSON
)

signature=""
if [[ -n "${WEBHOOK_SECRET}" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    signature=$(printf "%s" "${payload}" | openssl dgst -sha256 -hmac "${WEBHOOK_SECRET}" -hex | awk '{print $NF}')
  else
    echo "openssl not found; cannot compute x-signature"
    exit 1
  fi
fi

url="${BASE_URL}/webhooks/${CHANNEL}/${TENANT_ID}"

echo "POST ${url} (booking)"
curl -fsS -X POST "${url}" \
  -H "Content-Type: application/json" \
  -H "x-erxes-integration-id: ${INTEGRATION_ID}" \
  ${signature:+-H "x-signature: ${signature}"} \
  -d "${payload}"
echo
