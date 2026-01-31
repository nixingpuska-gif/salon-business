#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set"
  exit 1
fi

run_sql() {
  local file="$1"
  echo "Applying ${file}"
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

run_sql "${SCRIPT_DIR}/001_message_log.sql"
run_sql "${SCRIPT_DIR}/002_tenant_config.sql"
run_sql "${SCRIPT_DIR}/003_core_tables.sql"
run_sql "${SCRIPT_DIR}/007_inventory_tables.sql"
run_sql "${SCRIPT_DIR}/008_feedback_tables.sql"
run_sql "${SCRIPT_DIR}/009_kpi_rollup.sql"
run_sql "${SCRIPT_DIR}/010_booking_events.sql"

if [[ "${RUN_VIEWS:-0}" == "1" ]]; then
  run_sql "${SCRIPT_DIR}/006_metrics_views.sql"
fi

echo "All migrations applied"
