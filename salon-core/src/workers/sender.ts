import "dotenv/config";
import { dequeueBlocking, enqueue } from "../services/queue.js";
import { sendInstagram } from "../services/senders/instagram.js";
import { sendTelegram } from "../services/senders/telegram.js";
import { sendVkmax } from "../services/senders/vkmax.js";
import { sendWhatsapp } from "../services/senders/whatsapp.js";
import { logEvent } from "../services/logger.js";
import { logMessage } from "../services/messageLog.js";
import { getTenantConfig } from "../services/tenantConfig.js";
import { rateLimit } from "../services/rateLimit.js";
import { config } from "../config.js";
import { upsertJobLog } from "../services/coreDb.js";

const queues = [
  "queue:send:telegram",
  "queue:send:vkmax",
  "queue:send:instagram",
  "queue:send:whatsapp",
];

const sendToChannel = async (channel: string, payload: Record<string, unknown>) => {
  const to = String(payload.to || "");
  const message = String(payload.message || "");
  const metadata = (payload.metadata as Record<string, unknown>) || {};
  const tenantId = String(payload.tenantId || "default");
  const tenantConfig = await getTenantConfig(tenantId);
  const channelDefaults =
    ((tenantConfig?.channels as Record<string, unknown> | undefined)?.[channel] as
      | Record<string, unknown>
      | undefined) || {};
  if (!to || !message) {
    throw new Error("Payload must include to and message");
  }

  const rpsConfig = config.rateLimits.channelRps;
  const rps =
    channel === "telegram"
      ? rpsConfig.telegram
      : channel === "whatsapp"
        ? rpsConfig.whatsapp
        : channel === "instagram"
          ? rpsConfig.instagram
          : channel === "vkmax"
            ? rpsConfig.vkmax
            : 0;

  if (rps > 0) {
    const rate = await rateLimit.consume({
      key: `channel:${channel}`,
      limit: rps,
      windowSeconds: 1,
    });
    if (!rate.allowed) {
      const delayMs = Math.max(50, rate.resetInSeconds * 1000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  if (config.mocks.senders) {
    await logEvent("outbound_mocked", { channel, to, tenantId });
    return { ok: true, mocked: true };
  }

  switch (channel) {
    case "telegram":
      return sendTelegram({
        to,
        message,
        botToken: (metadata.botToken as string | undefined) || (channelDefaults.botToken as string | undefined),
        sendUrl: (metadata.sendUrl as string | undefined) || (channelDefaults.sendUrl as string | undefined),
      });
    case "vkmax":
      return sendVkmax({
        to,
        message,
        token: (metadata.token as string | undefined) || (channelDefaults.token as string | undefined),
        sendUrl: (metadata.sendUrl as string | undefined) || (channelDefaults.sendUrl as string | undefined),
      });
    case "instagram":
      return sendInstagram({
        to,
        message,
        token: (metadata.token as string | undefined) || (channelDefaults.token as string | undefined),
        sendUrl: (metadata.sendUrl as string | undefined) || (channelDefaults.sendUrl as string | undefined),
      });
    case "whatsapp":
      return sendWhatsapp({
        to,
        message,
        token: (metadata.token as string | undefined) || (channelDefaults.token as string | undefined),
        sendUrl: (metadata.sendUrl as string | undefined) || (channelDefaults.sendUrl as string | undefined),
        apiBase: (metadata.apiBase as string | undefined) || (channelDefaults.apiBase as string | undefined),
        phoneId: (metadata.phoneId as string | undefined) || (channelDefaults.phoneId as string | undefined),
      });
    default:
      throw new Error(`Unsupported channel: ${channel}`);
  }
};

const maxAttempts = Number(process.env.SEND_MAX_ATTEMPTS || 5);
const baseBackoffMs = Number(process.env.SEND_RETRY_BACKOFF_MS || 5000);

const run = async () => {
  // eslint-disable-next-line no-console
  console.log(`[sender] listening on queues: ${queues.join(", ")}`);

  while (true) {
    const job = await dequeueBlocking(queues);
    if (!job) continue;
    const channel = job.queue.split(":").slice(-1)[0] || "unknown";
    try {
      await sendToChannel(channel, job.payload);
      await logMessage({
        tenantId: String(job.payload.tenantId || "default"),
        channel,
        direction: "outbound",
        messageId: job.id,
        payload: job.payload,
      });

      await logEvent("outbound_sent", {
        channel,
        jobId: job.id,
        to: job.payload.to,
      });
      await upsertJobLog({
        id: job.id,
        tenantId: String(job.payload.tenantId || ""),
        queue: job.queue,
        status: "processed",
        payload: job.payload,
      });
      await job.ack();
    } catch (error) {
      const attempts = Number(job.payload.attempts || 0) + 1;
      const errMessage = error instanceof Error ? error.message : "Unknown error";

      await logEvent("outbound_failed", {
        channel,
        jobId: job.id,
        attempts,
        error: errMessage,
      });
      await upsertJobLog({
        id: job.id,
        tenantId: String(job.payload.tenantId || ""),
        queue: job.queue,
        status: "failed",
        payload: job.payload,
        error: errMessage,
      });

      const max = Number.isFinite(maxAttempts) ? maxAttempts : 5;
      const base = Number.isFinite(baseBackoffMs) ? baseBackoffMs : 5000;

      if (attempts <= max) {
        const backoffMs = Math.min(60000, attempts * base);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        const retryJob = await enqueue(job.queue, {
          ...job.payload,
          attempts,
        });
        await upsertJobLog({
          id: retryJob.id,
          tenantId: String(retryJob.payload.tenantId || ""),
          queue: retryJob.queue,
          status: "queued",
          payload: retryJob.payload,
        });
      } else {
        const deadJob = await enqueue(`queue:dead:send:${channel}`, {
          ...job.payload,
          attempts,
          error: errMessage,
        });
        await upsertJobLog({
          id: deadJob.id,
          tenantId: String(deadJob.payload.tenantId || ""),
          queue: deadJob.queue,
          status: "dead",
          payload: deadJob.payload,
          error: errMessage,
        });
      }
      await job.ack();
      // eslint-disable-next-line no-console
      console.error(`[sender] failed job ${job.id}`, error);
    }
  }
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("[sender] fatal error", error);
  process.exit(1);
});
