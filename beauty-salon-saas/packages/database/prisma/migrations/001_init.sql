-- Migration: Base schema (tables, enums, indexes)
-- Created: 2026-01-22
-- Description: Core entities for multi-tenant Beauty Salon SaaS

-- ========================================
-- EXTENSIONS
-- ========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ========================================
-- ENUMS
-- ========================================

CREATE TYPE "StaffRole" AS ENUM ('owner', 'admin', 'staff');
CREATE TYPE "AppointmentStatus" AS ENUM ('planned', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled');
CREATE TYPE "Channel" AS ENUM ('telegram', 'whatsapp', 'instagram', 'vk', 'max', 'web', 'mobile');
CREATE TYPE "Direction" AS ENUM ('inbound', 'outbound');
CREATE TYPE "MessageType" AS ENUM ('tx', 'mk', 'case');
CREATE TYPE "CaseStatus" AS ENUM ('open', 'in_progress', 'resolved', 'unresolved');

-- ========================================
-- TABLES
-- ========================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subdomain TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  currency TEXT NOT NULL DEFAULT 'USD',
  language TEXT NOT NULL DEFAULT 'ru',
  settings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role "StaffRole" NOT NULL,
  skills JSONB,
  avatar TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email),
  UNIQUE (tenant_id, phone)
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_duration_minutes INT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  category TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE service_duration_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  duration_minutes INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, service_id, staff_id)
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  channels JSONB,
  tags TEXT[] NOT NULL DEFAULT '{}',
  vip BOOLEAN NOT NULL DEFAULT false,
  stop_list BOOLEAN NOT NULL DEFAULT false,
  bonus_balance INT NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, phone)
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status "AppointmentStatus" NOT NULL DEFAULT 'planned',
  price NUMERIC(10, 2),
  paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE message_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel "Channel" NOT NULL,
  direction "Direction" NOT NULL,
  message_type "MessageType" NOT NULL,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_role TEXT NOT NULL,
  decision TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL,
  escalated BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES staff(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status "CaseStatus" NOT NULL DEFAULT 'open',
  context JSONB,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================
-- INDEXES
-- ========================================

CREATE INDEX idx_staff_tenant_id ON staff(tenant_id);
CREATE INDEX idx_staff_tenant_active ON staff(tenant_id, active);

CREATE INDEX idx_services_tenant_id ON services(tenant_id);
CREATE INDEX idx_services_tenant_active ON services(tenant_id, active);

CREATE INDEX idx_service_duration_overrides_tenant_id ON service_duration_overrides(tenant_id);

CREATE INDEX idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX idx_clients_tenant_phone ON clients(tenant_id, phone);
CREATE INDEX idx_clients_tenant_vip ON clients(tenant_id, vip);
CREATE INDEX idx_clients_tenant_updated_at ON clients(tenant_id, updated_at);

CREATE INDEX idx_appointments_tenant_staff_start ON appointments(tenant_id, staff_id, start_at);
CREATE INDEX idx_appointments_tenant_start ON appointments(tenant_id, start_at);
CREATE INDEX idx_appointments_tenant_status_start ON appointments(tenant_id, status, start_at);
CREATE INDEX idx_appointments_tenant_client_start ON appointments(tenant_id, client_id, start_at);

CREATE INDEX idx_message_log_tenant_created ON message_log(tenant_id, created_at);
CREATE INDEX idx_message_log_tenant_client_created ON message_log(tenant_id, client_id, created_at);
CREATE INDEX idx_message_log_tenant_channel_created ON message_log(tenant_id, channel, created_at);

CREATE INDEX idx_ai_decisions_tenant_created ON ai_decisions(tenant_id, created_at);
CREATE INDEX idx_ai_decisions_tenant_escalated ON ai_decisions(tenant_id, escalated);

CREATE INDEX idx_cases_tenant_status ON cases(tenant_id, status);
CREATE INDEX idx_cases_tenant_assigned_to ON cases(tenant_id, assigned_to);
