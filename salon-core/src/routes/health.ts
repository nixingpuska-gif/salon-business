import { Request, Router } from "express";
import { getRedis } from "../services/redis.js";
import { getDbMetrics } from "../services/dbMetrics.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

const healthToken = process.env.HEALTH_TOKEN || "";
const queueGroup = process.env.QUEUE_GROUP || "salon-core";

const streamQueues = [
  "queue:tx",
  "queue:mk",
  "queue:calendar",
  "queue:send:telegram",
  "queue:send:vkmax",
  "queue:send:instagram",
  "queue:send:whatsapp",
  "queue:dead:send:telegram",
  "queue:dead:send:vkmax",
  "queue:dead:send:instagram",
  "queue:dead:send:whatsapp",
  "queue:dead:tx",
  "queue:dead:mk",
];

const hasHealthAccess = (req: Request) => {
  if (!healthToken) return true;
  const token = req.header("x-health-token") || "";
  return token === healthToken;
};

const parsePendingCount = (value: unknown) => {
  if (!Array.isArray(value)) return null;
  const count = value[0];
  return typeof count === "number" ? count : Number(count || 0);
};

const getQueueStats = async () => {
  const redis = getRedis();
  const queues: Record<string, { length: number; pending: number | null }> = {};

  for (const queue of streamQueues) {
    const length = await redis.xlen(queue);
    let pending: number | null = null;
    try {
      const pendingInfo = await redis.xpending(queue, queueGroup);
      pending = parsePendingCount(pendingInfo);
    } catch {
      pending = null;
    }
    queues[queue] = { length, pending };
  }

  const reminders = await redis.zcard("reminders:global");
  return { queues, reminders };
};

const escapeLabel = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const formatMetrics = (stats: Awaited<ReturnType<typeof getQueueStats>>) => {
  const lines: string[] = [];
  lines.push("# HELP salon_queue_length Redis stream length.");
  lines.push("# TYPE salon_queue_length gauge");
  lines.push("# HELP salon_queue_pending Pending messages in consumer group.");
  lines.push("# TYPE salon_queue_pending gauge");
  lines.push("# HELP salon_reminders_zset Reminders backlog.");
  lines.push("# TYPE salon_reminders_zset gauge");
  lines.push("# HELP salon_job_log_count Job log counts in last 1 hour.");
  lines.push("# TYPE salon_job_log_count gauge");
  lines.push("# HELP salon_job_log_count_by_tenant Job log counts in last 1 hour by tenant.");
  lines.push("# TYPE salon_job_log_count_by_tenant gauge");
  lines.push("# HELP salon_appointments_total Appointments totals.");
  lines.push("# TYPE salon_appointments_total gauge");
  lines.push("# HELP salon_appointments_upcoming Upcoming appointments.");
  lines.push("# TYPE salon_appointments_upcoming gauge");
  lines.push("# HELP salon_appointments_past Past appointments.");
  lines.push("# TYPE salon_appointments_past gauge");
  lines.push("# HELP salon_appointments_total_by_tenant Appointments totals by tenant.");
  lines.push("# TYPE salon_appointments_total_by_tenant gauge");
  lines.push("# HELP salon_appointments_upcoming_by_tenant Upcoming appointments by tenant.");
  lines.push("# TYPE salon_appointments_upcoming_by_tenant gauge");
  lines.push("# HELP salon_appointments_past_by_tenant Past appointments by tenant.");
  lines.push("# TYPE salon_appointments_past_by_tenant gauge");

  for (const [queue, info] of Object.entries(stats.queues)) {
    const label = escapeLabel(queue);
    lines.push(`salon_queue_length{queue="${label}"} ${info.length}`);
    if (info.pending !== null) {
      lines.push(`salon_queue_pending{queue="${label}"} ${info.pending}`);
    }
  }
  lines.push(`salon_reminders_zset ${stats.reminders}`);
  return `${lines.join("\n")}\n`;
};

healthRouter.get("/queues", async (req, res) => {
  if (!hasHealthAccess(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { queues, reminders } = await getQueueStats();
    return res.json({
      status: "ok",
      group: queueGroup,
      queues,
      reminders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(503).json({ status: "error", error: message });
  }
});

healthRouter.get("/metrics", async (req, res) => {
  if (!hasHealthAccess(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const stats = await getQueueStats();
    const dbMetrics = await getDbMetrics();
    const base = formatMetrics(stats);
    let extra = "";
    if (dbMetrics) {
      for (const row of dbMetrics.jobLog) {
        const queue = escapeLabel(row.queue);
        const status = escapeLabel(row.status);
        extra += `salon_job_log_count{queue="${queue}",status="${status}"} ${row.count}\n`;
      }
      for (const row of dbMetrics.jobLogByTenant) {
        const tenantId = escapeLabel(row.tenantId);
        const queue = escapeLabel(row.queue);
        const status = escapeLabel(row.status);
        extra += `salon_job_log_count_by_tenant{tenant="${tenantId}",queue="${queue}",status="${status}"} ${row.count}\n`;
      }
      extra += `salon_appointments_total ${dbMetrics.appointments.total}\n`;
      extra += `salon_appointments_upcoming ${dbMetrics.appointments.upcoming}\n`;
      extra += `salon_appointments_past ${dbMetrics.appointments.past}\n`;
      for (const row of dbMetrics.appointmentsByTenant) {
        const tenantId = escapeLabel(row.tenantId);
        extra += `salon_appointments_total_by_tenant{tenant="${tenantId}"} ${row.total}\n`;
        extra += `salon_appointments_upcoming_by_tenant{tenant="${tenantId}"} ${row.upcoming}\n`;
        extra += `salon_appointments_past_by_tenant{tenant="${tenantId}"} ${row.past}\n`;
      }
    }
    res.type("text/plain; version=0.0.4");
    return res.send(base + extra);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(503).json({ status: "error", error: message });
  }
});
