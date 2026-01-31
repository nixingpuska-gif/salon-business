#!/usr/bin/env bash
set -euo pipefail

# Maintenance tasks for salon-core (run via cron).
# Requires: psql in PATH and DATABASE_URL exported in environment.

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

run_sql() {
  local file="$1"
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"
}

# Daily retention cleanup (message_log/job_log)
if [[ "${RUN_RETENTION:-1}" == "1" ]]; then
  run_sql "${ROOT_DIR}/scripts/sql/004_retention.sql"
fi

# Monthly partition creation (optional, only if using partitions)
if [[ "${RUN_PARTITIONS:-0}" == "1" ]]; then
  run_sql "${ROOT_DIR}/scripts/sql/005_partitions.sql"
fi

# KPI rollups
if [[ "${RUN_KPI_ROLLUP_DAILY:-0}" == "1" ]]; then
  run_sql "${ROOT_DIR}/scripts/sql/kpi_rollup_daily.sql"
fi

if [[ "${RUN_KPI_ROLLUP_HOURLY:-0}" == "1" ]]; then
  run_sql "${ROOT_DIR}/scripts/sql/kpi_rollup_hourly.sql"
fi
