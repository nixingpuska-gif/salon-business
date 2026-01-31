# Data Model (salon-core)

## Tables (minimum)
### Implemented now (SQL migrations)
- message_log (scripts/sql/001_message_log.sql)
- tenant_config (scripts/sql/002_tenant_config.sql)
- core tables (scripts/sql/003_core_tables.sql):
  - tenants
  - tenant_mappings (erxes_brand_id, calcom_team_id)
  - clients (phone/email unique per tenant)
  - client_channels
  - appointments_map (calcom_booking_id)
  - idempotency_keys (optional, Redis is primary)
  - audit_log
  - job_log
  - rate_limits (optional, Redis is primary)
- booking_events (scripts/sql/010_booking_events.sql)
- kpi_rollup, staff_kpi_rollup (scripts/sql/009_kpi_rollup.sql)

### Planned / optional
- users, roles, user_roles (if salon-core becomes a standalone admin)
- retention job (scripts/sql/004_retention.sql)
- partitioned message_log/job_log (scripts/sql/005_partitions.sql)

## Writes
- Set `CORE_DB_WRITE=1` to write tenants/mappings/clients/appointments/job_log.

## Retention
- hot data: 30 days in SSD
- cold archive: >30 days in HDD

## message_log (current)
- id (text, uuid)
- created_at (timestamptz)
- tenant_id (text)
- channel (text)
- direction (text)
- message_id (text)
- customer_id (text)
- payload (jsonb)

## Notes
- Partitioning is not enabled by default; add partitions only if needed for scale.
