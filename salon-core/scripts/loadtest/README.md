# Load Test Scripts (k6)

These scripts implement `docs/load-test-plan.md`.

## Requirements
- k6 installed
- Base URL accessible (salon-core)

## Run
# Powershell example
$env:BASE_URL="http://localhost:8080";
$env:TENANT_ID="demo";
$env:ADMIN_TOKEN=""; # optional
$env:CHANNEL="telegram";

k6 run scripts/loadtest/k6/mvp_load.js

## Notes
- Endpoints must exist in the target build.
- These tests are safe to run in staging; do not run against production.
