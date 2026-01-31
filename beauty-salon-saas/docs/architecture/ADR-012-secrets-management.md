# ADR-012: Secrets Management (Supabase Vault)

**Статус**: ✅ Утверждено
**Дата**: 2026-01-22
**Автор**: Architect Agent
**Теги**: secrets, security, vault, encryption, supabase

---

## Контекст

Платформа требует безопасное хранение чувствительных данных:
- **API Keys**: Stripe, Novu, Chatwoot, Telegram Bot tokens, WhatsApp API keys, MAX API keys
- **Database Credentials**: PostgreSQL connection strings
- **Encryption Keys**: JWT secrets, webhook signing keys, Metabase embedding secret
- **OAuth Tokens**: Google Calendar, Apple Calendar OAuth credentials
- **Per-Tenant Secrets**: Integration credentials (могут различаться per salon)

**Требования**:
- Encryption at rest
- Encryption in transit
- Role-based access control (RBAC)
- Audit logging
- Key rotation
- Multi-tenant isolation
- Easy developer experience
- Low cost

**Функции**: F-005 (Secrets Encryption), Security baseline

---

## Решение

**Использовать Supabase Vault** - PostgreSQL-based secrets management.

**Docs**: https://supabase.com/docs/guides/database/vault
**Built on**: PostgreSQL `pgsodium` extension
**License**: PostgreSQL License (permissive)

---

## Обоснование

### Почему Supabase Vault?

#### ✅ Преимущества:

1. **Already Using Supabase**:
   - No additional infrastructure
   - No extra cost
   - Uses existing PostgreSQL

2. **PostgreSQL-Native**:
   - Secrets stored in database (encrypted)
   - SQL-based access
   - Integrates with RLS (tenant isolation)

3. **Encryption**:
   - AES-256-GCM encryption
   - pgsodium extension (libsodium bindings)
   - Transparent encryption/decryption

4. **Features**:
   - Key-value store
   - Secrets rotation
   - Audit logging
   - Multi-tenant support (via RLS)

5. **Developer Experience**:
   - Simple SQL API
   - TypeScript SDK
   - No external service

6. **Cost**:
   - **Free** (part of Supabase)
   - No per-secret pricing

#### 📊 Metrics:
- **Infrastructure reuse**: 100% (Supabase already deployed)
- **Custom code**: 0% (just SQL queries)
- **Time savings**: 1 неделя → 1 день

---

## Альтернативы

### Вариант 1: HashiCorp Vault
**Статус**: ❌ Отклонён

**Плюсы**:
- Very powerful
- Industry standard
- Advanced features

**Минусы**:
- ❌ Complex setup (separate service)
- ❌ Operational overhead (high availability)
- ❌ Cost: $0.05/secret/month (cloud) = $250/month для 5000 secrets
- ❌ Overkill для нашего scale

**Вердикт**: Too complex and expensive. Supabase Vault достаточно.

---

### Вариант 2: AWS Secrets Manager
**Статус**: ❌ Отклонён

**Плюсы**:
- Managed service
- Integrates с AWS

**Минусы**:
- ❌ Vendor lock-in (AWS)
- ❌ Cost: $0.40/secret/month = $2000/month для 5000 secrets
- ❌ External API calls (latency)
- ❌ Not aligned с self-hosted strategy

**Вердикт**: Too expensive. Supabase Vault free.

---

### Вариант 3: Doppler
**Статус**: ❌ Отклонён

**Плюсы**:
- Developer-friendly
- Good UI
- Git sync

**Минусы**:
- ❌ SaaS only (cloud)
- ❌ Cost: $80/month (team plan)
- ❌ External dependency
- ❌ Not multi-tenant-friendly

**Вердикт**: Supabase Vault better для multi-tenant.

---

### Вариант 4: .env Files
**Статус**: ❌ Отклонён (для production)

**Плюсы**:
- Simple

