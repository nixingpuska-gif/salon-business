import "dotenv/config";
import { dequeueBlocking, enqueue } from "../services/queue.js";
import { logEvent } from "../services/logger.js";
import { upsertJobLog } from "../services/coreDb.js";

const queueName = "queue:mk";
const throttleMs = Number(process.env.MK_THROTTLE_MS || 200);
const maxAttempts = Number(process.env.MK_MAX_ATTEMPTS || 3);
const baseBackoffMs = Number(process.env.MK_RETRY_BACKOFF_MS || 2000);

const run = async () => {
  // eslint-disable-next-line no-console
  console.log(`[mk] listening on ${queueName}`);

  while (true) {
    const job = await dequeueBlocking([queueName]);
    if (!job) continue;

    try {
      const channel = String(job.payload.channel || "");
      const to = job.payload.to as string | undefined;
      const message = job.payload.message as string | undefined;
      const metadata = (job.payload.metadata as Record<string, unknown>) || {};

      if (channel && to && message) {
        await enqueue(`queue:send:${channel}`, {
          tenantId: job.payload.tenantId,
          channel,
          to,
          message,
          metadata,
        });
      }

      await logEvent("mk_processed", { jobId: job.id, type: job.payload.type });
      await upsertJobLog({
        id: job.id,
        tenantId: String(job.payload.tenantId || ""),
        queue: job.queue,
        status: "processed",
        payload: job.payload,
      });
      if (throttleMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, throttleMs));
      }
      await job.ack();
    } catch (error) {
      const attempts = Number(job.payload.attempts || 0) + 1;
      const errMessage = error instanceof Error ? error.message : "Unknown error";
      await logEvent("mk_failed", { jobId: job.id, error: errMessage, attempts });
      await upsertJobLog({
        id: job.id,
        tenantId: String(job.payload.tenantId || ""),
        queue: job.queue,
        status: "failed",
        payload: job.payload,
        error: errMessage,
      });

      const max = Number.isFinite(maxAttempts) ? maxAttempts : 3;
      const base = Number.isFinite(baseBackoffMs) ? baseBackoffMs : 2000;

      if (attempts <= max) {
        const backoffMs = Math.min(30000, attempts * base);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        const retryJob = await enqueue(queueName, {
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
        const deadJob = await enqueue("queue:dead:mk", {
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
    }
  }
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("[mk] fatal error", error);
  process.exit(1);
});
