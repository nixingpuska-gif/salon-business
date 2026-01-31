import crypto from "crypto";
import { config } from "../config.js";
import { getPool } from "./db.js";
import { enqueue } from "./queue.js";
import { idempotency } from "./idempotency.js";
import { ensureTenant, insertAuditLog, upsertJobLog } from "./coreDb.js";
import { logEvent } from "./logger.js";
import { appendFeedback } from "./feedbackStorage.js";

const allowedChannels = new Set(["telegram", "vkmax", "instagram", "whatsapp"]);

const shouldWrite = () => process.env.CORE_DB_WRITE === "1";
const hasDb = () => Boolean(process.env.DATABASE_URL);

const safeWrite = async <T>(fn: () => Promise<T>): Promise<T | null> => {
  if (!shouldWrite() || !hasDb()) return null;
  try {
    return await fn();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[feedback] db write failed", error);
    return null;
  }
};

export const requestFeedback = async (input: {
  tenantId: string;
  bookingId: string;
  channel?: string;
  to?: string;
  message?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}) => {
  await ensureTenant(input.tenantId);
  if (input.idempotencyKey) {
    const ok = await idempotency.checkAndSet(
      `idemp:feedback:req:${input.tenantId}:${input.idempotencyKey}`,
      24 * 60 * 60,
    );
    if (!ok) {
      throw new Error("Duplicate feedback request");
    }
  }

  let jobId: string | undefined;
  if (input.channel && input.to && input.message) {
    if (!allowedChannels.has(input.channel)) {
      throw new Error("Unsupported channel");
    }
    const queue = `queue:send:${input.channel}`;
    const job = await enqueue(queue, {
      tenantId: input.tenantId,
      channel: input.channel,
      to: input.to,
      message: input.message,
      metadata: input.metadata ?? {},
    });
    jobId = job.id;
    await upsertJobLog({
      id: job.id,
      tenantId: input.tenantId,
      queue: job.queue,
      status: "queued",
      payload: job.payload,
    });
  }

  await insertAuditLog({
    tenantId: input.tenantId,
    action: "feedback_request",
    payload: {
      bookingId: input.bookingId,
      channel: input.channel,
      to: input.to,
      jobId,
    },
  });

  await logEvent("feedback_request", {
    tenantId: input.tenantId,
    bookingId: input.bookingId,
    channel: input.channel,
    jobId,
  });

  return { ok: true, jobId };
};

export const submitFeedback = async (input: {
  tenantId: string;
  bookingId: string;
  rating: number;
  comment?: string;
  staffId?: string;
  serviceId?: string;
  channel?: string;
}) => {
  await ensureTenant(input.tenantId);
  const rating = Number(input.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error("rating must be between 1 and 5");
  }
  if (input.channel && !allowedChannels.has(input.channel)) {
    throw new Error("Unsupported channel");
  }

  const id = crypto.randomUUID();
  await safeWrite(async () => {
    const pool = getPool();
    await pool.query(
      `insert into feedback (id, tenant_id, booking_id, staff_id, service_id, channel, rating, comment)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        input.tenantId,
        input.bookingId,
        input.staffId || null,
        input.serviceId || null,
        input.channel || null,
        rating,
        input.comment || null,
      ],
    );
    return id;
  });

  await appendFeedback({
    tenantId: input.tenantId,
    bookingId: input.bookingId,
    staffId: input.staffId,
    serviceId: input.serviceId,
    channel: input.channel,
    rating,
    comment: input.comment,
    createdAt: new Date().toISOString(),
  });

  await insertAuditLog({
    tenantId: input.tenantId,
    action: "feedback_submit",
    payload: {
      bookingId: input.bookingId,
      rating,
      staffId: input.staffId,
      serviceId: input.serviceId,
      channel: input.channel,
    },
  });

  await logEvent("feedback_submit", {
    tenantId: input.tenantId,
    bookingId: input.bookingId,
    rating,
  });

  return { ok: true, feedbackId: id };
};
