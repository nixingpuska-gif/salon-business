-- Optional: create partitioned message_log and job_log tables.
-- This script does NOT modify existing tables. If message_log/job_log already exist,
-- rename them before running this script.

do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'message_log') then
    raise notice 'message_log already exists; rename it before creating partitions';
  else
    execute '
      create table message_log (
        id text primary key,
        created_at timestamptz not null default now(),
        tenant_id text not null,
        channel text not null,
        direction text not null,
        message_id text,
        customer_id text,
        payload jsonb not null
      ) partition by range (created_at);
    ';
  end if;

  if exists (select 1 from information_schema.tables where table_name = 'job_log') then
    raise notice 'job_log already exists; rename it before creating partitions';
  else
    execute '
      create table job_log (
        id text primary key,
        tenant_id text,
        queue text not null,
        status text not null,
        payload jsonb not null default ''{}''::jsonb,
        error text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      ) partition by range (created_at);
    ';
  end if;
end $$;

-- Create current + next month partitions (message_log, job_log)
do $$
declare
  start_ts date := date_trunc('month', now())::date;
  next_ts date := (date_trunc('month', now()) + interval '1 month')::date;
  next_next_ts date := (date_trunc('month', now()) + interval '2 month')::date;
  msg_part text;
  job_part text;
begin
  msg_part := format('message_log_%s', to_char(start_ts, 'YYYY_MM'));
  job_part := format('job_log_%s', to_char(start_ts, 'YYYY_MM'));
  execute format(
    'create table if not exists %I partition of message_log for values from (%L) to (%L)',
    msg_part, start_ts, next_ts
  );
  execute format(
    'create table if not exists %I partition of job_log for values from (%L) to (%L)',
    job_part, start_ts, next_ts
  );

  msg_part := format('message_log_%s', to_char(next_ts, 'YYYY_MM'));
  job_part := format('job_log_%s', to_char(next_ts, 'YYYY_MM'));
  execute format(
    'create table if not exists %I partition of message_log for values from (%L) to (%L)',
    msg_part, next_ts, next_next_ts
  );
  execute format(
    'create table if not exists %I partition of job_log for values from (%L) to (%L)',
    job_part, next_ts, next_next_ts
  );
end $$;
