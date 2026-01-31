$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
  Write-Host "DATABASE_URL is not set"
  exit 1
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Run-Sql {
  param([string]$file)
  Write-Host "Applying $file"
  & psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f $file
}

Run-Sql (Join-Path $scriptDir "001_message_log.sql")
Run-Sql (Join-Path $scriptDir "002_tenant_config.sql")
Run-Sql (Join-Path $scriptDir "003_core_tables.sql")
Run-Sql (Join-Path $scriptDir "007_inventory_tables.sql")
Run-Sql (Join-Path $scriptDir "008_feedback_tables.sql")
Run-Sql (Join-Path $scriptDir "009_kpi_rollup.sql")
Run-Sql (Join-Path $scriptDir "010_booking_events.sql")

if ($env:RUN_VIEWS -eq "1") {
  Run-Sql (Join-Path $scriptDir "006_metrics_views.sql")
}

Write-Host "All migrations applied"
