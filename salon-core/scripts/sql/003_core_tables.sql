create table if not exists tenants (
  tenant_id text primary key,
  name text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tenant_mappings (
  tenant_id text primary key references tenants (tenant_id) on delete cascade,
  erxes_brand_id text,
  calcom_team_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tenant_mappings_erxes_brand_id
  on tenant_mappings (erxes_brand_id)
  where erxes_brand_id is not null;

create unique index if not exists tenant_mappings_calcom_team_id
  on tenant_mappings (calcom_team_id)
  where calcom_team_id is not null;

create table if not exists clients (
  id text primary key,
  tenant_id text not null references tenants (tenant_id) on delete cascade,
  phone text,
  email text,
  first_name text,
  last_name text,
  erxes_contact_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists clients_tenant_phone
  on clients (tenant_id, phone)
  where phone is not null;

create unique index if not exists clients_tenant_email
  on clients (tenant_id, email)
  where email is not null;

create table if not exists client_channels (
  id text primary key,
  tenant_id text not null references tenants (tenant_id) on delete cascade,
  client_id text not null references clients (id) on delete cascade,
  channel text not null,
  external_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists client_channels_unique
  on client_channels (tenant_id, channel, external_id)
  where external_id is not null;

create table if not exists appointments_map (
  id text primary key,
  tenant_id text not null references tenants (tenant_id) on delete cascade,
  client_id text references clients (id) on delete set null,
  calcom_booking_id text not null,
  status text,
  start_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists appointments_map_booking
  on appointments_map (tenant_id, calcom_booking_id);

create table if not exists idempotency_keys (
  key text primary key,
  tenant_id text references tenants (tenant_id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists idempotency_keys_tenant
  on idempotency_keys (tenant_id, created_at);

create table if not exists audit_log (
  id text primary key,
  tenant_id text references tenants (tenant_id) on delete cascade,
  actor text,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_tenant_created_at
  on audit_log (tenant_id, created_at);

create table if not exists job_log (
  id text primary key,
  tenant_id text references tenants (tenant_id) on delete cascade,
  queue text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_log_tenant_created_at
  on job_log (tenant_id, created_at);

create table if not exists rate_limits (
  key text primary key,
  tenant_id text references tenants (tenant_id) on delete cascade,
  window_start timestamptz not null,
  count integer not null default 0
);

create index if not exists rate_limits_tenant_window
  on rate_limits (tenant_id, window_start);
