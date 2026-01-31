# Docker Compose Setup Guide

## 🐳 Quick Start

Start all services:
```bash
docker-compose up -d
```

Stop all services:
```bash
docker-compose down
```

Stop and remove volumes (⚠️ deletes data):
```bash
docker-compose down -v
```

---

## 📦 Services

### PostgreSQL (Port 5433)
- **User**: `postgres`
- **Password**: `postgres`
- **Database**: `beauty_salon_saas`
- **Connection**: `postgresql://postgres:postgres@localhost:5433/beauty_salon_saas`

### Redis (Port 6380)
- **Password**: none (local dev)
- **Connection**: `redis://localhost:6380`

### pgAdmin (Port 8080)
- **URL**: http://localhost:8080
- **Email**: `admin@beauty-salon.local`
- **Password**: `admin`

**Add Server in pgAdmin**:
1. Right-click "Servers" → "Register" → "Server"
2. Name: `Beauty Salon Local`
3. Connection tab:
   - Host: `postgres` (or `host.docker.internal` on Mac)
   - Port: `5432` (container) / `5433` (host)
   - Username: `postgres`
   - Password: `postgres`

### Redis Commander (Port 8081)
- **URL**: http://localhost:8081
- Visual Redis management

---

## 🚀 Setup Database

After starting Docker Compose:

```bash
# Go to database package
cd packages/database

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Apply RLS policies (required)
npx prisma db execute --file prisma/migrations/002_rls.sql

# Optional: enable partitioning (requires pg_partman)
npx prisma db execute --file prisma/migrations/003_partitioning.sql

# Seed database
npm run db:seed

# Open Prisma Studio (database GUI)
npx prisma studio
```

---

## 🔧 Environment Variables

For local development, update `.env`:

```env
# Local PostgreSQL (instead of Supabase)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/beauty_salon_saas
DATABASE_DIRECT_URL=postgresql://postgres:postgres@localhost:5433/beauty_salon_saas

# Local Redis
REDIS_URL=redis://localhost:6380
```

---

## ?? Vault (pgsodium) ? ???????? + fallback ?? Supabase

### ???????????
- ? `docker-compose.yml` ???????????? ????? Postgres ? pgsodium: `supabase/postgres:15.1.1.78`.
- ????? `psql` ?? ????????? ??????.
- ???? `SUPABASE_URL` ? `SUPABASE_SERVICE_ROLE_KEY` ?? ??????, Vault ???????? ????? ????????? Postgres (`DATABASE_URL`).

### 1) ????????? ????? Vault (????????)

```bash
# PowerShell:
Get-Content -Raw packages\secrets\sql\vault.sql | docker exec -i beauty-salon-postgres psql -U postgres -d beauty_salon_saas

# Linux/macOS:
cat packages/secrets/sql/vault.sql | docker exec -i beauty-salon-postgres psql -U postgres -d beauty_salon_saas
```

### 2) ????????????? ????????

??????????? env vars (???????: `VAULT_ENCRYPTION_KEY` + 5+ ????????):

```bash
set VAULT_ENCRYPTION_KEY=your-key
set STRIPE_SECRET_KEY=sk_test_...
set STRIPE_WEBHOOK_SECRET=whsec_...
set NOVU_API_KEY=novu-...
set METABASE_EMBEDDING_SECRET=...
set JWT_SECRET=...
set CHATWOOT_API_KEY=...

# ?? ????? ???????????
npm run setup:secrets
```

?????? ??? ???????? `vault.set_encryption_key(...)` ????? ??????? ????????. ??????????? ? `packages/secrets/README.md`.

### 3) ???????? audit-???? (????????)

```bash
docker exec beauty-salon-postgres psql -U postgres -d beauty_salon_saas -c "SELECT secret_name, action, accessed_by, accessed_at FROM vault.secret_access_log ORDER BY accessed_at DESC LIMIT 5;"
```

---

## 🧪 Test Connection

```bash
cd packages/database
npm run test:connection
```

Expected output:
```
🔌 Testing Supabase connection...

✅ Connected to PostgreSQL
   Version: 15.x

📊 Database tables:
   - tenants
   - staff
   - services
   ...
```

---

## 📊 Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **pgAdmin** | http://localhost:8080 | admin@beauty-salon.local / admin |
| **Redis Commander** | http://localhost:8081 | - |
| **Prisma Studio** | http://localhost:5555 | (run `npx prisma studio`) |

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
netstat -ano | findstr :5433  # Windows
lsof -i :5433                 # Mac/Linux

# Kill the process or change port in docker-compose.yml
```

### Cannot Connect to PostgreSQL

```bash
# Check if container is running
docker ps

# Check logs
docker logs beauty-salon-postgres

# Restart container
docker-compose restart postgres
```

### Redis Connection Error

```bash
# Check Redis logs
docker logs beauty-salon-redis

# Test connection
docker exec -it beauty-salon-redis redis-cli ping
# Should return: PONG
```

---

## 🔄 Reset Everything

```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Re-run migrations
cd packages/database
npx prisma migrate dev
npm run db:seed
```

---

## 📝 Notes

* **Production**: Use Supabase (managed PostgreSQL + RLS + Realtime)
* **Local Dev**: Use Docker Compose (faster, offline-capable)
* **Volumes**: Data persists between restarts (use `docker-compose down -v` to reset)
* **Network**: All services are on `beauty-salon-network`

---

## ⚡ Performance Tips

### PostgreSQL

```sql
-- Check slow queries
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check connections
SELECT count(*) FROM pg_stat_activity;

-- Analyze table
ANALYZE appointments;
```

### Redis

```bash
# Monitor Redis commands
docker exec -it beauty-salon-redis redis-cli monitor

# Get stats
docker exec -it beauty-salon-redis redis-cli info stats
```

---

## 🚀 Next Steps

1. Start Docker Compose
2. Run migrations
3. Seed database
4. Start developing!

See [supabase-setup.md](./supabase-setup.md) for production setup.
