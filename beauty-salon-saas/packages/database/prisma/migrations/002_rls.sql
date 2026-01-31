-- Migration: Row-Level Security (RLS) + helpers
-- Created: 2026-01-22
-- Description: Tenant isolation policies with service role bypass

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Set tenant context (call before tenant-scoped queries)
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.tenant_id', tenant_uuid::text, false);
END;
$$;

-- Get current tenant id
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN current_setting('app.tenant_id', true)::uuid;
END;
$$;

-- Service role flag (set via: SELECT set_config('app.role','service_role',false);)
CREATE OR REPLACE FUNCTION is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('app.role', true), '') = 'service_role';
$$;

-- ========================================
-- RLS POLICIES
-- ========================================

-- Tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenants
  FOR ALL
  USING (is_service_role() OR id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (is_service_role() OR id = current_setting('app.tenant_id', true)::uuid);

-- Staff
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON staff
  FOR ALL
  USING (is_service_role() OR tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (is_service_role() OR tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Services
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON services
  FOR ALL
  USING (is_service_role() OR tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (is_service_role() OR tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Service Duration Overrides
ALTER TABLE service_duration_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON service_duration_overrides
  FOR ALL
  USING (is_service_role() OR tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (is_service_role() OR tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clients
  FOR ALL
  USING (is_service_role() OR tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (is_service_role() OR tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON appointments
  FOR ALL
  USING (is_service_role() OR tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (is_service_role() OR tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Message Log
ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON message_log
  FOR ALL
  USING (is_service_role() OR tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (is_service_role() OR tenant_id = current_setting('app.tenant_id', true)::uuid);

-- AI Decisions
ALTER TABLE ai_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ai_decisions
  FOR ALL
  USING (is_service_role() OR tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (is_service_role() OR tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Cases
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON cases
  FOR ALL
  USING (is_service_role() OR tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (is_service_role() OR tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ========================================
-- UPDATED_AT TRIGGERS
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_duration_overrides_updated_at BEFORE UPDATE ON service_duration_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

