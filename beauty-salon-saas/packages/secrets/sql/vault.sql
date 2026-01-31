-- Supabase Vault setup (ADR-012)
-- Enables pgsodium, creates vault schema, functions, view, permissions, and audit log.

-- ========================================
-- EXTENSIONS + SCHEMA
-- ========================================

CREATE EXTENSION IF NOT EXISTS pgsodium;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS vault;

-- Ensure backend_role exists (optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'backend_role') THEN
    CREATE ROLE backend_role NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;

-- ========================================
-- TABLES
-- ========================================

CREATE TABLE IF NOT EXISTS vault.secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  secret text NOT NULL, -- Encrypted
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vault.secret_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_name text NOT NULL,
  accessed_by text NOT NULL,
  action text NOT NULL, -- 'read', 'create', 'update', 'delete'
  accessed_at timestamptz DEFAULT now()
);

-- ========================================
-- HELPERS
-- ========================================

CREATE OR REPLACE FUNCTION vault.set_encryption_key(encryption_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.encryption_key', encryption_key, true);
END;
$$;

CREATE OR REPLACE FUNCTION vault.ensure_encryption_key()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF current_setting('app.encryption_key', true) IS NULL THEN
    RAISE EXCEPTION 'app.encryption_key is not set'
      USING HINT = 'Call vault.set_encryption_key(<key>) before using vault functions.';
  END IF;
END;
$$;

-- ========================================
-- VAULT FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION vault.create_secret(
  secret_name text,
  secret_value text,
  secret_description text DEFAULT NULL,
  encryption_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_secret_id uuid;
BEGIN
  IF encryption_key IS NOT NULL THEN
    PERFORM set_config('app.encryption_key', encryption_key, true);
  END IF;

  PERFORM vault.ensure_encryption_key();

  INSERT INTO vault.secrets (name, secret, description)
  VALUES (
    secret_name,
    pgsodium.crypto_aead_det_encrypt(
      secret_value::bytea,
      secret_name::bytea,
      current_setting('app.encryption_key')::bytea
    )::text,
    secret_description
  )
  ON CONFLICT (name) DO UPDATE
    SET secret = EXCLUDED.secret,
        description = EXCLUDED.description,
        updated_at = now()
  RETURNING id INTO new_secret_id;

  RETURN new_secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION vault.read_secret(
  secret_name text,
  encryption_key text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  decrypted_value text;
BEGIN
  IF encryption_key IS NOT NULL THEN
    PERFORM set_config('app.encryption_key', encryption_key, true);
  END IF;

  PERFORM vault.ensure_encryption_key();

  SELECT pgsodium.crypto_aead_det_decrypt(
    secret::bytea,
    name::bytea,
    current_setting('app.encryption_key')::bytea
  )::text
  INTO decrypted_value
  FROM vault.secrets
  WHERE name = secret_name;

  INSERT INTO vault.secret_access_log (secret_name, accessed_by, action)
  VALUES (secret_name, current_user, 'read');

  RETURN decrypted_value;
END;
$$;

CREATE OR REPLACE FUNCTION vault.read_secrets(
  secret_names text[],
  encryption_key text DEFAULT NULL
)
RETURNS TABLE(name text, secret text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF encryption_key IS NOT NULL THEN
    PERFORM set_config('app.encryption_key', encryption_key, true);
  END IF;

  PERFORM vault.ensure_encryption_key();

  INSERT INTO vault.secret_access_log (secret_name, accessed_by, action)
  SELECT s.name, current_user, 'read'
  FROM vault.secrets s
  WHERE s.name = ANY(secret_names);

  RETURN QUERY
  SELECT
    s.name,
    pgsodium.crypto_aead_det_decrypt(
      s.secret::bytea,
      s.name::bytea,
      current_setting('app.encryption_key')::bytea
    )::text
  FROM vault.secrets s
  WHERE s.name = ANY(secret_names)
  ORDER BY s.name;
END;
$$;

CREATE OR REPLACE FUNCTION vault.delete_secret(secret_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE name = secret_name;
END;
$$;

CREATE OR REPLACE FUNCTION vault.list_secrets()
RETURNS TABLE(name text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT s.name FROM vault.secrets s ORDER BY s.name;
$$;

-- Convenience view (requires access)
CREATE OR REPLACE VIEW vault.decrypted_secrets AS
SELECT
  id,
  name,
  vault.read_secret(name) AS secret,
  description,
  created_at,
  updated_at
FROM vault.secrets;

-- ========================================
-- AUDIT LOG (INSERT/UPDATE/DELETE)
-- ========================================

CREATE OR REPLACE FUNCTION vault.log_secret_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO vault.secret_access_log (secret_name, accessed_by, action)
  VALUES (
    COALESCE(NEW.name, OLD.name),
    current_user,
    TG_OP
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS secret_access_trigger ON vault.secrets;
CREATE TRIGGER secret_access_trigger
AFTER INSERT OR UPDATE OR DELETE ON vault.secrets
FOR EACH ROW
EXECUTE FUNCTION vault.log_secret_access();

-- ========================================
-- PERMISSIONS
-- ========================================

REVOKE ALL ON vault.secrets FROM PUBLIC;
REVOKE ALL ON vault.decrypted_secrets FROM PUBLIC;
REVOKE ALL ON vault.secret_access_log FROM PUBLIC;

GRANT SELECT ON vault.decrypted_secrets TO backend_role, service_role;
GRANT SELECT ON vault.secret_access_log TO backend_role, service_role;
GRANT EXECUTE ON FUNCTION vault.set_encryption_key TO backend_role, service_role;
GRANT EXECUTE ON FUNCTION vault.create_secret TO backend_role, service_role;
GRANT EXECUTE ON FUNCTION vault.read_secret TO backend_role, service_role;
GRANT EXECUTE ON FUNCTION vault.read_secrets TO backend_role, service_role;
GRANT EXECUTE ON FUNCTION vault.delete_secret TO backend_role, service_role;
GRANT EXECUTE ON FUNCTION vault.list_secrets TO backend_role, service_role;

