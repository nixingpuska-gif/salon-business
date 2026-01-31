#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SALON_CORE_URL:-http://localhost:8080}"
TENANT_ID="${TENANT_ID:-default}"
CHANNEL="${CHANNEL:-telegram}"
INTEGRATION_ID="${ERXES_INTEGRATION_ID:-ERXES_INTEGRATION_ID}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-}"

MESSAGE_ID="${MESSAGE_ID:-msg-$(date +%s)}"
MESSAGE="${MESSAGE:-hello from inbound smoke}"
PHONE="${PHONE:-+79990000000}"
NAME="${NAME:-Smoke User}"
SENDER_ID="${SENDER_ID:-123456}"

payload=$(cat <<JSON
{
  "tenantId": "${TENANT_ID}",
  "integrationId": "${INTEGRATION_ID}",
  "messageId": "${MESSAGE_ID}",
  "message": "${MESSAGE}",
  "phone": "${PHONE}",
  "name": "${NAME}",
  "senderId": "${SENDER_ID}"
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

echo "POST ${url}"
curl -fsS -X POST "${url}" \
  -H "Content-Type: application/json" \
  -H "x-erxes-integration-id: ${INTEGRATION_ID}" \
  ${signature:+-H "x-signature: ${signature}"} \
  -d "${payload}"
echo