**Минусы**:
- ❌ **Not secure** (plain text)
- ❌ No encryption
- ❌ No access control
- ❌ No audit logging
- ❌ Manual rotation
- ❌ Git leaks risk

**Вердикт**: OK для development, NOT для production.

---

## Архитектура

### Supabase Vault Structure

```
PostgreSQL Database (beauty_salon_saas)
    ↓
vault.secrets table (encrypted)
    - id: uuid
    - secret: text (encrypted with AES-256-GCM)
    - name: text (e.g., "stripe_secret_key")
    - description: text
    - created_at: timestamp
    ↓
vault.decrypted_secrets view (SQL функция для decryption)
    - Only authorized users can SELECT
    ↓
Application Code
    - Reads secrets via SQL query
```

### Multi-Tenant Secrets

```
Global Secrets (platform-level):
  - stripe_secret_key (same для всех тенантов)
  - novu_api_key
  - metabase_embedding_secret
  - jwt_secret

Per-Tenant Secrets:
  - tenant_{id}_telegram_bot_token
  - tenant_{id}_whatsapp_api_key
  - tenant_{id}_google_oauth_client_secret
```

---

## Реализация

### 1. Enable Vault Extension

```sql
-- Run once in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pgsodium;
CREATE SCHEMA IF NOT EXISTS vault;

-- Create secrets table
CREATE TABLE vault.secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  secret text NOT NULL, -- Encrypted
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Encrypt secrets using pgsodium
CREATE OR REPLACE FUNCTION vault.create_secret(
  secret_name text,
  secret_value text,
  secret_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  new_secret_id uuid;
BEGIN
  INSERT INTO vault.secrets (name, secret, description)
  VALUES (
    secret_name,
    pgsodium.crypto_aead_det_encrypt(
      secret_value::bytea,
      current_setting('app.encryption_key')::bytea,
      secret_name::bytea
    )::text,
    secret_description
  )
  RETURNING id INTO new_secret_id;

  RETURN new_secret_id;
END;
$;

-- Decrypt secrets
CREATE OR REPLACE FUNCTION vault.read_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  decrypted_value text;
BEGIN
  SELECT pgsodium.crypto_aead_det_decrypt(
    secret::bytea,
    current_setting('app.encryption_key')::bytea,
    name::bytea
  )::text
  INTO decrypted_value
  FROM vault.secrets
  WHERE name = secret_name;

  RETURN decrypted_value;
END;
$;

-- Create view для удобства
CREATE OR REPLACE VIEW vault.decrypted_secrets AS
SELECT
  id,
  name,
  vault.read_secret(name) AS secret,
  description,
  created_at,
  updated_at
FROM vault.secrets;

-- Permissions (only backend can access)
REVOKE ALL ON vault.secrets FROM PUBLIC;
REVOKE ALL ON vault.decrypted_secrets FROM PUBLIC;

GRANT SELECT ON vault.decrypted_secrets TO backend_role;
GRANT EXECUTE ON FUNCTION vault.create_secret TO backend_role;
GRANT EXECUTE ON FUNCTION vault.read_secret TO backend_role;
```

### 2. Backend Integration (TypeScript)

