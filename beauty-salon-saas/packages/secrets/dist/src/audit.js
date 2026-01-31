"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecretAuditLog = getSecretAuditLog;
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
async function getSecretAuditLog(secretName) {
    if (hasSupabase && supabase) {
        let query = supabase
            .from("vault.secret_access_log")
            .select("*")
            .order("accessed_at", { ascending: false });
        if (secretName) {
            query = query.eq("secret_name", secretName);
        }
        const { data, error } = await query;
        if (error) {
            throw new Error(`Failed to fetch audit log: ${error.message}`);
        }
        return data;
    }
    if (!pool) {
        throw new Error("DATABASE_URL is required for local audit access");
    }
    if (secretName) {
        const result = await pool.query("SELECT * FROM vault.secret_access_log WHERE secret_name = $1 ORDER BY accessed_at DESC", [secretName]);
        return result.rows;
    }
    const result = await pool.query("SELECT * FROM vault.secret_access_log ORDER BY accessed_at DESC");
    return result.rows;
}
//# sourceMappingURL=audit.js.map