#!/usr/bin/env node
import fs from "fs";

const env = process.env;
const warnings = [];
const errors = [];

const has = (value) => typeof value === "string" && value.trim().length > 0;
const isProd = env.NODE_ENV === "production";

const tenantConfigSource = (env.TENANT_CONFIG_SOURCE || "auto").toLowerCase();
const hasTenantPath = has(env.TENANT_CONFIG_PATH);
const hasDb = has(env.DATABASE_URL);
const usesDbSource = tenantConfigSource === "db" || (tenantConfigSource === "auto" && hasDb);
const usesFileSource = tenantConfigSource === "file" || (tenantConfigSource === "auto" && hasTenantPath);

const strictTenant = env.STRICT_TENANT_CONFIG === "1";
const strictWebhook = env.STRICT_WEBHOOK_SIGNATURE === "1";

if (strictTenant && !usesDbSource && !usesFileSource) {
  errors.push("STRICT_TENANT_CONFIG=1 but no tenant config source (db/file) is configured.");
}

if (usesFileSource && hasTenantPath && !fs.existsSync(env.TENANT_CONFIG_PATH)) {
  warnings.push(`TENANT_CONFIG_PATH not found: ${env.TENANT_CONFIG_PATH}`);
}

if (strictWebhook && !usesDbSource && !usesFileSource) {
  warnings.push("STRICT_WEBHOOK_SIGNATURE=1 requires per-tenant webhook secrets or global secrets.");
}

if (!usesDbSource && !usesFileSource) {
  if (!has(env.CALCOM_API_BASE) || !has(env.CALCOM_API_KEY)) {
    warnings.push("CALCOM_API_BASE or CALCOM_API_KEY missing; ensure per-tenant calcom config exists.");
  }
  if (!has(env.ERXES_API_BASE)) {
    warnings.push("ERXES_API_BASE missing; ensure per-tenant erxes config exists.");
  }
}

if (env.CORE_DB_WRITE === "1" && !hasDb) {
  errors.push("CORE_DB_WRITE=1 but DATABASE_URL is not set.");
}
if (env.LOG_TO_DB && !hasDb) {
  errors.push("LOG_TO_DB is set but DATABASE_URL is not set.");
}
if (env.METRICS_DB === "1" && !hasDb) {
  errors.push("METRICS_DB=1 but DATABASE_URL is not set.");
}

if (usesDbSource && !has(env.ADMIN_API_TOKEN)) {
  warnings.push("TENANT_CONFIG_SOURCE=db but ADMIN_API_TOKEN is not set.");
}

if (!env.MOCK_SENDERS && !usesDbSource && !usesFileSource) {
  const hasAnyChannel =
    has(env.TELEGRAM_BOT_TOKEN) ||
    has(env.WHATSAPP_TOKEN) ||
    has(env.INSTAGRAM_TOKEN) ||
    has(env.VKMAX_TOKEN);
  if (!hasAnyChannel) {
    warnings.push("No channel tokens configured (global) and no per-tenant config source set.");
  }
}

if (isProd && !has(env.HEALTH_TOKEN)) {
  warnings.push("HEALTH_TOKEN is empty in production; protect /health endpoints via network or token.");
}

const strictMode = env.STRICT === "1";

const print = (label, list) => {
  if (list.length === 0) return;
  console.log(`\n${label}:`);
  for (const item of list) {
    console.log(`- ${item}`);
  }
};

print("WARNINGS", warnings);
print("ERRORS", errors);

if (strictMode && errors.length > 0) {
  process.exit(1);
}
