import fs from "fs/promises";
import path from "path";
import { getPool } from "./db.js";
import { readFeedback } from "./feedbackStorage.js";

const hasDb = () => Boolean(process.env.DATABASE_URL);

const periodToInterval = (period: string) => {
  switch (period) {
    case "week":
      return "7 days";
    case "month":
      return "30 days";
    case "day":
    default:
      return "1 day";
  }
};

const periodToDays = (period: string) => {
  switch (period) {
    case "week":
      return 7;
    case "month":
      return 30;
    case "day":
    default:
      return 1;
  }
};

const getLogDir = () => process.env.LOG_DIR || path.join(process.cwd(), "logs");

const readEventLogs = async (tenantId: string, days: number) => {
  const now = new Date();
  const events: Array<{ type?: string; payload?: Record<string, unknown> }> = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    const file = path.join(getLogDir(), `${key}.jsonl`);
    try {
      const raw = await fs.readFile(file, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const entry = JSON.parse(trimmed) as {
          type?: string;
          payload?: Record<string, unknown>;
        };
        if (entry.payload?.tenantId !== tenantId) continue;
        events.push(entry);
      }
    } catch {
      // ignore missing log files
    }
  }
  return events;
};

const safeQuery = async (sql: string, params: unknown[]) => {
  try {
    const pool = getPool();
    return await pool.query(sql, params);
  } catch {
    return null;
  }
};

export const getKpiSummary = async (tenantId: string, period: string) => {
  if (!hasDb()) {
    const days = periodToDays(period);
    const events = await readEventLogs(tenantId, days);
    const feedback = await readFeedback(tenantId, new Date(Date.now() - days * 24 * 60 * 60 * 1000)).catch(
      () => [],
    );
    let bookingsTotal = 0;
    let bookingsCancelled = 0;
    let bookingsRescheduled = 0;
    let outboundMessages = 0;

    for (const event of events) {
      if (event.type === "booking_created") bookingsTotal += 1;
      if (event.type === "outbound_sent") outboundMessages += 1;
      if (event.type === "booking_reminders_cleared") {
        const status = String(event.payload?.status || "").toLowerCase();
        if (status === "rescheduled") bookingsRescheduled += 1;
        if (["cancelled", "canceled", "rejected", "no_show", "noshow"].includes(status)) {
          bookingsCancelled += 1;
        }
      }
    }

    const feedbackCount = feedback.length;
    const feedbackAvg =
      feedbackCount > 0
        ? feedback.reduce((sum, entry) => sum + Number(entry.rating || 0), 0) / feedbackCount
        : 0;

    return {
      period,
      metrics: {
        bookingsTotal,
        bookingsUpcoming: 0,
        bookingsPast: 0,
        bookingsCancelled,
        bookingsRescheduled,
        feedbackCount,
        feedbackAvg,
        outboundMessages,
        inboundMessages: 0,
        cancellationRate: bookingsTotal > 0 ? (bookingsCancelled / bookingsTotal) * 100 : 0,
        rescheduleRate: bookingsTotal > 0 ? (bookingsRescheduled / bookingsTotal) * 100 : 0,
        noShowRate: 0,
        repeatVisitRate: 0,
        messageDeliveryRate: 0,
        adminInterventionRate: 0,
      },
    };
  }

  const interval = periodToInterval(period);
  const pool = getPool();

  const bookings = await pool.query(
    `
    select
      count(*)::bigint as total,
      count(*) filter (where start_at >= now())::bigint as upcoming,
      count(*) filter (where start_at < now())::bigint as past,
      count(*) filter (where status = 'cancelled')::bigint as cancelled,
      count(*) filter (where status = 'rescheduled')::bigint as rescheduled,
      count(*) filter (where status = 'no_show' or status = 'noshow')::bigint as no_show
    from appointments_map
    where tenant_id = $1
      and (start_at is null or start_at >= now() - interval '${interval}')
  `,
    [tenantId],
  );

  const feedback = await pool.query(
    `
    select
      count(*)::bigint as count,
      coalesce(avg(rating), 0)::numeric as avg
    from feedback
    where tenant_id = $1
      and created_at >= now() - interval '${interval}'
  `,
    [tenantId],
  );

  let outboundMessages = 0;
  let inboundMessages = 0;
  try {
    const outbound = await pool.query(
      `
      select count(*)::bigint as count
      from message_log
      where tenant_id = $1
        and direction = 'outbound'
        and created_at >= now() - interval '${interval}'
    `,
      [tenantId],
    );
    outboundMessages = Number(outbound.rows[0]?.count || 0);
    const inbound = await pool.query(
      `
      select count(*)::bigint as count
      from message_log
      where tenant_id = $1
        and direction = 'inbound'
        and created_at >= now() - interval '${interval}'
    `,
      [tenantId],
    );
    inboundMessages = Number(inbound.rows[0]?.count || 0);
  } catch {
    outboundMessages = 0;
    inboundMessages = 0;
  }

  let repeatVisitRate = 0;
  try {
    const repeat = await pool.query(
      `
      select
        count(*) filter (where cnt > 1)::bigint as repeat_clients,
        count(*)::bigint as total_clients
      from (
        select client_id, count(*) as cnt
        from appointments_map
        where tenant_id = $1
          and client_id is not null
          and (start_at is null or start_at >= now() - interval '${interval}')
        group by client_id
      ) t
    `,
      [tenantId],
    );
    const repeatRow = repeat.rows[0] || {};
    const repeatClients = Number(repeatRow.repeat_clients || 0);
    const totalClients = Number(repeatRow.total_clients || 0);
    repeatVisitRate = totalClients > 0 ? (repeatClients / totalClients) * 100 : 0;
  } catch {
    repeatVisitRate = 0;
  }

  let messageDeliveryRate = 0;
  try {
    const delivery = await pool.query(
      `
      select
        count(*)::bigint as total,
        count(*) filter (where status = 'processed')::bigint as processed
      from job_log
      where tenant_id = $1
        and queue like 'queue:send:%'
        and created_at >= now() - interval '${interval}'
    `,
      [tenantId],
    );
    const row = delivery.rows[0] || {};
    const total = Number(row.total || 0);
    const processed = Number(row.processed || 0);
    messageDeliveryRate = total > 0 ? (processed / total) * 100 : 0;
  } catch {
    messageDeliveryRate = 0;
  }

  let adminInterventionRate = 0;
  try {
    const interventions = await pool.query(
      `
      select count(*)::bigint as count
      from audit_log
      where tenant_id = $1
        and action like 'admin.%'
        and created_at >= now() - interval '${interval}'
    `,
      [tenantId],
    );
    const interventionCount = Number(interventions.rows[0]?.count || 0);
    const bookingsTotal = Number(bookings.rows[0]?.total || 0);
    adminInterventionRate = bookingsTotal > 0 ? (interventionCount / bookingsTotal) * 100 : 0;
  } catch {
    adminInterventionRate = 0;
  }

  let rollupMetrics: Record<string, unknown> = {};
  const rollup = await safeQuery(
    `
    select metrics
    from kpi_rollup
    where tenant_id = $1
      and granularity = $2
      and period_start >= (now() - interval '${interval}')::date
    order by period_start desc
    limit 1
  `,
    [tenantId, period],
  );
  if (rollup?.rows?.[0]?.metrics) {
    rollupMetrics = rollup.rows[0].metrics as Record<string, unknown>;
  }

  const bookingsRow = bookings.rows[0] || {};
  const feedbackRow = feedback.rows[0] || {};

  const bookingsTotal = Number(bookingsRow.total || 0);
  const bookingsCancelled = Number(bookingsRow.cancelled || 0);
  const bookingsRescheduled = Number(bookingsRow.rescheduled || 0);
  const noShowCount = Number(bookingsRow.no_show || 0);

  const computedMetrics = {
    bookingsTotal,
    bookingsUpcoming: Number(bookingsRow.upcoming || 0),
    bookingsPast: Number(bookingsRow.past || 0),
    bookingsCancelled,
    bookingsRescheduled,
    bookingsNoShow: noShowCount,
    feedbackCount: Number(feedbackRow.count || 0),
    feedbackAvg: Number(feedbackRow.avg || 0),
    outboundMessages,
    inboundMessages,
    cancellationRate: bookingsTotal > 0 ? (bookingsCancelled / bookingsTotal) * 100 : 0,
    rescheduleRate: bookingsTotal > 0 ? (bookingsRescheduled / bookingsTotal) * 100 : 0,
    noShowRate: bookingsTotal > 0 ? (noShowCount / bookingsTotal) * 100 : 0,
    repeatVisitRate,
    messageDeliveryRate,
    adminInterventionRate,
  };

  return {
    period,
    metrics: {
      ...rollupMetrics,
      ...computedMetrics,
    },
  };
};

