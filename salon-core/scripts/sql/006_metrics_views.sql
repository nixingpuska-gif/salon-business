create or replace view v_job_log_counts_1h as
select
  queue,
  status,
  count(*)::bigint as count
from job_log
where created_at >= now() - interval '1 hour'
group by queue, status;

create or replace view v_job_log_counts_1h_by_tenant as
select
  tenant_id,
  queue,
  status,
  count(*)::bigint as count
from job_log
where created_at >= now() - interval '1 hour'
group by tenant_id, queue, status;

create or replace view v_appointments_counts as
select
  count(*)::bigint as total,
  count(*) filter (where start_at >= now())::bigint as upcoming,
  count(*) filter (where start_at < now())::bigint as past
from appointments_map;

create or replace view v_appointments_counts_by_tenant as
select
  tenant_id,
  count(*)::bigint as total,
  count(*) filter (where start_at >= now())::bigint as upcoming,
  count(*) filter (where start_at < now())::bigint as past
from appointments_map
group by tenant_id;
