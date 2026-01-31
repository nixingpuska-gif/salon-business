#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SALON_CORE_URL:-http://localhost:8080}"
TENANT_ID="${TENANT_ID:-default}"
CHANNEL="${CHANNEL:-telegram}"
TO="${TO:-123456789}"
FEEDBACK_SEND="${FEEDBACK_SEND:-0}"

if [[ "${FEEDBACK_SEND}" == "1" ]]; then
  FEEDBACK_REQ=$(cat <<JSON
{
  "tenantId": "${TENANT_ID}",
  "bookingId": "booking-smoke-1",
  "channel": "${CHANNEL}",
  "to": "${TO}",
  "message": "Оцените качество услуги",
  "idempotencyKey": "fb-req-$(date +%s)-$RANDOM"
}
JSON
)
  curl -fsS -X POST "${BASE_URL}/feedback/request" \
    -H "Content-Type: application/json" \
    -d "${FEEDBACK_REQ}" >/dev/null
else
  FEEDBACK_REQ=$(cat <<JSON
{
  "tenantId": "${TENANT_ID}",
  "bookingId": "booking-smoke-1"
}
JSON
)
  curl -fsS -X POST "${BASE_URL}/feedback/request" \
    -H "Content-Type: application/json" \
    -d "${FEEDBACK_REQ}" >/dev/null
fi

FEEDBACK_SUBMIT=$(cat <<JSON
{
  "tenantId": "${TENANT_ID}",
  "bookingId": "booking-smoke-1",
  "rating": 5,
  "comment": "Все отлично",
  "staffId": "staff-1",
  "serviceId": "svc-cut",
  "channel": "${CHANNEL}"
}
JSON
)
curl -fsS -X POST "${BASE_URL}/feedback/submit" \
  -H "Content-Type: application/json" \
  -d "${FEEDBACK_SUBMIT}" >/dev/null

curl -fsS "${BASE_URL}/kpi/summary?tenantId=${TENANT_ID}&period=day" >/dev/null
curl -fsS "${BASE_URL}/kpi/staff/staff-1?tenantId=${TENANT_ID}&period=day" >/dev/null

echo "feedback flow ok"
