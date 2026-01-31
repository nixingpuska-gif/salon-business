import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { appointments, clients, services, masters } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, count, desc, sum } from "drizzle-orm";

export const reportsRouter = router({
  overview: protectedProcedure
    .input(
      z
        .object({
          from: z.string().datetime().optional(),
          to: z.string().datetime().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const now = new Date();
      const defaultFrom = new Date(now);
      defaultFrom.setDate(defaultFrom.getDate() - 30);

      const fromDate = input?.from ? new Date(input.from) : defaultFrom;
      const toDate = input?.to ? new Date(input.to) : now;

      const periodAppointments = await db
        .select()
        .from(appointments)
        .innerJoin(services, eq(appointments.serviceId, services.id))
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            eq(services.tenantId, tenantId),
            gte(appointments.startTime, fromDate),
            lte(appointments.startTime, toDate),
            eq(appointments.status, "scheduled")
          )
        );

      const totalRevenue = periodAppointments.reduce(
        (acc, apt) => acc + (Number(apt.services.price) || 0),
        0
      );

      const totalAppointments = periodAppointments.length;

      const clientFirstAppointments = await db
        .select({
          clientId: appointments.clientId,
          firstAppointment: sql<string>`MIN(${appointments.startTime})`,
        })
        .from(appointments)
        .where(eq(appointments.tenantId, tenantId))
        .groupBy(appointments.clientId);

      const newClients = clientFirstAppointments.filter(
        (c) => new Date(c.firstAppointment) >= fromDate && new Date(c.firstAppointment) <= toDate
      ).length;

      const clientAppointmentCounts = await db
        .select({
          clientId: appointments.clientId,
          count: count(),
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            gte(appointments.startTime, fromDate),
            lte(appointments.startTime, toDate)
          )
        )
        .groupBy(appointments.clientId);

      const repeatClients = clientAppointmentCounts.filter((c) => Number(c.count) > 1).length;
      const retentionRate =
        clientAppointmentCounts.length > 0
          ? repeatClients / clientAppointmentCounts.length
          : 0;

      return {
        totalRevenue,
        totalAppointments,
        newClients,
        retentionRate: Math.round(retentionRate * 100) / 100,
      };
    }),

  revenueByPeriod: protectedProcedure
    .input(
      z.object({
        from: z.string().datetime(),
        to: z.string().datetime(),
        granularity: z.enum(["day", "week", "month"]).default("day"),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);

      const dateFormatStr =
        input.granularity === "day"
          ? "%Y-%m-%d"
          : input.granularity === "week"
          ? "%Y-W%u"
          : "%Y-%m";

      const results = (await db.execute(
        sql.raw(`
          SELECT 
            DATE_FORMAT(a.start_time, '${dateFormatStr}') as bucket,
            COALESCE(SUM(s.price), 0) as revenue,
            COUNT(*) as appointmentsCount
          FROM appointments a
          INNER JOIN services s ON a.service_id = s.id
          WHERE a.tenant_id = ${tenantId}
            AND s.tenant_id = ${tenantId}
            AND a.start_time >= '${fromDate.toISOString().slice(0, 19).replace("T", " ")}'
            AND a.start_time <= '${toDate.toISOString().slice(0, 19).replace("T", " ")}'
            AND a.status = 'scheduled'
          GROUP BY bucket
          ORDER BY bucket
        `)
      )) as unknown as [any[], any];

      return results[0].map((r: any) => ({
        bucket: String(r.bucket || ""),
        revenue: Number(r.revenue || 0),
        appointmentsCount: Number(r.appointmentsCount || 0),
      }));
    }),

  topServices: protectedProcedure
    .input(
      z.object({
        from: z.string().datetime(),
        to: z.string().datetime(),
        limit: z.number().min(1).max(20).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);

      const results = await db
        .select({
          serviceId: appointments.serviceId,
          count: count(),
          revenue: sql<number>`COALESCE(SUM(${services.price}), 0)`,
        })
        .from(appointments)
        .innerJoin(services, eq(appointments.serviceId, services.id))
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            eq(services.tenantId, tenantId),
            gte(appointments.startTime, fromDate),
            lte(appointments.startTime, toDate),
            eq(appointments.status, "scheduled")
          )
        )
        .groupBy(appointments.serviceId)
        .orderBy(desc(sql`COALESCE(SUM(${services.price}), 0)`), desc(count()))
        .limit(input.limit);

      const servicesList = await db
        .select()
        .from(services)
        .where(eq(services.tenantId, tenantId));

      return results.map((r) => {
        const service = servicesList.find((s) => s.id === r.serviceId);
        return {
          serviceId: r.serviceId,
          name: service?.name || `Услуга #${r.serviceId}`,
          count: Number(r.count),
          revenue: Number(r.revenue),
        };
      });
    }),

  mastersPerformance: protectedProcedure
    .input(
      z.object({
        from: z.string().datetime(),
        to: z.string().datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);

      const results = await db
        .select({
          masterId: appointments.masterId,
          appointmentsCount: count(),
          revenue: sql<number>`COALESCE(SUM(${services.price}), 0)`,
          totalDuration: sql<number>`COALESCE(SUM(${services.durationMinutes}), 0)`,
        })
        .from(appointments)
        .innerJoin(services, eq(appointments.serviceId, services.id))
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            eq(services.tenantId, tenantId),
            gte(appointments.startTime, fromDate),
            lte(appointments.startTime, toDate),
            eq(appointments.status, "scheduled")
          )
        )
        .groupBy(appointments.masterId);

      const mastersList = await db
        .select()
        .from(masters)
        .where(eq(masters.tenantId, tenantId));

      const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      const workingDays = daysDiff;
      const totalWorkingHours = workingDays * 8;
      const totalWorkingMinutes = totalWorkingHours * 60;

      return results.map((r) => {
        const master = mastersList.find((m) => m.id === r.masterId);
        const utilization =
          totalWorkingMinutes > 0 ? Number(r.totalDuration) / totalWorkingMinutes : 0;
        return {
          masterId: r.masterId,
          name: master?.name || `Мастер #${r.masterId}`,
          appointmentsCount: Number(r.appointmentsCount),
          revenue: Number(r.revenue),
          utilization: Math.min(1, Math.max(0, utilization)),
        };
      });
    }),

  clientsActivity: protectedProcedure
    .input(
      z.object({
        from: z.string().datetime(),
        to: z.string().datetime(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);

      const results = await db
        .select({
          clientId: appointments.clientId,
          totalAppointments: count(),
          firstVisit: sql<string>`MIN(${appointments.startTime})`,
          lastVisit: sql<string>`MAX(${appointments.startTime})`,
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            gte(appointments.startTime, fromDate),
            lte(appointments.startTime, toDate)
          )
        )
        .groupBy(appointments.clientId)
        .orderBy(desc(count()))
        .limit(input.limit);

      const clientsList = await db
        .select()
        .from(clients)
        .where(eq(clients.tenantId, tenantId));

      return results.map((r) => {
        const client = clientsList.find((c) => c.id === r.clientId);
        return {
          clientId: r.clientId,
          name: client?.name || null,
          totalAppointments: Number(r.totalAppointments),
          firstVisit: new Date(String(r.firstVisit)).toISOString(),
          lastVisit: new Date(String(r.lastVisit)).toISOString(),
        };
      });
    }),
});

