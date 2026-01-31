# Secrets Package

Supabase Vault client and helpers.

## Setup (once per database)

Run the SQL in `packages/secrets/sql/vault.sql` using Supabase SQL Editor or `psql`.

### Local Postgres (Docker)

1) Start services:
```bash
docker-compose up -d postgres redis
```

2) Apply Vault SQL:
```bash
# PowerShell:
psql $env:DATABASE_URL -f packages/secrets/sql/vault.sql

# cmd.exe:
psql "%DATABASE_URL%" -f packages/secrets/sql/vault.sql
```

3) Set env vars and bootstrap secrets:
```bash
set VAULT_ENCRYPTION_KEY=your-key
set STRIPE_SECRET_KEY=sk_test_...
set STRIPE_WEBHOOK_SECRET=whsec_...
set NOVU_API_KEY=novu-...
set METABASE_EMBEDDING_SECRET=...
set JWT_SECRET=...
set CHATWOOT_API_KEY=...

npm run setup:secrets
```

## Usage

```ts
import { vault, getSecretAuditLog } from "@beauty-salon/secrets";

await vault.setEncryptionKey(process.env.VAULT_ENCRYPTION_KEY!);
await vault.setSecret("stripe_secret_key", "sk_live_...", "Stripe API key");
const stripeKey = await vault.getSecret("stripe_secret_key");

const audit = await getSecretAuditLog("stripe_secret_key");
```

## Bootstrap secrets

```bash
npm run setup:secrets
```
