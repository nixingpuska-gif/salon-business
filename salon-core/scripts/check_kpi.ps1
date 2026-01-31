$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$composeArgs = @("-f", "docker-compose.yml", "-f", "docker-compose.local.yml")
$healthUrl = "http://localhost:18081/health"
$kpiUrl = "http://localhost:18081/kpi/summary?tenantId=default&period=day"
$fallbackHealthUrl = "http://localhost:8080/health"
$fallbackKpiUrl = "http://localhost:8080/kpi/summary?tenantId=default&period=day"

function Run-ComposePsql {
  param([string]$sql)
  docker compose @composeArgs exec -T postgres psql -U salon -d salon_core -c $sql | Out-Host
}

Push-Location $repoRoot

Write-Host "Health check..."
try {
  $status = (Invoke-WebRequest -UseBasicParsing $healthUrl -TimeoutSec 3).StatusCode
  Write-Host "Health: $status"
} catch {
  try {
    $status = (Invoke-WebRequest -UseBasicParsing $fallbackHealthUrl -TimeoutSec 3).StatusCode
    Write-Host "Health (fallback 8080): $status"
    $healthUrl = $fallbackHealthUrl
    $kpiUrl = $fallbackKpiUrl
  } catch {
    Write-Host "Health check failed: $($_.Exception.Message)"
  }
}

Write-Host "KPI summary..."
try {
  $content = (Invoke-WebRequest -UseBasicParsing $kpiUrl -TimeoutSec 3).Content
  Write-Host $content
} catch {
  Write-Host "KPI endpoint failed: $($_.Exception.Message)"
}

Write-Host "DB counts..."
Run-ComposePsql "select count(*) as kpi_rollup_count from kpi_rollup;"
Run-ComposePsql "select count(*) as booking_events_count from booking_events;"
Run-ComposePsql "select count(*) as message_log_count from message_log;"
Run-ComposePsql "select count(*) as job_log_count from job_log;"

Pop-Location
