#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SALON_CORE_URL:-http://localhost:8080}"
TENANT_ID="${TENANT_ID:-default}"
CHANNEL="${CHANNEL:-telegram}"
TO="${TO:-123456789}"
MESSAGE="${MESSAGE:-smoke send test}"
IDEMPOTENCY_KEY="${IDEMPOTENCY_KEY:-send-$(date +%s)-$RANDOM}"

payload=$(cat <<JSON
{
  "tenantId": "${TENANT_ID}",
  "idempotencyKey": "${IDEMPOTENCY_KEY}",
  "to": "${TO}",
  "message": "${MESSAGE}"
}
JSON
)

echo "POST ${BASE_URL}/send/${CHANNEL}"
curl -fsS -X POST "${BASE_URL}/send/${CHANNEL}" \
  -H "Content-Type: application/json" \
  -d "${payload}"
echo
