import { getPool } from "./db.js";

export type JobLogMetric = {
  queue: string;
  status: string;
  count: number;
};

export type JobLogTenantMetric = JobLogMetric & {
  tenantId: string;
};

export type AppointmentMetrics = {
  total: number;
  upcoming: number;
  past: number;
};

export type AppointmentTenantMetrics = AppointmentMetrics & {
  tenantId: string;
};

type JobLogRow = {
  queue?: unknown;
  status?: unknown;
  count?: unknown;
};

type JobLogTenantRow = {
  tenant_id?: unknown;
  queue?: unknown;
  status?: unknown;
  count?: unknown;
};

type AppointmentRow = {
  total?: unknown;
  upcoming?: unknown;
  past?: unknown;
};

type AppointmentTenantRow = {
  tenant_id?: unknown;
  total?: unknown;
  upcoming?: unknown;
  past?: unknown;
};

const enabled = () => process.env.METRICS_DB === "1";

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getDbMetrics = async () => {
  if (!enabled()) return null;
  const pool = getPool();

  const jobLogRows = await pool.query<JobLogRow>(
    "select queue, status, count from v_job_log_counts_1h",
  );
  const jobLog: JobLogMetric[] = jobLogRows.rows.map((row) => ({
    queue: String(row.queue || ""),
    status: String(row.status || ""),
    count: toNumber(row.count),
  }));

  const jobLogTenantRows = await pool.query<JobLogTenantRow>(
    "select tenant_id, queue, status, count from v_job_log_counts_1h_by_tenant",
  );
  const jobLogByTenant: JobLogTenantMetric[] = jobLogTenantRows.rows.map((row) => ({
    tenantId: String(row.tenant_id || ""),
    queue: String(row.queue || ""),
    status: String(row.status || ""),
    count: toNumber(row.count),
  }));

  const appointmentsRows = await pool.query<AppointmentRow>(
    "select total, upcoming, past from v_appointments_counts",
  );
  const first = appointmentsRows.rows[0] || {};
  const appointments: AppointmentMetrics = {
    total: toNumber(first.total),
    upcoming: toNumber(first.upcoming),
    past: toNumber(first.past),
  };

  const appointmentsTenantRows = await pool.query<AppointmentTenantRow>(
    "select tenant_id, total, upcoming, past from v_appointments_counts_by_tenant",
  );
  const appointmentsByTenant: AppointmentTenantMetrics[] = appointmentsTenantRows.rows.map((row) => ({
    tenantId: String(row.tenant_id || ""),
    total: toNumber(row.total),
    upcoming: toNumber(row.upcoming),
    past: toNumber(row.past),
  }));

  return { jobLog, jobLogByTenant, appointments, appointmentsByTenant };
};
