#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SALON_CORE_URL:-http://localhost:8080}"
TENANT_ID="${TENANT_ID:-default}"
CALCOM_WEBHOOK_SECRET="${CALCOM_WEBHOOK_SECRET:-}"

BOOKING_ID="${BOOKING_ID:-booking-$(date +%s)}"
STATUS="${STATUS:-created}"
START_ISO="${START_ISO:-2026-01-26T10:00:00.000Z}"
CHANNEL="${CHANNEL:-telegram}"
TO="${TO:-123456789}"

payload=$(cat <<JSON
{
  "bookingId": "${BOOKING_ID}",
  "status": "${STATUS}",
  "start": "${START_ISO}",
  "metadata": {
    "channel": "${CHANNEL}",
    "to": "${TO}"
  }
}
JSON
)

signature=""
if [[ -n "${CALCOM_WEBHOOK_SECRET}" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    signature=$(printf "%s" "${payload}" | openssl dgst -sha256 -hmac "${CALCOM_WEBHOOK_SECRET}" -hex | awk '{print $NF}')
  else
    echo "openssl not found; cannot compute x-signature"
    exit 1
  fi
fi

url="${BASE_URL}/webhooks/calcom/${TENANT_ID}"

echo "POST ${url}"
curl -fsS -X POST "${url}" \
  -H "Content-Type: application/json" \
  ${signature:+-H "x-signature: ${signature}"} \
  -d "${payload}"
echo
