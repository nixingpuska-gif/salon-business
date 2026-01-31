import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Pool } from "pg";

type VaultMode = "supabase" | "pg";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

const hasSupabase = Boolean(supabaseUrl && supabaseServiceKey);
const hasDatabaseUrl = Boolean(databaseUrl);

const supabase = hasSupabase
  ? createClient(supabaseUrl as string, supabaseServiceKey as string, {
      auth: { persistSession: false },
    })
  : null;

const pool = hasDatabaseUrl ? new Pool({ connectionString: databaseUrl }) : null;

export class VaultClient {
  private mode: VaultMode;
  private supabaseClient?: SupabaseClient;
  private pgPool?: Pool;
  private encryptionKey?: string;

  constructor(
    encryptionKey: string | undefined = process.env.VAULT_ENCRYPTION_KEY
  ) {
    if (hasSupabase && supabase) {
      this.mode = "supabase";
      this.supabaseClient = supabase;
    } else if (hasDatabaseUrl && pool) {
      this.mode = "pg";
      this.pgPool = pool;
    } else {
      throw new Error(
        "VaultClient requires SUPABASE_URL+SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL"
      );
    }

    this.encryptionKey = encryptionKey;
  }

  async setEncryptionKey(encryptionKey: string): Promise<void> {
    this.encryptionKey = encryptionKey;

    if (this.mode === "supabase") {
      const { error } = await this.supabaseClient!.rpc(
        "vault.set_encryption_key",
        {
          encryption_key: encryptionKey,
        }
      );

      if (error) {
        throw new Error(`Failed to set encryption key: ${error.message}`);
      }

      return;
    }

    await this.pgPool!.query("SELECT vault.set_encryption_key($1)", [
      encryptionKey,
    ]);
  }

  async setSecret(
    name: string,
    value: string,
    description?: string
  ): Promise<string> {
    if (this.mode === "supabase") {
      const { data, error } = await this.supabaseClient!.rpc(
        "vault.create_secret",
        {
          secret_name: name,
          secret_value: value,
          secret_description: description ?? null,
          encryption_key: this.encryptionKey ?? null,
        }
      );

      if (error) {
        throw new Error(`Failed to set secret: ${error.message}`);
      }

      return data as string;
    }

    const result = await this.pgPool!.query(
      "SELECT vault.create_secret($1, $2, $3, $4) AS id",
      [name, value, description ?? null, this.encryptionKey ?? null]
    );

    return result.rows[0]?.id as string;
  }

  async getSecret(name: string): Promise<string | null> {
    if (this.mode === "supabase") {
      const { data, error } = await this.supabaseClient!.rpc(
        "vault.read_secret",
        {
          secret_name: name,
          encryption_key: this.encryptionKey ?? null,
        }
      );

      if (error) {
        console.error(`Failed to read secret ${name}: ${error.message}`);
        return null;
      }

      return data as string;
    }

    const result = await this.pgPool!.query(
      "SELECT vault.read_secret($1, $2) AS secret",
      [name, this.encryptionKey ?? null]
    );

    return result.rows[0]?.secret ?? null;
  }

  async getSecrets(names: string[]): Promise<Record<string, string>> {
    if (names.length === 0) {
      return {};
    }

    if (this.mode === "supabase") {
      const { data, error } = await this.supabaseClient!.rpc(
        "vault.read_secrets",
        {
          secret_names: names,
          encryption_key: this.encryptionKey ?? null,
        }
      );

      if (error) {
        throw new Error(`Failed to read secrets: ${error.message}`);
      }

      return (data as Array<{ name: string; secret: string }>).reduce(
        (acc, row) => {
          acc[row.name] = row.secret;
          return acc;
        },
        {} as Record<string, string>
      );
    }

    const result = await this.pgPool!.query(
      "SELECT * FROM vault.read_secrets($1::text[], $2)",
      [names, this.encryptionKey ?? null]
    );

    return result.rows.reduce((acc, row) => {
      acc[row.name] = row.secret;
      return acc;
    }, {} as Record<string, string>);
  }

  async deleteSecret(name: string): Promise<void> {
    if (this.mode === "supabase") {
      const { error } = await this.supabaseClient!.rpc("vault.delete_secret", {
        secret_name: name,
      });

      if (error) {
        throw new Error(`Failed to delete secret: ${error.message}`);
      }

      return;
    }

    await this.pgPool!.query("SELECT vault.delete_secret($1)", [name]);
  }

  async listSecrets(): Promise<string[]> {
    if (this.mode === "supabase") {
      const { data, error } = await this.supabaseClient!.rpc(
        "vault.list_secrets"
      );

      if (error) {
        throw new Error(`Failed to list secrets: ${error.message}`);
      }

      return (data as Array<{ name: string }>).map((row) => row.name);
    }

    const result = await this.pgPool!.query("SELECT * FROM vault.list_secrets()");
    return result.rows.map((row) => row.name as string);
  }

  async getTenantSecret(
    tenantId: string,
    secretType: string
  ): Promise<string | null> {
    const secretName = `tenant_${tenantId}_${secretType}`;
    return this.getSecret(secretName);
  }

  async setTenantSecret(
    tenantId: string,
    secretType: string,
    value: string
  ): Promise<void> {
    const secretName = `tenant_${tenantId}_${secretType}`;
    await this.setSecret(secretName, value, `Secret for tenant ${tenantId}`);
  }
}

export const vault = new VaultClient();
