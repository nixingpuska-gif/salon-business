$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$composeArgs = @("-f", "docker-compose.yml", "-f", "docker-compose.local.yml")
$appPort = 18081

Push-Location $repoRoot

Write-Host "Starting Postgres + Redis..."
docker compose @composeArgs up -d postgres redis | Out-Host

Write-Host "Applying migrations (including KPI tables)..."
$env:RUN_VIEWS = "1"
docker compose @composeArgs run --rm migrate | Out-Host

Write-Host "Starting app + workers on port $appPort..."
docker compose @composeArgs up -d app worker_sender worker_tx worker_mk worker_reminder | Out-Host

Write-Host "Running KPI rollups (hourly + daily)..."
$env:RUN_KPI_ROLLUP_DAILY = "1"
$env:RUN_KPI_ROLLUP_HOURLY = "1"
docker compose @composeArgs run --rm migrate | Out-Host

Write-Host "Bootstrap complete."
Pop-Location
Write-Host "Health check: http://localhost:$appPort/health"
Write-Host "KPI summary: http://localhost:$appPort/kpi/summary?tenantId=default&period=day"
