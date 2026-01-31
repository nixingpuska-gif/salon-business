# Stitching Process Log

Date: 2026-01-24

## Repos cloned
- C:\Users\Nicita\repos\erxes
- C:\Users\Nicita\repos\erxes-integrations
- C:\Users\Nicita\repos\cal.com
- C:\Users\Nicita\repos\chatwoot (excluded; folder removed)

## Strategy chosen
- Polyrepo + gateway (fastest, lowest integration risk)
- Base repo: erxes
- Booking engine: cal.com
- Glue service: salon-core (this repo)

## Reasons
- Different stacks (Node + Rails) make monorepo slow
- Fastest path to MVP and 7-day release

## Next steps
- Define unified auth/tenant mapping
- Implement webhook intake per channel
- Integrate Cal.com booking API
- Integrate erxes contacts/conversations
- Add queues, idempotency, rate limits

## Update 2026-01-24
- Added per-tenant bot config support via TENANT_CONFIG_PATH
- Sender resolves credentials by tenant (metadata > tenant config > env)
- Added per-tenant webhook signature secrets via tenant config
- Added STRICT_WEBHOOK_SIGNATURE to enforce signature on all inbound requests
- Added STRICT_TENANT_CONFIG to enforce tenant mapping across endpoints
- Added tenant integrationId allowlist + Cal.com webhook for reminder cleanup
- Added inbound normalization (WA/IG/VK/TG) + MK client anti-spam + channel throttling
- Added strict inbound schema mode + MK dedupe by campaignId/clientId
- Added DB-backed tenant config (CRUD) + PII masking in logs
- Added role-based access for tenant config (owner/staff/admin)
- Added erxes SalonHELP plugin UI + backend proxy routes for role-based access
- Added tenant auto-resolution by host + UI config validator

## Update 2026-01-25
- Initialized repo-stitcher plan: docs/stitching-plan.md
- Confirmed commercial agreements for cal.com + erxes (license risk removed)
- Multi-agent delegation unavailable due to invalid API key; proceeded manually
- Removed erxes-integrations from deployment minimum (deprecated)
- Upgraded queues to Redis Streams with ACK + retries + dead-letter queues
- Added /health/queues monitoring endpoint and queue runbook notes
- Added /health/metrics Prometheus endpoint for queue monitoring
- Added dead-letter handling notes and health error handling
- Added core SQL tables migration and aligned data model docs
- Added CORE_DB_WRITE writes for tenants/clients/appointments/job_log and retention/partition scripts
- Added cron maintenance script and deployment notes for retention/partitions
- Added Prometheus alert rules and Grafana dashboard for queue monitoring
- Added systemd timers for maintenance + smoke test checklist
- Added DB metrics views + health_check script for smoke tests
- Added smoke scripts for queue/send/webhook/calcom tests
- Added booking webhook smoke script
- Added per-tenant DB metrics in /health/metrics and updated monitoring assets
- Added run_all smoke runner and README for smoke scripts
- Added Dockerfile + docker-compose for local dev, plus migrate script
- Added smoke env template + npm script for smoke runner
- Added GitHub Actions CI build workflow
- Added CI smoke run (health checks) with Redis service
- Added Postgres service + migrations + DB metrics in CI
- Added optional full E2E smoke in CI with secrets + docs
- Added mocked E2E smoke path and token rotation guide/script
- Added config matrix for cal.com/erxes/channels
- Added prod env template + integration checklist
- Added env audit script and npm task
- Added roadmap for real tests (docs/roadmap-real-tests.md)
- Cal.com reschedule now clears old reminders and allows re-scheduling
- Reminder idempotency now includes booking start time (reschedule safe)
- Default reminder messages switched to ASCII-safe text
- Seeded local Cal.com DB and API key (cal_0123456789abcdef0123456789abcdef)
- Set Cal.com base URL to http://localhost:3003 for local testing
- Migrated Cal.com booking calls to API v2 (Authorization + cal-api-version, v1 payload mapping)
- Started Cal.com API v2 service (calcom-api) on port 3003
- Fixed calcom-api env propagation for GET_LICENSE_KEY_URL (docker-compose default)
- Set calcom-api local license bypass via IS_E2E=true to allow API key auth
- Verified Cal.com API v2 auth (GET /v2/atoms/event-types = 200)
- Added audit doc and updated real-tests roadmap progress
- Documented Redis 6.2+ requirement in smoke tests prereqs

## Update 2026-01-26
- Fixed erxes salonhelp backend route to import fetch (Node 18+ global fetch not assumed).
- Added ENABLED_PLUGINS_UI for UI-only remotes; backend uses ENABLED_PLUGINS (avoid gateway waiting on missing APIs).
- Updated start-ui-dev to use ENABLED_PLUGINS_UI and `npx nx` (works on Windows PATH).
- Adjusted core-ui dev server port to 3005 (3001 occupied); updated router to accept UI on 3005.
- Implemented Windows gateway Apollo Router via Docker (`ghcr.io/apollographql/router:v1.59.2`), container `erxes-apollo-router` on port 50000.
- Router config uses `/rhai` mount on Windows; docker mounts host `rhai` scripts to container.
- Added `.npmrc` with `node-linker=hoisted` to stabilize pnpm + Nx graph on Windows.