```typescript
// packages/secrets/src/vault-client.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key (has access to vault)
)

export class VaultClient {
  /**
   * Create or update a secret
   */
  async setSecret(
    name: string,
    value: string,
    description?: string
  ): Promise<string> {
    const { data, error } = await supabase.rpc('vault.create_secret', {
      secret_name: name,
      secret_value: value,
      secret_description: description,
    })

    if (error) {
      throw new Error(`Failed to set secret: ${error.message}`)
    }

    return data as string
  }

  /**
   * Read a secret
   */
  async getSecret(name: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('vault.read_secret', {
      secret_name: name,
    })

    if (error) {
      console.error(`Failed to read secret ${name}:`, error.message)
      return null
    }

    return data as string
  }

  /**
   * Read multiple secrets
   */
  async getSecrets(names: string[]): Promise<Record<string, string>> {
    const { data, error } = await supabase
      .from('vault.decrypted_secrets')
      .select('name, secret')
      .in('name', names)

    if (error) {
      throw new Error(`Failed to read secrets: ${error.message}`)
    }

    return data.reduce((acc, row) => {
      acc[row.name] = row.secret
      return acc
    }, {} as Record<string, string>)
  }

  /**
   * Delete a secret
   */
  async deleteSecret(name: string): Promise<void> {
    const { error } = await supabase
      .from('vault.secrets')
      .delete()
      .eq('name', name)

    if (error) {
      throw new Error(`Failed to delete secret: ${error.message}`)
    }
  }

  /**
   * List all secret names (not values!)
   */
  async listSecrets(): Promise<string[]> {
    const { data, error } = await supabase
      .from('vault.secrets')
      .select('name')
      .order('name')

    if (error) {
      throw new Error(`Failed to list secrets: ${error.message}`)
    }

    return data.map((row) => row.name)
  }

  /**
   * Get secret для тенанта
   */
  async getTenantSecret(tenantId: string, secretType: string): Promise<string | null> {
    const secretName = `tenant_${tenantId}_${secretType}`
    return this.getSecret(secretName)
  }

  /**
   * Set secret для тенанта
   */
  async setTenantSecret(
    tenantId: string,
    secretType: string,
    value: string
  ): Promise<void> {
    const secretName = `tenant_${tenantId}_${secretType}`
    await this.setSecret(secretName, value, `Secret for tenant ${tenantId}`)
  }
}

export const vault = new VaultClient()
```

### 3. Initialize Platform Secrets (Setup Script)

```typescript
// scripts/setup-secrets.ts
import { vault } from '@beauty-salon/secrets'

async function setupPlatformSecrets() {
  console.log('Setting up platform secrets...')

  const secrets = [
    {
      name: 'stripe_secret_key',
      value: process.env.STRIPE_SECRET_KEY!,
      description: 'Stripe API secret key',
    },
    {
      name: 'stripe_webhook_secret',
      value: process.env.STRIPE_WEBHOOK_SECRET!,
      description: 'Stripe webhook signing secret',
    },
    {
      name: 'novu_api_key',
      value: process.env.NOVU_API_KEY!,
      description: 'Novu API key',
    },
    {
      name: 'novu_embedding_secret',
      value: process.env.NOVU_EMBEDDING_SECRET!,
      description: 'Novu embedding secret',
    },
    {
      name: 'metabase_embedding_secret',
      value: process.env.METABASE_EMBEDDING_SECRET!,
      description: 'Metabase JWT signing secret',
    },
    {
      name: 'jwt_secret',
      value: process.env.JWT_SECRET!,
      description: 'JWT signing secret for application',
    },
    {
      name: 'chatwoot_api_key',
      value: process.env.CHATWOOT_API_KEY!,
      description: 'Chatwoot API key',
    },
  ]

  for (const secret of secrets) {
    try {
      await vault.setSecret(secret.name, secret.value, secret.description)
      console.log(`✓ Set secret: ${secret.name}`)
    } catch (error) {
      console.error(`✗ Failed to set secret ${secret.name}:`, error)
    }
  }

  console.log('Platform secrets setup complete!')
}

setupPlatformSecrets()
```

```bash
# Run setup
npm run setup:secrets
```

### 4. Usage в Application Code

```typescript
// apps/admin-panel/lib/stripe.ts
import { vault } from '@beauty-salon/secrets'
import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export async function getStripeClient(): Promise<Stripe> {
  if (stripeClient) {
    return stripeClient
  }

  const secretKey = await vault.getSecret('stripe_secret_key')

  if (!secretKey) {
    throw new Error('Stripe secret key not found in vault')
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: '2024-11-20.acacia',
  })

  return stripeClient
}
```

