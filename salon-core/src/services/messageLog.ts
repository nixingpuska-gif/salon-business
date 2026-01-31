import crypto from "crypto";
import { getPool } from "./db.js";
import { maybeRedact } from "./redact.js";

export type MessageLogEntry = {
  tenantId: string;
  channel: string;
  direction: "inbound" | "outbound";
  messageId?: string;
  customerId?: string;
  payload: Record<string, unknown>;
};

export const logMessage = async (entry: MessageLogEntry) => {
  if (!process.env.LOG_TO_DB) {
    return;
  }

  const pool = getPool();
  const id = crypto.randomUUID();
  const query = `
    insert into message_log (id, tenant_id, channel, direction, message_id, customer_id, payload)
    values ($1, $2, $3, $4, $5, $6, $7)
  `;
  const values = [
    id,
    entry.tenantId,
    entry.channel,
    entry.direction,
    entry.messageId || null,
    entry.customerId || null,
    JSON.stringify(maybeRedact(entry.payload)),
  ];

  await pool.query(query, values);
};
