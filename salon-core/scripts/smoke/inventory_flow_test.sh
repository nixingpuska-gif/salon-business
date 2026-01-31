#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SALON_CORE_URL:-http://localhost:8080}"
TENANT_ID="${TENANT_ID:-default}"

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
if [[ -z "${DRAFT_ID}" ]]; then
  echo "intake failed: ${INTAKE_RESP}"
  exit 1
fi

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

echo "inventory flow ok"
