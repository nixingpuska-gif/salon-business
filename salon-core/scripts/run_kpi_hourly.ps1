$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot

docker compose run --rm -e RUN_KPI_ROLLUP_HOURLY=1 migrate | Out-Host

Pop-Location
