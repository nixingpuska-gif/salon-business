import { vault, getSecretAuditLog } from "@beauty-salon/secrets";

const hasSupabase =
  Boolean(process.env.SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

const requiredBase = ["VAULT_ENCRYPTION_KEY"] as const;
const requiredSupabase = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const requiredLocal = ["DATABASE_URL"] as const;

for (const key of requiredBase) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

if (!hasSupabase && !hasDatabaseUrl) {
  console.error("Missing SUPABASE_URL+SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL");
  process.exit(1);
}

const requiredEnv = hasSupabase ? requiredSupabase : requiredLocal;
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

async function setupPlatformSecrets() {
  const mode = hasSupabase ? "supabase" : "local-postgres";
  console.log(`Setting up platform secrets (${mode})...\n`);

  await vault.setEncryptionKey(process.env.VAULT_ENCRYPTION_KEY!);

  const secrets = [
    {
      name: "stripe_secret_key",
      env: "STRIPE_SECRET_KEY",
      description: "Stripe API secret key",
    },
    {
      name: "stripe_webhook_secret",
      env: "STRIPE_WEBHOOK_SECRET",
      description: "Stripe webhook signing secret",
    },
    {
      name: "novu_api_key",
      env: "NOVU_API_KEY",
      description: "Novu API key",
    },
    {
      name: "metabase_embedding_secret",
      env: "METABASE_EMBEDDING_SECRET",
      description: "Metabase JWT signing secret",
    },
    {
      name: "jwt_secret",
      env: "JWT_SECRET",
      description: "JWT signing secret for application",
    },
    {
      name: "chatwoot_api_key",
      env: "CHATWOOT_API_KEY",
      description: "Chatwoot API key",
    },
  ];

  let createdCount = 0;

  for (const secret of secrets) {
    const value = process.env[secret.env];
    if (!value) {
      console.warn(`Skipping ${secret.name}: ${secret.env} is not set`);
      continue;
    }

    await vault.setSecret(secret.name, value, secret.description);
    console.log(`OK Set secret: ${secret.name}`);
    createdCount += 1;
  }

  if (createdCount === 0) {
    throw new Error("No secrets were set. Provide env vars and retry.");
  }

  console.log("\nPlatform secrets setup complete!");

  const audit = await getSecretAuditLog();
  console.log(`Audit log entries: ${audit.length}`);
}

setupPlatformSecrets().catch((error) => {
  console.error("Setup failed:", error);
  process.exit(1);
});
