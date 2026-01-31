create table if not exists inventory_item (
  id text primary key,
  tenant_id text not null references tenants (tenant_id) on delete cascade,
  sku text,
  name text,
  unit text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists inventory_item_tenant_sku
  on inventory_item (tenant_id, sku)
  where sku is not null;

create table if not exists inventory_ledger (
  id text primary key,
  tenant_id text not null references tenants (tenant_id) on delete cascade,
  item_id text not null references inventory_item (id) on delete cascade,
  qty_delta numeric not null,
  reason text not null,
  source_doc_id text,
  booking_id text,
  created_at timestamptz not null default now()
);

create index if not exists inventory_ledger_tenant_item
  on inventory_ledger (tenant_id, item_id, created_at);

create table if not exists stock_snapshot (
  id text primary key,
  tenant_id text not null references tenants (tenant_id) on delete cascade,
  item_id text not null references inventory_item (id) on delete cascade,
  qty_physical numeric not null,
  qty_expected numeric not null,
  variance numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists stock_snapshot_tenant_created
  on stock_snapshot (tenant_id, created_at);

create table if not exists intake_doc (
  id text primary key,
  tenant_id text not null references tenants (tenant_id) on delete cascade,
  file_id text,
  status text not null,
  extracted_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intake_doc_tenant_created
  on intake_doc (tenant_id, created_at);
