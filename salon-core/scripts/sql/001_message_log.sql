create table if not exists message_log (
  id text primary key,
  created_at timestamptz not null default now(),
  tenant_id text not null,
  channel text not null,
  direction text not null,
  message_id text,
  customer_id text,
  payload jsonb not null
);

create index if not exists message_log_tenant_created_at
  on message_log (tenant_id, created_at);
