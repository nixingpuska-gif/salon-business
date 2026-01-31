create table if not exists booking_events (
  id text primary key,
  tenant_id text not null references tenants (tenant_id) on delete cascade,
  booking_id text,
  event_type text not null,
  source text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists booking_events_tenant_booking
  on booking_events (tenant_id, booking_id, created_at);

create index if not exists booking_events_type_created
  on booking_events (event_type, created_at);
