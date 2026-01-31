# MVP Data Model (salon-core) (2026-01-26)

This is an expansion of `docs/data-model.md` for MVP 70% scope.

## Core
- tenant
  - id, name, status, timezone
- staff
  - id, tenant_id, role, name, rating
- service_catalog
  - id, tenant_id, name, duration_min, buffer_min
- price_list (versioned)
  - id, tenant_id, version, effective_from, items[]
- booking
  - id, tenant_id, service_id, staff_id, start_ts, end_ts, status, source
- client
  - id, tenant_id, name, phone, email
- message_log
  - id, tenant_id, channel, direction, payload, status, created_at
- feedback
  - id, tenant_id, booking_id, client_id, rating, comment

## Inventory
- inventory_item
  - id, tenant_id, sku, name, unit
- inventory_ledger (append-only)
  - id, tenant_id, item_id, qty_delta, reason, source_doc_id, created_at
- stock_snapshot
  - id, tenant_id, item_id, qty_physical, qty_expected, variance, created_at
- intake_doc
  - id, tenant_id, file_id, status, extracted_items

## Analytics
- kpi_rollup
  - id, tenant_id, period, metrics_json
- staff_kpi_rollup
  - id, tenant_id, staff_id, period, metrics_json

## Booking Events (analytics)
- booking_events
  - id, tenant_id, booking_id, event_type, source, payload_json, created_at

## Integration Mapping
- tenant_mapping
  - tenant_id, erxes_brand_id, calcom_team_id

## Audit
- audit_log
  - id, tenant_id, actor_id, action, entity, entity_id, diff_json, created_at