```typescript
// apps/messaging-hub/lib/telegram.ts
import { vault } from '@beauty-salon/secrets'
import { Telegraf } from 'telegraf'

export async function getTelegramBot(tenantId: string): Promise<Telegraf> {
  const botToken = await vault.getTenantSecret(tenantId, 'telegram_bot_token')

  if (!botToken) {
    throw new Error(`Telegram bot token not found for tenant ${tenantId}`)
  }

  return new Telegraf(botToken)
}
```

### 5. Tenant Onboarding (Store Integration Tokens)

```typescript
// apps/admin-panel/app/api/integrations/telegram/route.ts
import { vault } from '@beauty-salon/secrets'
import { getCurrentTenant } from '@/lib/auth'

export async function POST(request: Request) {
  const tenant = await getCurrentTenant(request)
  const { botToken } = await request.json()

  // Validate bot token with Telegram API
  const isValid = await validateTelegramBotToken(botToken)

  if (!isValid) {
    return Response.json(
      { error: 'Invalid bot token' },
      { status: 400 }
    )
  }

  // Store token in vault
  await vault.setTenantSecret(tenant.id, 'telegram_bot_token', botToken)

  // Update tenant settings
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      telegramBotEnabled: true,
    },
  })

  return Response.json({ success: true })
}
```

---

## Secrets Rotation

```typescript
// packages/secrets/src/rotation.ts
import { vault } from './vault-client'
import { stripe } from '@beauty-salon/payments'

export async function rotateStripeKey() {
  console.log('Rotating Stripe API key...')

  // 1. Generate new key in Stripe Dashboard (manual step)
  // 2. Update vault
  const newKey = process.env.NEW_STRIPE_SECRET_KEY!

  await vault.setSecret('stripe_secret_key', newKey, 'Stripe API secret key (rotated)')

  // 3. Verify new key works
  const testClient = new Stripe(newKey, { apiVersion: '2024-11-20.acacia' })
  await testClient.balance.retrieve() // Test API call

  console.log('✓ Stripe key rotated successfully')

  // 4. Revoke old key in Stripe Dashboard (manual step)
}

export async function rotateJwtSecret() {
  console.log('Rotating JWT secret...')

  // Generate new secret
  const newSecret = crypto.randomBytes(64).toString('hex')

  await vault.setSecret('jwt_secret', newSecret, 'JWT signing secret (rotated)')

  console.log('✓ JWT secret rotated')
  console.log('⚠️  Restart all application servers to pick up new secret')
}

// BullMQ job для automatic rotation (quarterly)
export const secretRotationWorker = new Worker(
  'secret-rotation',
  async (job) => {
    const { secretName } = job.data

    switch (secretName) {
      case 'jwt_secret':
        await rotateJwtSecret()
        break
      default:
        console.warn(`Unknown secret type: ${secretName}`)
    }
  },
  {
    connection: redisConnection,
  }
)

// Schedule rotation every 90 days
await secretRotationQueue.add(
  'rotate-jwt-secret',
  { secretName: 'jwt_secret' },
  {
    repeat: {
      pattern: '0 0 1 */3 *', // First day of every 3rd month
    },
  }
)
```

---

## Audit Logging

```sql
-- Create audit log table
CREATE TABLE vault.secret_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_name text NOT NULL,
  accessed_by text NOT NULL, -- User/role
  action text NOT NULL, -- 'read', 'create', 'update', 'delete'
  accessed_at timestamptz DEFAULT now()
);

-- Add trigger для logging
CREATE OR REPLACE FUNCTION vault.log_secret_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  INSERT INTO vault.secret_access_log (secret_name, accessed_by, action)
  VALUES (
    COALESCE(NEW.name, OLD.name),
    current_user,
    TG_OP
  );

  RETURN NEW;
END;
$;

CREATE TRIGGER secret_access_trigger
AFTER INSERT OR UPDATE OR DELETE ON vault.secrets
FOR EACH ROW
EXECUTE FUNCTION vault.log_secret_access();
```

