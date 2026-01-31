create table if not exists tenant_config (
  tenant_id text primary key,
  config jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists tenant_config_updated_at
  on tenant_config (updated_at);
