#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SALON_CORE_URL:-http://localhost:8080}"
HEALTH_TOKEN="${HEALTH_TOKEN:-}"

headers=()
if [[ -n "${HEALTH_TOKEN}" ]]; then
  headers+=("-H" "x-health-token: ${HEALTH_TOKEN}")
fi

echo "Checking ${BASE_URL}/health"
curl -fsS "${BASE_URL}/health" >/dev/null
echo "OK"

echo "Checking ${BASE_URL}/health/queues"
curl -fsS "${headers[@]}" "${BASE_URL}/health/queues" >/dev/null
echo "OK"

echo "Checking ${BASE_URL}/health/metrics"
curl -fsS "${headers[@]}" "${BASE_URL}/health/metrics" >/dev/null
echo "OK"
