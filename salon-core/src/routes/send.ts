import { Request, Response, Router } from "express";
import { enqueue } from "../services/queue.js";
import { idempotency } from "../services/idempotency.js";
import { logEvent } from "../services/logger.js";
import { config } from "../config.js";
import { getTenantConfig } from "../services/tenantConfig.js";
import { resolveTenantId } from "../services/tenantResolve.js";
import { ensureTenant, upsertJobLog } from "../services/coreDb.js";

export const sendRouter = Router();

const allowedChannels = new Set(["telegram", "vkmax", "instagram", "whatsapp"]);

sendRouter.post("/:channel", async (req: Request, res: Response) => {
  try {
    const channel = req.params.channel;
    if (!allowedChannels.has(channel)) {
      return res.status(400).json({ error: "Unsupported channel" });
    }

    const body = req.body as Record<string, unknown>;
    const bodyChannel = (body.channel as string | undefined)?.toString();
    if (bodyChannel && bodyChannel !== channel) {
      return res.status(400).json({ error: "channel in body must match path" });
    }
    const tenantId = resolveTenantId(req, body);
    const tenantConfig = await getTenantConfig(tenantId);
    if (config.security.strictTenantConfig && !tenantConfig) {
      return res.status(401).json({ error: "Unknown tenant" });
    }
    await ensureTenant(tenantId);
    const idempotencyKey = (body.idempotencyKey as string) || "";
    const to = String(body.to || "");
    const message = String(body.message || "");
    if (!idempotencyKey) {
      return res.status(400).json({ error: "idempotencyKey is required" });
    }
    if (!to || !message) {
      return res.status(400).json({ error: "to and message are required" });
    }

    const idempotent = await idempotency.checkAndSet(
      `idemp:send:${tenantId}:${idempotencyKey}`,
      24 * 60 * 60,
    );
    if (!idempotent) {
      return res.status(409).json({ error: "Duplicate request" });
    }

    const queue = `queue:send:${channel}`;
    const job = await enqueue(queue, {
      tenantId,
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

    await logEvent("outbound_queued", {
      tenantId,
      channel,
      jobId: job.id,
      to: body.to,
    });

    return res.status(200).json({ messageId: job.id, status: "queued" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(502).json({ error: message });
  }
});
