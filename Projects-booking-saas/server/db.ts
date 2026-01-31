import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "./_core/env";
import * as schema from "../drizzle/schema";

let pool: mysql.Pool;
try {
  console.log("[DB] Initializing database connection...");
  pool = mysql.createPool({
    uri: env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  console.log("[DB] Database pool created");
} catch (error) {
  console.error("[DB] Failed to create database pool:", error);
  throw error;
}

export const db = drizzle(pool, { schema, mode: "default" });

// Тест подключения при старте
pool.getConnection()
  .then((connection) => {
    console.log("[DB] ✅ Database connection successful");
    connection.release();
  })
  .catch((error) => {
    console.error("[DB] ❌ Database connection failed:", error);
    console.error("[DB] Check DATABASE_URL:", env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@"));
  });
