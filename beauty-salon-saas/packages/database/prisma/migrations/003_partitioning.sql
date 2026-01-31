-- Migration: Partitioning for high-volume tables (optional)
-- Created: 2026-01-22
-- Description: Monthly partitions for message_log (enable when needed)

-- ========================================
-- ENABLE PG_PARTMAN (OPTIONAL)
-- ========================================

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_partman;
EXCEPTION
  WHEN undefined_file THEN
    RAISE NOTICE 'pg_partman not available, skipping partitioning setup';
END $$;

-- ========================================
-- PARTITIONING NOTES
-- ========================================
-- This migration is optional for MVP/local dev.
-- Enable once message volume is high (1M+ / day).
-- Supabase: pg_partman available on Pro tier; pg_cron not available.

-- ========================================
-- EXAMPLE: CONVERT message_log TO PARTITIONED TABLE
-- ========================================
-- WARNING: Converting an existing table requires careful migration.
-- For fresh installs, you can replace the message_log table with a
-- partitioned parent and then create partitions.

-- Example (fresh install only):
-- DROP TABLE IF EXISTS message_log CASCADE;
-- CREATE TABLE message_log (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
--   client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
--   channel "Channel" NOT NULL,
--   direction "Direction" NOT NULL,
--   message_type "MessageType" NOT NULL,
--   content TEXT,
--   metadata JSONB,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
-- ) PARTITION BY RANGE (created_at);

-- ========================================
-- EXAMPLE: SETUP PARTMAN
-- ========================================
-- SELECT partman.create_parent(
--   'public.message_log',
--   'created_at',
--   'native',
--   'monthly',
--   p_premake := 3
-- );

-- Set retention policy (optional)
-- UPDATE partman.part_config
-- SET retention = '90 days',
--     retention_keep_table = false,
--     infinite_time_partitions = true
-- WHERE parent_table = 'public.message_log';

-- ========================================
-- EXAMPLE: INITIAL PARTITIONS (2026)
-- ========================================
-- CREATE TABLE message_log_p2026_01 PARTITION OF message_log
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
-- CREATE TABLE message_log_p2026_02 PARTITION OF message_log
--   FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- CREATE TABLE message_log_p2026_03 PARTITION OF message_log
--   FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- ========================================
-- MAINTENANCE
-- ========================================
-- If pg_cron is available, schedule:
-- SELECT cron.schedule(
--   'partition-maintenance',
--   '0 3 * * *',
--   $$SELECT partman.run_maintenance()$$
-- );
-- Otherwise, run manually:
-- SELECT partman.run_maintenance();
