import "dotenv/config";
import { enqueue } from "../services/queue.js";
import { logEvent } from "../services/logger.js";
import { popDueReminder } from "../services/reminders.js";
import { upsertJobLog } from "../services/coreDb.js";

const pollMs = Number(process.env.REMINDER_POLL_MS || 1000);

const run = async () => {
  // eslint-disable-next-line no-console
  console.log(`[reminder] polling every ${pollMs}ms`);

  while (true) {
    const now = Date.now();
    const item = await popDueReminder(now);
    if (!item) {
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      continue;
    }

    const { payload } = item;
    const targetQueue = payload.targetQueue || "queue:tx";
    const job = await enqueue(targetQueue, {
      tenantId: payload.tenantId,
      type: "reminder",
      channel: payload.channel,
      to: payload.to,
      message: payload.message,
      metadata: payload.metadata ?? {},
    });
    await upsertJobLog({
      id: job.id,
      tenantId: String(job.payload.tenantId || ""),
      queue: job.queue,
      status: "queued",
      payload: job.payload,
    });

    await logEvent("reminder_dispatched", {
      tenantId: payload.tenantId,
      channel: payload.channel,
      to: payload.to,
    });
  }
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("[reminder] fatal error", error);
  process.exit(1);
});
