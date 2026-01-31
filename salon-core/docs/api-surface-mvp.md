# MVP API Surface (salon-core) (2026-01-26)

This is a target API outline. It may be implemented as REST or GraphQL. Use consistent auth + tenant resolution.
OpenAPI spec: `docs/openapi-mvp.yaml`
Stub mode: set `STUB_MVP_ENDPOINTS=1` to return placeholder responses; otherwise returns 501.

Notes:
- `/slots/suggest` uses Cal.com `/v2/slots` under the hood.
- `serviceId` may map to `tenantConfig.services[serviceId]` with `calcomEventTypeId` or slug config.
- `/bookings/create` enforces grid-aligned `start` and uses service config for Cal.com event type mapping.
- `/bookings/reschedule` enforces grid alignment; can optionally pass `serviceId` to use per-service grid.
- `/bookings/cancel` maps to Cal.com cancel endpoint and updates local appointment map.

## Tenant Config
- GET /tenants/:tenantId/config
- PUT /tenants/:tenantId/config
- DELETE /tenants/:tenantId/config

## Scheduling
- POST /slots/suggest
  - input: tenantId, serviceId, preferredTime, staffId?
  - output: ranked slots (grid-aligned)
- POST /bookings/create
- POST /bookings/reschedule
- POST /bookings/cancel

## Channels (Inbound/Outbound)
- POST /webhooks/:channel/:tenantId
- POST /send/:channel

## Voice + STT
- POST /voice/upload
  - input: file
  - output: fileId
- POST /voice/intent
  - input: fileId
  - output: intent + extracted fields
- POST /voice/booking
  - input: fileId + client + timeZone (optional text)
  - output: bookingId or follow-up request
Notes:
- `/voice/upload` accepts multipart `file` or JSON with `fileBase64` for testing.
- `/voice/intent` can accept optional `text`/`transcript` + hints (`serviceId`, `preferredTime`).
- If `text` is omitted, `/voice/intent` calls STT (`STT_PROVIDER` + `STT_API_BASE`) using the stored file.

## Inventory
- POST /inventory/intake
  - input: file or fileBase64/text -> draft with extracted items
- POST /inventory/intake/confirm
  - input: draftId -> ledger entries
- POST /inventory/consume
  - input: bookingId -> auto-consumption
- POST /inventory/reconcile
  - input: physical counts -> variance report
Notes:
- `/inventory/intake` accepts multipart `file` or JSON `fileBase64`.
- `/inventory/consume` can take explicit `items` or resolve by `serviceId` from tenant inventory config.
- `/inventory/reconcile` supports `applyCorrection=true` to align expected stock.
- If no `items` or `text` are provided, `/inventory/intake` calls OCR (`OCR_API_BASE`) to extract items.

## Feedback + KPI
- POST /feedback/request
- POST /feedback/submit
- GET /kpi/summary
- GET /kpi/staff/:staffId
Notes:
- `/feedback/request` can enqueue an outbound message if `channel`, `to`, and `message` are provided.
- `/feedback/submit` stores rating (1-5) + optional `staffId` and `serviceId`.

## Admin + Audit
- GET /audit
- GET /health
- GET /health/queues
- GET /health/metrics
