#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SALON_CORE_URL:-http://localhost:8080}"
TENANT_ID="${TENANT_ID:-default}"
CHANNEL="${CHANNEL:-telegram}"
TO="${TO:-123456789}"
HEALTH_TOKEN="${HEALTH_TOKEN:-}"

log() {
  echo "[$(date +%H:%M:%S)] $*"
}

log "Smoke (no DB) start: ${BASE_URL} tenant=${TENANT_ID}"

log "Health check"
if [ -n "$HEALTH_TOKEN" ]; then
  curl -fsS -H "x-health-token: ${HEALTH_TOKEN}" "${BASE_URL}/health" >/dev/null
else
  curl -fsS "${BASE_URL}/health" >/dev/null
fi

log "Voice upload (base64)"
VOICE_BASE64=$(printf "test voice content" | base64)
VOICE_PAYLOAD=$(cat <<JSON
{
  "tenantId": "${TENANT_ID}",
  "fileBase64": "${VOICE_BASE64}",
  "filename": "voice.txt",
  "contentType": "text/plain"
}
JSON
)
VOICE_RESP=$(curl -fsS -X POST "${BASE_URL}/voice/upload" \
  -H "Content-Type: application/json" \
  -d "${VOICE_PAYLOAD}")
FILE_ID=$(echo "$VOICE_RESP" | sed -n 's/.*"fileId":"\([^"]*\)".*/\1/p')
if [ -z "$FILE_ID" ]; then
  echo "voice upload failed: $VOICE_RESP"
  exit 1
fi

log "Voice intent"
INTENT_PAYLOAD=$(cat <<JSON
{
  "tenantId": "${TENANT_ID}",
  "fileId": "${FILE_ID}",
  "text": "записаться на услугу service:svc-cut 2026-01-27T09:00:00Z"
}
JSON
)
curl -fsS -X POST "${BASE_URL}/voice/intent" \
  -H "Content-Type: application/json" \
  -d "${INTENT_PAYLOAD}" >/dev/null

log "Inventory intake (items in JSON)"
INTAKE_PAYLOAD=$(cat <<JSON
{
  "tenantId": "${TENANT_ID}",
  "items": [
    { "sku": "shampoo", "name": "Shampoo", "qty": 2, "unit": "pcs" },
    { "sku": "mask", "name": "Mask", "qty": 1, "unit": "pcs" }
  ]
}
JSON
)
INTAKE_RESP=$(curl -fsS -X POST "${BASE_URL}/inventory/intake" \
  -H "Content-Type: application/json" \
  -d "${INTAKE_PAYLOAD}")
DRAFT_ID=$(echo "$INTAKE_RESP" | sed -n 's/.*"draftId":"\([^"]*\)".*/\1/p')
if [ -z "$DRAFT_ID" ]; then
  echo "intake failed: $INTAKE_RESP"
  exit 1
fi

log "Inventory confirm"
CONFIRM_PAYLOAD=$(cat <<JSON
{
  "tenantId": "${TENANT_ID}",
  "draftId": "${DRAFT_ID}"
}
JSON
)
curl -fsS -X POST "${BASE_URL}/inventory/intake/confirm" \
  -H "Content-Type: application/json" \
  -d "${CONFIRM_PAYLOAD}" >/dev/null

log "Inventory consume"
CONSUME_PAYLOAD=$(cat <<JSON
{
  "tenantId": "${TENANT_ID}",
  "bookingId": "booking-smoke-1",
  "items": [
    { "sku": "shampoo", "name": "Shampoo", "qty": 1, "unit": "pcs" }
  ]
}
JSON
)
curl -fsS -X POST "${BASE_URL}/inventory/consume" \
  -H "Content-Type: application/json" \
  -d "${CONSUME_PAYLOAD}" >/dev/null

log "Inventory reconcile"
RECONCILE_PAYLOAD=$(cat <<JSON
{
  "tenantId": "${TENANT_ID}",
  "items": [
    { "sku": "shampoo", "qtyPhysical": 5 },
    { "sku": "mask", "qtyPhysical": 3 }
  ]
}
JSON
)
curl -fsS -X POST "${BASE_URL}/inventory/reconcile" \
  -H "Content-Type: application/json" \
  -d "${RECONCILE_PAYLOAD}" >/dev/null

log "Feedback request"
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

log "Feedback submit"
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

log "KPI summary"
curl -fsS "${BASE_URL}/kpi/summary?tenantId=${TENANT_ID}&period=day" >/dev/null

log "KPI staff"
curl -fsS "${BASE_URL}/kpi/staff/staff-1?tenantId=${TENANT_ID}&period=day" >/dev/null

log "Smoke (no DB) OK"
