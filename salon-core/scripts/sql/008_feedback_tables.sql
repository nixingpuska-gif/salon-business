create table if not exists feedback (
  id text primary key,
  tenant_id text not null references tenants (tenant_id) on delete cascade,
  booking_id text not null,
  staff_id text,
  service_id text,
  channel text,
  rating numeric not null,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_tenant_created
  on feedback (tenant_id, created_at);

create index if not exists feedback_tenant_staff
  on feedback (tenant_id, staff_id, created_at);
