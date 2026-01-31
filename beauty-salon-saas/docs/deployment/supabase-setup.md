# Supabase Setup Guide

## 🎯 Objective

Setup Supabase as our primary database with:
- PostgreSQL 15+ with Row-Level Security (RLS)
- Multi-tenant isolation
- Real-time subscriptions
- Authentication

## 📋 Prerequisites

- Supabase account (https://supabase.com)
- Node.js 20+
- Basic PostgreSQL knowledge

---

## 🚀 Step 1: Create Supabase Project

1. Go to https://app.supabase.com
2. Click **"New Project"**
3. Fill in details:
   - **Name**: `beauty-salon-saas-prod` (or `beauty-salon-saas-dev` for development)
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier for development, Pro for production

4. Wait for project to be provisioned (~2 minutes)

---

## 🔑 Step 2: Get Credentials

Once project is ready, go to **Settings** → **API**:

1. **Project URL**: `https://[project-ref].supabase.co`
2. **Anon (public) key**: `eyJhbGc...` (for client-side)
3. **Service role key**: `eyJhbGc...` (for server-side, keep secret!)

Go to **Settings** → **Database**:

4. **Connection String** (URI):
   ```
   postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   ```

5. **Direct Connection** (for migrations):
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
   ```

---

## 📝 Step 3: Update Environment Variables

Copy credentials to `.env`:

```bash
cd beauty-salon-saas
cp .env.example .env
```

Edit `.env`:

```env
# Supabase
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Direct connection (for migrations)
DATABASE_DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

---

## 🗄️ Step 4: Run Database Migrations

We'll use Prisma for schema management:

```bash
# Install Prisma
npm install prisma @prisma/client --save-dev

# Initialize Prisma (already done in packages/database)
# npx prisma init

# Generate Prisma client
cd packages/database
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Or for development (creates new migration)
npx prisma migrate dev --name init
```

---

## 🔐 Step 5: Enable Row-Level Security (RLS)

RLS is **CRITICAL** for multi-tenant isolation.

In Supabase Dashboard, go to **SQL Editor** and run:

```sql
-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_duration_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (see migrations/001_rls_policies.sql)
```

---

## 🧪 Step 6: Test Connection

Create a test script:

```bash
cd packages/database
npm run test:connection
```

Or manually:

```javascript
// test-connection.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Testing Supabase connection...');

  const result = await prisma.$queryRaw`SELECT version()`;
  console.log('✅ Connected to PostgreSQL:', result[0].version);

  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;
  console.log('📊 Tables:', tables.map(t => t.tablename));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run:
```bash
node test-connection.js
```

Expected output:
```
Testing Supabase connection...
✅ Connected to PostgreSQL: PostgreSQL 15.x on x86_64-pc-linux-gnu
📊 Tables: [ 'tenants', 'staff', 'services', ... ]
```

---

## 🔧 Step 7: Configure Extensions

Enable required PostgreSQL extensions in **SQL Editor**:

```sql
-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Partitioning (for pg_partman)
CREATE EXTENSION IF NOT EXISTS pg_partman;

-- Full-text search (optional)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- TimescaleDB (for time-series data, optional)
-- CREATE EXTENSION IF NOT EXISTS timescaledb;
```

---

## 📊 Step 8: Setup Partitioning for High-Volume Tables

For `message_log` (20M msgs/day):

```sql
-- Create partitioned table (see migrations/002_partitioning.sql)
SELECT create_parent(
  'public.message_log',
  'created_at',
  'native',
  'monthly'
);

-- Set retention: keep 90 days
UPDATE partman.part_config
SET retention_keep_table = false,
    retention = '90 days'
WHERE parent_table = 'public.message_log';
```

---

## 🔄 Step 9: Setup Realtime (Optional)

Enable realtime for specific tables in **Database** → **Replication**:

1. Enable replication for:
   - `appointments` (for live dashboard updates)
   - `message_log` (for live chat)
   - `ai_decisions` (for AI activity log)

2. In code, subscribe:
```typescript
const channel = supabase
  .channel('appointments-channel')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'appointments' },
    (payload) => console.log('Change:', payload)
  )
  .subscribe();
```

---

## 🎉 Step 10: Verification Checklist

- [ ] ✅ Supabase project created
- [ ] ✅ Credentials copied to `.env`
- [ ] ✅ Database migrations run successfully
- [ ] ✅ RLS enabled on all tables
- [ ] ✅ RLS policies created
- [ ] ✅ Connection test passed
- [ ] ✅ Extensions enabled
- [ ] ✅ Partitioning configured
- [ ] ✅ Realtime enabled (optional)

---

## 📚 Next Steps

1. **Create seed data**: `npm run db:seed`
2. **Setup Redis**: See `docs/deployment/redis-setup.md`
3. **Start Sprint 1**: Begin implementing booking API

---

## 🚨 Troubleshooting

### Connection Error: "Could not connect to database"
- Check firewall rules
- Verify password (no special chars that need escaping)
- Use direct connection string for migrations

### RLS Error: "permission denied for table"
- Ensure RLS policies are created
- Check `tenant_id` is set: `SET app.tenant_id = 'uuid-here'`

### Migration Error: "relation already exists"
- Reset database: `npx prisma migrate reset` (⚠️ destroys data!)
- Or drop tables manually and re-run

---

## 📖 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [PostgreSQL RLS Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Our Architecture Plan](../../.claude/plans/sharded-marinating-balloon.md)

---

**Status**: Ready for implementation
**Last Updated**: 2026-01-22
