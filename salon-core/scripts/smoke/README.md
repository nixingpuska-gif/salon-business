# Smoke Scripts

## Usage
```bash
./scripts/smoke/run_all.sh
```

## Windows (Git Bash)
- Run: `npm run smoke:gitbash`
- Uses `scripts/smoke/run_all.ps1` to locate Git Bash and execute `run_all.sh`.

## Windows (PowerShell, no DB)
- Run: `powershell -ExecutionPolicy Bypass -File scripts/smoke/mvp_no_db_test.ps1`
- Designed for local testing without DB migrations.

## Git Bash (no DB)
- Run: `bash scripts/smoke/mvp_no_db_test.sh`
- Designed for local testing without DB migrations.

## DB migrations (agents)
- Windows: `powershell -ExecutionPolicy Bypass -File scripts/sql/apply_all.ps1`
- Git Bash: `bash scripts/sql/apply_all.sh`

## Env file (recommended)
- Copy `scripts/smoke/.env.example` to `.env.smoke` in repo root.
- Runner will load `.env.smoke` automatically.
- If `.env.mock` exists, runner will prefer it (use `SMOKE_ENV_FILE` to override).
- Or set `SMOKE_ENV_FILE=/path/to/file`.

## CI
- Full E2E smoke in GitHub Actions uses Secrets (see `docs/ci.md`).

## Mocks (no external calls)
- Set `MOCK_SENDERS=1` to bypass channel providers.
- Set `MOCK_CALCOM=1` to bypass Cal.com booking API.
- Set `MOCK_ERXES=1` to bypass erxes GraphQL.

## Required env (common)
- `SALON_CORE_URL` (default: http://localhost:8080)
- `TENANT_ID` (default: default)
- `CHANNEL` (default: telegram)
- `TO` (default: 123456789)
- `CLIENT_ID` (optional for MK; default auto-generated to bypass client rate limit)

## Inbound / booking
- `ERXES_INTEGRATION_ID`
- `WEBHOOK_SECRET` (or set `ALLOW_UNSIGNED_WEBHOOK=1`)
- `ALLOW_INBOUND=1` to run inbound test
- `ALLOW_BOOKING=1` to run booking test

## Booking
- `EVENT_TYPE_ID` (required)
- `START_ISO`, `TIME_ZONE`, `LANGUAGE` (optional overrides)

## Cal.com webhook
- `CALCOM_WEBHOOK_SECRET` (or set `ALLOW_UNSIGNED_CALCOM=1`)
- `ALLOW_CALCOM=1` to run

## Send/queue tests
- `ALLOW_SEND=1` to run (to avoid accidental messaging)

## Skips
- `SKIP_INBOUND=1`
- `SKIP_BOOKING=1`
- `SKIP_CALCOM=1`
- `SKIP_QUEUE=1`
- `SKIP_SEND=1`

## Voice/Inventory/Feedback
- `ALLOW_VOICE=1` + `SERVICE_ID` + `PREFERRED_TIME` to run voice booking test
- `ALLOW_INVENTORY=1` to run inventory flow
- `ALLOW_FEEDBACK=1` to run feedback + KPI flow
- Optional: `FEEDBACK_SEND=1` to enqueue outbound feedback message

## Additional scripts
- `scripts/smoke/voice_booking_test.sh`
- `scripts/smoke/inventory_flow_test.sh`
- `scripts/smoke/feedback_flow_test.sh`