export const getKpiStaff = async (tenantId: string, staffId: string, period: string) => {
  if (!hasDb()) {
    const days = periodToDays(period);
    const feedback = await readFeedback(tenantId, new Date(Date.now() - days * 24 * 60 * 60 * 1000)).catch(
      () => [],
    );
    const staffFeedback = feedback.filter((entry) => entry.staffId === staffId);
    const feedbackCount = staffFeedback.length;
    const feedbackAvg =
      feedbackCount > 0
        ? staffFeedback.reduce((sum, entry) => sum + Number(entry.rating || 0), 0) / feedbackCount
        : 0;
    return {
      staffId,
      period,
      metrics: {
        feedbackCount,
        feedbackAvg,
      },
    };
  }

  const interval = periodToInterval(period);
  const pool = getPool();
  let rollupMetrics: Record<string, unknown> = {};
  const rollup = await safeQuery(
    `
    select metrics
    from staff_kpi_rollup
    where tenant_id = $1
      and staff_id = $2
      and granularity = $3
      and period_start >= (now() - interval '${interval}')::date
    order by period_start desc
    limit 1
  `,
    [tenantId, staffId, period],
  );
  if (rollup?.rows?.[0]?.metrics) {
    rollupMetrics = rollup.rows[0].metrics as Record<string, unknown>;
  }

  const feedback = await pool.query(
    `
    select
      count(*)::bigint as count,
      coalesce(avg(rating), 0)::numeric as avg
    from feedback
    where tenant_id = $1
      and staff_id = $2
      and created_at >= now() - interval '${interval}'
  `,
    [tenantId, staffId],
  );
  const row = feedback.rows[0] || {};

  return {
    staffId,
    period,
    metrics: {
      ...rollupMetrics,
      feedbackCount: Number(row.count || 0),
      feedbackAvg: Number(row.avg || 0),
    },
  };
};
