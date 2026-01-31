"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vault = exports.VaultClient = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const pg_1 = require("pg");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;
const hasSupabase = Boolean(supabaseUrl && supabaseServiceKey);
const hasDatabaseUrl = Boolean(databaseUrl);
const supabase = hasSupabase
    ? (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
    })
    : null;
const pool = hasDatabaseUrl ? new pg_1.Pool({ connectionString: databaseUrl }) : null;
class VaultClient {
    mode;
    supabaseClient;
    pgPool;
    encryptionKey;
    constructor(encryptionKey = process.env.VAULT_ENCRYPTION_KEY) {
        if (hasSupabase && supabase) {
            this.mode = "supabase";
            this.supabaseClient = supabase;
        }
        else if (hasDatabaseUrl && pool) {
            this.mode = "pg";
            this.pgPool = pool;
        }
        else {
            throw new Error("VaultClient requires SUPABASE_URL+SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL");
        }
        this.encryptionKey = encryptionKey;
    }
    async setEncryptionKey(encryptionKey) {
        this.encryptionKey = encryptionKey;
        if (this.mode === "supabase") {
            const { error } = await this.supabaseClient.rpc("vault.set_encryption_key", {
                encryption_key: encryptionKey,
            });
            if (error) {
                throw new Error(`Failed to set encryption key: ${error.message}`);
            }
            return;
        }
        await this.pgPool.query("SELECT vault.set_encryption_key($1)", [
            encryptionKey,
        ]);
    }
    async setSecret(name, value, description) {
        if (this.mode === "supabase") {
            const { data, error } = await this.supabaseClient.rpc("vault.create_secret", {
                secret_name: name,
                secret_value: value,
                secret_description: description ?? null,
                encryption_key: this.encryptionKey ?? null,
            });
            if (error) {
                throw new Error(`Failed to set secret: ${error.message}`);
            }
            return data;
        }
        const result = await this.pgPool.query("SELECT vault.create_secret($1, $2, $3, $4) AS id", [name, value, description ?? null, this.encryptionKey ?? null]);
        return result.rows[0]?.id;
    }
    async getSecret(name) {
        if (this.mode === "supabase") {
            const { data, error } = await this.supabaseClient.rpc("vault.read_secret", {
                secret_name: name,
                encryption_key: this.encryptionKey ?? null,
            });
            if (error) {
                console.error(`Failed to read secret ${name}: ${error.message}`);
                return null;
            }
            return data;
        }
        const result = await this.pgPool.query("SELECT vault.read_secret($1, $2) AS secret", [name, this.encryptionKey ?? null]);
        return result.rows[0]?.secret ?? null;
    }
    async getSecrets(names) {
        if (names.length === 0) {
            return {};
        }
        if (this.mode === "supabase") {
            const { data, error } = await this.supabaseClient.rpc("vault.read_secrets", {
                secret_names: names,
                encryption_key: this.encryptionKey ?? null,
            });
            if (error) {
                throw new Error(`Failed to read secrets: ${error.message}`);
            }
            return data.reduce((acc, row) => {
                acc[row.name] = row.secret;
                return acc;
            }, {});
        }
        const result = await this.pgPool.query("SELECT * FROM vault.read_secrets($1::text[], $2)", [names, this.encryptionKey ?? null]);
        return result.rows.reduce((acc, row) => {
            acc[row.name] = row.secret;
            return acc;
        }, {});
    }
    async deleteSecret(name) {
        if (this.mode === "supabase") {
            const { error } = await this.supabaseClient.rpc("vault.delete_secret", {
                secret_name: name,
            });
            if (error) {
                throw new Error(`Failed to delete secret: ${error.message}`);
            }
            return;
        }
        await this.pgPool.query("SELECT vault.delete_secret($1)", [name]);
    }
    async listSecrets() {
        if (this.mode === "supabase") {
            const { data, error } = await this.supabaseClient.rpc("vault.list_secrets");
            if (error) {
                throw new Error(`Failed to list secrets: ${error.message}`);
            }
            return data.map((row) => row.name);
        }
        const result = await this.pgPool.query("SELECT * FROM vault.list_secrets()");
        return result.rows.map((row) => row.name);
    }
    async getTenantSecret(tenantId, secretType) {
        const secretName = `tenant_${tenantId}_${secretType}`;
        return this.getSecret(secretName);
    }
    async setTenantSecret(tenantId, secretType, value) {
        const secretName = `tenant_${tenantId}_${secretType}`;
        await this.setSecret(secretName, value, `Secret for tenant ${tenantId}`);
    }
}
exports.VaultClient = VaultClient;
exports.vault = new VaultClient();
//# sourceMappingURL=vault-client.js.map