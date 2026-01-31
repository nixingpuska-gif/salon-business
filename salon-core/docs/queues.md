# Queues & Rate Limits

## Queues
- queue:tx (booking, reschedule, cancel, reminders) - Redis Streams
- queue:mk (campaigns, win-back, reviews) - Redis Streams
- queue:calendar (external sync) - Redis Streams
- queue:send:telegram / vkmax / instagram / whatsapp - Redis Streams
- queue:dead:send:telegram / vkmax / instagram / whatsapp
- queue:dead:tx
- queue:dead:mk
- reminders:global (zset)

## Reliability (Streams)
- Consumer groups + ACK for successful processing
- Stale messages are reclaimed after QUEUE_ACK_TIMEOUT_MS
- Failed jobs are re-enqueued with attempts and moved to dead queues after max attempts
- Redis 6.2+ required for XAUTOCLAIM; older Redis will not reclaim stale messages
- ACK still works on Redis < 6.2; only stale reclaim is unavailable

## Monitoring and Alerts
- Monitor stream length (backlog), pending count, and dead queues
- Alert if any `queue:dead:*` length > 0
- Alert if pending > 0 for sustained interval (e.g., 5-10 min)
- Track reminders backlog with `reminders:global`
- Use GET /health/queues or GET /health/metrics for automated checks
- Prometheus alert rules in `monitoring/prometheus/alerts.yaml`
- DB metrics in /health/metrics when `METRICS_DB=1`
  - Includes per-tenant job_log/appointments aggregates

Example commands:
```bash
# backlog per stream
redis-cli XLEN queue:tx
redis-cli XLEN queue:mk
redis-cli XLEN queue:send:telegram

# pending per group
redis-cli XPENDING queue:tx salon-core
redis-cli XPENDING queue:mk salon-core

# consumers and idle times
redis-cli XINFO CONSUMERS queue:tx salon-core

# dead-letter queues
redis-cli XLEN queue:dead:tx
redis-cli XLEN queue:dead:mk
redis-cli XLEN queue:dead:send:telegram

# reminders backlog
redis-cli ZCARD reminders:global
```
Note: replace `salon-core` with your `QUEUE_GROUP` value.

## Dead-letter handling
- Inspect dead jobs with XRANGE and review the `data` field (JSON payload).
- Requeue by XADD into the original stream, then XDEL from dead queue.

Example workflow:
```bash
# inspect last 10 dead tx jobs
redis-cli XRANGE queue:dead:tx - + COUNT 10

# requeue a dead job (copy the JSON string from the "data" field)
redis-cli XADD queue:tx * data '{"id":"...","queue":"queue:tx","payload":{...},"createdAt":"..."}'

# delete the dead job after successful requeue
redis-cli XDEL queue:dead:tx <stream-id>
```

## Rate limits
- client: 1 promo/3 days
- tenant: 3000 tx/day, 1500 mk/day
- channel: provider-specific throttles

## Marketing quiet hours
- If MK_RESPECT_QUIET_HOURS=1 and current time is quiet, MK messages are deferred to end of quiet hours

## MK dedupe
- If `campaignId` is provided, dedupe key is `tenant + campaignId + clientId`
- Else uses `idempotencyKey + clientId`

## Channel throttling
- Sender enforces per-channel RPS using Redis (CHANNEL_RPS_*)

## Idempotency
- booking: tenant:appointment_id:action
- reminder: tenant:appointment_id:reminder_24h
- campaign: tenant:client_id:campaign_id

## Enforcement (salon-core)
- /integrations/calcom/bookings requires idempotencyKey
- TX rate limit: 3000/day per tenant
- MK rate limit: 1500/day per tenant
- /send/:channel enqueues into queue:send:*
- /queue/tx enqueues into queue:tx
- /queue/mk enqueues into queue:mk
- /queue/reminders schedules reminder into Redis zset