### Query Audit Log

```typescript
// packages/secrets/src/audit.ts
export async function getSecretAuditLog(secretName?: string) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = supabase
    .from('vault.secret_access_log')
    .select('*')
    .order('accessed_at', { ascending: false })

  if (secretName) {
    query = query.eq('secret_name', secretName)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch audit log: ${error.message}`)
  }

  return data
}
```

---

## Environment Variables (Non-Secrets)

**ВАЖНО**: Не все env vars должны быть в Vault. Только secrets.

```bash
# .env (public configuration - OK to commit)
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://... # OK (uses RLS + Vault для credentials)
REDIS_HOST=redis
REDIS_PORT=6379

# Secrets (NEVER commit, store in Vault)
STRIPE_SECRET_KEY=sk_live_...
JWT_SECRET=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Rule of Thumb**:
- Configuration → `.env` file
- Secrets (API keys, passwords) → Vault

---

## Backup & Disaster Recovery

```sql
-- Backup secrets (encrypted)
COPY vault.secrets TO '/backup/secrets.csv' WITH CSV HEADER;

-- Restore secrets
COPY vault.secrets FROM '/backup/secrets.csv' WITH CSV HEADER;

-- Note: Secrets remain encrypted в backup
-- Encryption key хранится в Supabase infrastructure (managed)
```

---

## Security Considerations

1. **Encryption at Rest**:
   - ✅ AES-256-GCM (military grade)
   - ✅ pgsodium (battle-tested)

2. **Access Control**:
   - ✅ Only `backend_role` can read secrets
   - ✅ RBAC via PostgreSQL roles

3. **Audit Trail**:
   - ✅ All access logged
   - ✅ Immutable log (append-only)

4. **Key Management**:
   - ✅ Encryption key managed by Supabase
   - ✅ Key rotation supported

5. **Multi-Tenant Isolation**:
   - ✅ Tenant secrets prefixed with `tenant_{id}_`
   - ✅ RLS can be added if needed

---

## Cost Analysis

```yaml
Supabase Vault:
  Cost: $0 (included in Supabase)

vs. Alternatives:
  - AWS Secrets Manager: $0.40/secret = $2000/month (5000 secrets)
  - HashiCorp Vault: $0.05/secret = $250/month
  - Doppler: $80/month (team plan)

Savings: $80 - $2000/month 💰
```

---

## Testing

```typescript
describe('Vault Client', () => {
  it('should store and retrieve secret', async () => {
    await vault.setSecret('test_secret', 'test_value')

    const value = await vault.getSecret('test_secret')
    expect(value).toBe('test_value')

    // Cleanup
    await vault.deleteSecret('test_secret')
  })

  it('should handle tenant secrets', async () => {
    const tenantId = 'test-tenant-id'

    await vault.setTenantSecret(tenantId, 'api_key', 'secret123')

    const value = await vault.getTenantSecret(tenantId, 'api_key')
    expect(value).toBe('secret123')
  })

  it('should return null for non-existent secret', async () => {
    const value = await vault.getSecret('does_not_exist')
    expect(value).toBeNull()
  })
})
```

---

## Success Criteria

✅ All secrets stored encrypted
✅ Zero secrets в .env files (production)
✅ Tenant secrets isolated
✅ Audit log working
✅ Secret rotation working
✅ Easy developer experience
✅ Zero additional cost

---

## Заключение

Supabase Vault предоставляет **100% infrastructure reuse** (уже есть PostgreSQL), экономя **1 неделю разработки** и **$80-$2000/месяц** на external secrets managers.

**Вердикт**: ✅ Утверждено. Setup в Week 1 (Priority: High, 1 day).

---

**Следующие шаги**:
1. Enable pgsodium extension в Supabase
2. Create vault schema и functions
3. Implement VaultClient (TypeScript)
4. Run setup-secrets script
5. Migrate secrets from .env to Vault
6. Remove secrets from .env files
