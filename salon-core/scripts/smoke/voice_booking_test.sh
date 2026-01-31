#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SALON_CORE_URL:-http://localhost:8080}"
TENANT_ID="${TENANT_ID:-default}"
SERVICE_ID="${SERVICE_ID:-}"
PREFERRED_TIME="${PREFERRED_TIME:-}"
TIME_ZONE="${TIME_ZONE:-Europe/Moscow}"
CLIENT_NAME="${CLIENT_NAME:-Test Client}"
CLIENT_EMAIL="${CLIENT_EMAIL:-client@example.com}"
CLIENT_PHONE="${CLIENT_PHONE:-}"

if [[ -z "${SERVICE_ID}" || -z "${PREFERRED_TIME}" ]]; then
  echo "SERVICE_ID and PREFERRED_TIME are required"
  exit 1
fi

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
if [[ -z "${FILE_ID}" ]]; then
  echo "voice upload failed: ${VOICE_RESP}"
  exit 1
fi

CLIENT_JSON=$(cat <<JSON
{
  "name": "${CLIENT_NAME}",
  "email": "${CLIENT_EMAIL}",
  "phone": "${CLIENT_PHONE}"
}
JSON
)

BOOKING_PAYLOAD=$(cat <<JSON
{
  "tenantId": "${TENANT_ID}",
  "fileId": "${FILE_ID}",
  "serviceId": "${SERVICE_ID}",
  "preferredTime": "${PREFERRED_TIME}",
  "timeZone": "${TIME_ZONE}",
  "client": ${CLIENT_JSON}
}
JSON
)
BOOKING_RESP=$(curl -fsS -X POST "${BASE_URL}/voice/booking" \
  -H "Content-Type: application/json" \
  -d "${BOOKING_PAYLOAD}")
STATUS=$(echo "$BOOKING_RESP" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p')
if [[ "${STATUS}" != "booked" ]]; then
  echo "voice booking failed: ${BOOKING_RESP}"
  exit 1
fi

echo "voice booking ok"
