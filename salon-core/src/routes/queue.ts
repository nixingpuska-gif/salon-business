import { Request, Response, Router } from "express";
import { enqueue } from "../services/queue.js";
import { idempotency } from "../services/idempotency.js";
import { rateLimit } from "../services/rateLimit.js";
import { logEvent } from "../services/logger.js";
import { scheduleReminder } from "../services/reminders.js";
import { config } from "../config.js";
import { getTenantConfig } from "../services/tenantConfig.js";
import { resolveTenantId } from "../services/tenantResolve.js";
import { isQuietHours, shiftOutOfQuietHours } from "../services/quietHours.js";
import { ensureTenant, upsertJobLog } from "../services/coreDb.js";

export const queueRouter = Router();

const ensureIdempotency = async (tenantId: string, key: string, ttlSeconds: number) => {
  if (!key) {
    return { ok: false, error: "idempotencyKey is required" } as const;
  }
  const idempotent = await idempotency.checkAndSet(`idemp:${tenantId}:${key}`, ttlSeconds);
  if (!idempotent) {
    return { ok: false, error: "Duplicate request" } as const;
  }
  return { ok: true } as const;
};

queueRouter.post("/tx", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const tenantId = resolveTenantId(req, body);
    const tenantConfig = await getTenantConfig(tenantId);
    if (config.security.strictTenantConfig && !tenantConfig) {
      return res.status(401).json({ error: "Unknown tenant" });
    }
    await ensureTenant(tenantId);
    const idempotencyKey = (body.idempotencyKey as string) || "";
    const channel = String(body.channel || "");
    const to = String(body.to || "");
    const message = String(body.message || "");

    if (!idempotencyKey) {
      return res.status(400).json({ error: "idempotencyKey is required" });
    }
    if (!channel || !to || !message) {
      return res.status(400).json({ error: "channel, to, message are required" });
    }

    const idemp = await ensureIdempotency(tenantId, `tx:${idempotencyKey}`, 24 * 60 * 60);
    if (!idemp.ok) {
      return res.status(409).json({ error: idemp.error });
    }

    const rate = await rateLimit.consume({
      key: `tenant:${tenantId}:tx`,
      limit: 3000,
      windowSeconds: 24 * 60 * 60,
    });
    if (!rate.allowed) {
      return res.status(429).json({ error: "Rate limit exceeded", resetInSeconds: rate.resetInSeconds });
    }

    const job = await enqueue("queue:tx", {
      tenantId,
      type: body.type || "notification",
      channel,
      to,
      message,
      metadata: body.metadata ?? {},
    });
    await upsertJobLog({
      id: job.id,
      tenantId,
      queue: job.queue,
      status: "queued",
      payload: job.payload,
    });

    await logEvent("tx_enqueued", { tenantId, jobId: job.id });
    return res.status(202).json({ accepted: true, jobId: job.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(502).json({ error: message });
  }
});

