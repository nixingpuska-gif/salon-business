create table if not exists kpi_rollup (
  id text primary key,
  tenant_id text not null references tenants (tenant_id) on delete cascade,
  granularity text not null,
  period_start date not null,
  period_end date not null,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists kpi_rollup_tenant_period
  on kpi_rollup (tenant_id, granularity, period_start);

create table if not exists staff_kpi_rollup (
  id text primary key,
  tenant_id text not null references tenants (tenant_id) on delete cascade,
  staff_id text not null,
  granularity text not null,
  period_start date not null,
  period_end date not null,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists staff_kpi_rollup_tenant_period
  on staff_kpi_rollup (tenant_id, staff_id, granularity, period_start);
