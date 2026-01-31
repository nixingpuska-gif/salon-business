$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$composeArgs = @("-f", "docker-compose.yml")
$envFile = $env:ENV_FILE

if (-not $envFile) {
  if (Test-Path (Join-Path $repoRoot ".env.prod")) {
    $envFile = (Join-Path $repoRoot ".env.prod")
  } elseif (Test-Path (Join-Path $repoRoot ".env")) {
    $envFile = (Join-Path $repoRoot ".env")
  }
}

if ($envFile) {
  Write-Host "Using env file: $envFile"
  $composeArgs += @("--env-file", $envFile)
} else {
  Write-Host "No env file found. Set ENV_FILE or create .env.prod."
}

Push-Location $repoRoot

Write-Host "Step 1/5: Start Postgres + Redis..."
docker compose @composeArgs up -d postgres redis | Out-Host

Write-Host "Step 2/5: Apply migrations..."
docker compose @composeArgs run --rm migrate | Out-Host

Write-Host "Step 3/5: Run KPI rollups (hourly + daily)..."
docker compose @composeArgs run --rm -e RUN_KPI_ROLLUP_DAILY=1 -e RUN_KPI_ROLLUP_HOURLY=1 migrate | Out-Host

Write-Host "Step 4/5: Start app + workers..."
docker compose @composeArgs up -d app worker_sender worker_tx worker_mk worker_reminder | Out-Host

Write-Host "Step 5/5: Health check..."
$ok = $false
for ($i = 0; $i -lt 20; $i++) {
  try {
    $status = (Invoke-WebRequest -UseBasicParsing http://localhost:8080/health -TimeoutSec 5).StatusCode
    Write-Host "Health: $status"
    $ok = $true
    break
  } catch {
    Start-Sleep -Seconds 2
  }
}
if (-not $ok) {
  Write-Host "Health check failed: service did not become ready in time."
}

Pop-Location

Write-Host "Done. Next: set cron for RUN_KPI_ROLLUP_DAILY/HOUR in scripts/cron/maintenance.sh."
