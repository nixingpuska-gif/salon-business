-- KPI rollup (hourly)
-- Aggregates previous full hour of activity into kpi_rollup.

with params as (
  select
    date_trunc('hour', now()) - interval '1 hour' as range_start,
    date_trunc('hour', now()) as range_end,
    (date_trunc('hour', now()) - interval '1 hour')::date as period_start,
    date_trunc('hour', now())::date as period_end
),
tenants_in_scope as (
  select tenant_id from booking_events, params
    where created_at >= range_start and created_at < range_end
  union
  select tenant_id from appointments_map, params
    where coalesce(start_at, created_at) >= range_start and coalesce(start_at, created_at) < range_end
  union
  select tenant_id from message_log, params
    where created_at >= range_start and created_at < range_end
  union
  select tenant_id from job_log, params
    where created_at >= range_start and created_at < range_end
  union
  select tenant_id from feedback, params
    where created_at >= range_start and created_at < range_end
  union
  select tenant_id from stock_snapshot, params
    where created_at >= range_start and created_at < range_end
  union
  select tenant_id from audit_log, params
    where created_at >= range_start and created_at < range_end
),
booking_metrics as (
  select
    tenant_id,
    count(distinct booking_id)
      filter (where event_type in ('booking_created', 'booking_confirmed')) as bookings_total,
    count(distinct booking_id) filter (where event_type = 'booking_cancelled') as bookings_cancelled,
    count(distinct booking_id) filter (where event_type = 'booking_rescheduled') as bookings_rescheduled,
    count(distinct booking_id) filter (where event_type = 'booking_no_show') as bookings_no_show
  from booking_events, params
  where created_at >= range_start and created_at < range_end
  group by tenant_id
),
message_metrics as (
  select
    tenant_id,
    count(*) filter (where direction = 'outbound') as outbound_messages,
    count(*) filter (where direction = 'inbound') as inbound_messages
  from message_log, params
  where created_at >= range_start and created_at < range_end
  group by tenant_id
),
feedback_metrics as (
  select
    tenant_id,
    count(*)::bigint as feedback_count,
    coalesce(avg(rating), 0)::numeric as feedback_avg
  from feedback, params
  where created_at >= range_start and created_at < range_end
  group by tenant_id
),
job_metrics as (
  select
    tenant_id,
    count(*) filter (where queue like 'queue:send:%')::bigint as total_send,
    count(*) filter (where queue like 'queue:send:%' and status = 'processed')::bigint as processed_send
  from job_log, params
  where created_at >= range_start and created_at < range_end
  group by tenant_id
),
repeat_metrics as (
  select
    tenant_id,
    count(*) filter (where cnt > 1)::bigint as repeat_clients,
    count(*)::bigint as total_clients
  from (
    select tenant_id, client_id, count(*) as cnt
    from appointments_map, params
    where client_id is not null
      and coalesce(start_at, created_at) >= range_start
      and coalesce(start_at, created_at) < range_end
    group by tenant_id, client_id
  ) t
  group by tenant_id
),
stock_metrics as (
  select
    tenant_id,
    count(*)::bigint as stock_snapshot_count,
    coalesce(avg(variance), 0)::numeric as stock_variance_avg
  from stock_snapshot, params
  where created_at >= range_start and created_at < range_end
  group by tenant_id
),
admin_metrics as (
  select
    tenant_id,
    count(*)::bigint as admin_interventions
  from audit_log, params
  where created_at >= range_start and created_at < range_end
    and action like 'admin.%'
  group by tenant_id
)
insert into kpi_rollup (id, tenant_id, granularity, period_start, period_end, metrics)
select
  concat(t.tenant_id, ':hour:', to_char(p.range_start, 'YYYY-MM-DD"T"HH24:MI:SS')) as id,
  t.tenant_id,
  'hour' as granularity,
  p.period_start,
  p.period_end,
  jsonb_build_object(
    'bookingsTotal', coalesce(b.bookings_total, 0),
    'bookingsCancelled', coalesce(b.bookings_cancelled, 0),
    'bookingsRescheduled', coalesce(b.bookings_rescheduled, 0),
    'bookingsNoShow', coalesce(b.bookings_no_show, 0),
    'outboundMessages', coalesce(m.outbound_messages, 0),
    'inboundMessages', coalesce(m.inbound_messages, 0),
    'feedbackCount', coalesce(f.feedback_count, 0),
    'feedbackAvg', coalesce(f.feedback_avg, 0),
    'messageDeliveryRate',
      case
        when coalesce(j.total_send, 0) > 0
          then (coalesce(j.processed_send, 0)::numeric / j.total_send) * 100
        else 0
      end,
    'adminInterventionRate',
      case
        when coalesce(b.bookings_total, 0) > 0
          then (coalesce(a.admin_interventions, 0)::numeric / b.bookings_total) * 100
        else 0
      end,
    'repeatVisitRate',
      case
        when coalesce(r.total_clients, 0) > 0
          then (coalesce(r.repeat_clients, 0)::numeric / r.total_clients) * 100
        else 0
      end,
    'stockSnapshotCount', coalesce(s.stock_snapshot_count, 0),
    'stockVarianceAvg', coalesce(s.stock_variance_avg, 0),
    'periodStartTs', p.range_start,
    'periodEndTs', p.range_end
  ) as metrics
from tenants_in_scope t
cross join params p
left join booking_metrics b on b.tenant_id = t.tenant_id
left join message_metrics m on m.tenant_id = t.tenant_id
left join feedback_metrics f on f.tenant_id = t.tenant_id
left join job_metrics j on j.tenant_id = t.tenant_id
left join repeat_metrics r on r.tenant_id = t.tenant_id
left join stock_metrics s on s.tenant_id = t.tenant_id
left join admin_metrics a on a.tenant_id = t.tenant_id
on conflict (id) do update set
  metrics = excluded.metrics,
  period_end = excluded.period_end;