queueRouter.post("/mk", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const tenantId = resolveTenantId(req, body);
    const tenantConfig = await getTenantConfig(tenantId);
    if (config.security.strictTenantConfig && !tenantConfig) {
      return res.status(401).json({ error: "Unknown tenant" });
    }
    await ensureTenant(tenantId);
    const idempotencyKey = (body.idempotencyKey as string) || "";
    const campaignId = (body.campaignId as string) || "";
    const channel = String(body.channel || "");
    const to = String(body.to || body.phone || "");
    const message = String(body.message || "");

    if (!channel || !to || !message) {
      return res.status(400).json({ error: "channel, to, message are required" });
    }

    const dedupeId = campaignId || idempotencyKey;
    if (!dedupeId) {
      return res.status(400).json({ error: "campaignId or idempotencyKey is required" });
    }

    const clientKey = String(body.clientId || to);
    const idemp = await ensureIdempotency(
      tenantId,
      `mk:${dedupeId}:${clientKey}`,
      24 * 60 * 60,
    );
    if (!idemp.ok) {
      return res.status(409).json({ error: idemp.error });
    }

    const rate = await rateLimit.consume({
      key: `tenant:${tenantId}:mk`,
      limit: 1500,
      windowSeconds: 24 * 60 * 60,
    });
    if (!rate.allowed) {
      return res.status(429).json({ error: "Rate limit exceeded", resetInSeconds: rate.resetInSeconds });
    }

    const clientLimit = config.rateLimits.mkClientLimit;
    const clientWindow = config.rateLimits.mkClientWindowSeconds;
    if (clientLimit > 0 && clientWindow > 0 && clientKey) {
      const clientRate = await rateLimit.consume({
        key: `tenant:${tenantId}:client:${clientKey}:mk`,
        limit: clientLimit,
        windowSeconds: clientWindow,
      });
      if (!clientRate.allowed) {
        return res.status(429).json({
          error: "Client rate limit exceeded",
          resetInSeconds: clientRate.resetInSeconds,
        });
      }
    }

    const metadata = (body.metadata as Record<string, unknown>) || {};
    const timeZone = (body.timeZone as string) || (metadata.timeZone as string) || undefined;
    if (config.rateLimits.mkRespectQuietHours && isQuietHours(new Date(), timeZone)) {
      const runAt = shiftOutOfQuietHours(new Date(), timeZone).getTime();
      await scheduleReminder(runAt, {
        tenantId,
        channel,
        to,
        message,
        metadata,
        timeZone,
        targetQueue: "queue:mk",
      });
      await logEvent("mk_deferred_quiet_hours", { tenantId, runAt, channel });
      return res.status(202).json({ accepted: true, deferredUntil: new Date(runAt).toISOString() });
    }

    const job = await enqueue("queue:mk", {
      tenantId,
      type: body.type || "campaign",
      channel,
      to,
      message,
      metadata: { ...metadata, campaignId, clientId: body.clientId || to },
    });
    await upsertJobLog({
      id: job.id,
      tenantId,
      queue: job.queue,
      status: "queued",
      payload: job.payload,
    });

    await logEvent("mk_enqueued", { tenantId, jobId: job.id });
    return res.status(202).json({ accepted: true, jobId: job.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(502).json({ error: message });
  }
});

queueRouter.post("/reminders", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const tenantId = resolveTenantId(req, body);
    const tenantConfig = await getTenantConfig(tenantId);
    if (config.security.strictTenantConfig && !tenantConfig) {
      return res.status(401).json({ error: "Unknown tenant" });
    }
    await ensureTenant(tenantId);
    const idempotencyKey = (body.idempotencyKey as string) || "";
    const remindAt = body.remindAt as string;
    const channel = String(body.channel || "");
    const to = String(body.to || "");
    const message = String(body.message || "");

    if (!idempotencyKey) {
      return res.status(400).json({ error: "idempotencyKey is required" });
    }
    if (!channel || !to || !message) {
      return res.status(400).json({ error: "channel, to, message are required" });
    }

    if (!remindAt) {
      return res.status(400).json({ error: "remindAt is required (ISO8601)" });
    }

    const runAtMs = Date.parse(remindAt);
    if (Number.isNaN(runAtMs)) {
      return res.status(400).json({ error: "remindAt must be ISO8601" });
    }

    const idemp = await ensureIdempotency(tenantId, `rem:${idempotencyKey}`, 7 * 24 * 60 * 60);
    if (!idemp.ok) {
      return res.status(409).json({ error: idemp.error });
    }

    await scheduleReminder(runAtMs, {
      tenantId,
      channel,
      to,
      message,
      metadata: (body.metadata as Record<string, unknown>) || {},
    });

    await logEvent("reminder_scheduled", { tenantId, runAt: remindAt });
    return res.status(202).json({ accepted: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(502).json({ error: message });
  }
});
