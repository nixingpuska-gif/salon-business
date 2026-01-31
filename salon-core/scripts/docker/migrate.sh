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

run_sql "/scripts/sql/001_message_log.sql"
run_sql "/scripts/sql/002_tenant_config.sql"
run_sql "/scripts/sql/003_core_tables.sql"
run_sql "/scripts/sql/007_inventory_tables.sql"
run_sql "/scripts/sql/008_feedback_tables.sql"
run_sql "/scripts/sql/009_kpi_rollup.sql"
run_sql "/scripts/sql/010_booking_events.sql"

if [[ "${RUN_VIEWS:-0}" == "1" ]]; then
  run_sql "/scripts/sql/006_metrics_views.sql"
fi

if [[ "${RUN_KPI_ROLLUP_DAILY:-0}" == "1" ]]; then
  run_sql "/scripts/sql/kpi_rollup_daily.sql"
fi

if [[ "${RUN_KPI_ROLLUP_HOURLY:-0}" == "1" ]]; then
  run_sql "/scripts/sql/kpi_rollup_hourly.sql"
fi
