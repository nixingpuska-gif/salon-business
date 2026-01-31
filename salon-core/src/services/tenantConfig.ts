import fs from "fs/promises";
import { getPool } from "./db.js";

type ChannelConfig = {
  botToken?: string;
  sendUrl?: string;
  token?: string;
  apiBase?: string;
  phoneId?: string;
};

type ErxesConfig = {
  apiBase?: string;
  appToken?: string;
  nginxHostname?: string;
  brandId?: string;
  integrationIds?: string[];
};

type CalcomConfig = {
  apiBase?: string;
  apiKey?: string;
  apiVersion?: string;
  webhookSecret?: string;
  teamId?: string;
};

export type TenantConfig = {
  channels?: {
    telegram?: ChannelConfig;
    whatsapp?: ChannelConfig;
    instagram?: ChannelConfig;
    vkmax?: ChannelConfig;
  };
  services?: Record<
    string,
    {
      calcomEventTypeId?: number;
      eventTypeSlug?: string;
      username?: string;
      teamSlug?: string;
      organizationSlug?: string;
      durationMinutes?: number;
      bufferMinutes?: number;
      gridMinutes?: number;
    }
  >;
  webhooks?: {
    telegram?: { secret?: string };
    whatsapp?: { secret?: string };
    instagram?: { secret?: string };
    vkmax?: { secret?: string };
  };
  erxes?: ErxesConfig;
  calcom?: CalcomConfig;
  access?: {
    ownerTokens?: string[];
    staffTokens?: string[];
  };
  inventory?: {
    services?: Record<
      string,
      {
        items?: Array<{ sku?: string; name?: string; qty?: number; unit?: string }>;
      }
    >;
  };
};

type TenantConfigMap = Record<string, TenantConfig>;

const getConfigPath = () => process.env.TENANT_CONFIG_PATH || "";
const getSource = () => (process.env.TENANT_CONFIG_SOURCE || "auto").toLowerCase();
const useDbSource = () => {
  const source = getSource();
  if (source === "db") return true;
  if (source === "file") return false;
  return Boolean(process.env.DATABASE_URL);
};

const getReloadMs = () => {
  const seconds = Number(process.env.TENANT_CONFIG_RELOAD_SECONDS || 30);
  if (!Number.isFinite(seconds)) return 30000;
  return Math.max(5, seconds) * 1000;
};

let cachedConfig: TenantConfigMap | null = null;
let lastLoaded = 0;
let lastError = "";
let cachedDb: TenantConfigMap | null = null;
let lastDbLoaded = 0;

const loadConfig = async () => {
  const path = getConfigPath();
  if (!path) return null;
  const now = Date.now();
  if (cachedConfig && now - lastLoaded < getReloadMs()) return cachedConfig;
  try {
    const text = await fs.readFile(path, "utf8");
    const parsed = JSON.parse(text) as TenantConfigMap;
    cachedConfig = parsed;
    lastLoaded = now;
    return cachedConfig;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message !== lastError) {
      // eslint-disable-next-line no-console
      console.warn(`[tenant-config] failed to load ${path}: ${message}`);
      lastError = message;
    }
    return cachedConfig;
  }
};

const loadConfigFromDb = async (tenantId: string) => {
  const now = Date.now();
  if (cachedDb && now - lastDbLoaded < getReloadMs()) {
    return cachedDb;
  }
  const pool = getPool();
  const ids = [tenantId, "default"];
  const result = await pool.query(
    "select tenant_id, config from tenant_config where tenant_id = any($1)",
    [ids],
  );
  const map: TenantConfigMap = {};
  for (const row of result.rows) {
    map[row.tenant_id] = row.config as TenantConfig;
  }
  cachedDb = map;
  lastDbLoaded = now;
  return map;
};

export const getTenantConfig = async (tenantId: string) => {
  const map = useDbSource() ? await loadConfigFromDb(tenantId) : await loadConfig();
  if (!map) return undefined;
  return map[tenantId] || map.default;
};

export const getTenantConfigExact = async (tenantId: string) => {
  const map = useDbSource() ? await loadConfigFromDb(tenantId) : await loadConfig();
  if (!map) return undefined;
  return map[tenantId];
};

export const isTenantConfigDb = () => useDbSource();

export const setTenantConfig = async (tenantId: string, config: TenantConfig) => {
  if (!useDbSource()) {
    throw new Error("tenant config source is not db");
  }
  const pool = getPool();
  await pool.query(
    `
    insert into tenant_config (tenant_id, config)
    values ($1, $2)
    on conflict (tenant_id) do update set config = excluded.config, updated_at = now()
  `,
    [tenantId, JSON.stringify(config)],
  );
  cachedDb = null;
};

export const deleteTenantConfig = async (tenantId: string) => {
  if (!useDbSource()) {
    throw new Error("tenant config source is not db");
  }
  const pool = getPool();
  await pool.query("delete from tenant_config where tenant_id = $1", [tenantId]);
  cachedDb = null;
};
