import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { appointments, clients, services, masters } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, count, desc } from "drizzle-orm";

export const dashboardRouter = router({
  overview: protectedProcedure
    .input(
      z
        .object({
          period: z.enum(["month", "week", "day"]).optional(),
        })
        .optional()
    )
    .query(async ({ ctx }) => {
      const tenantId = ctx.user.tenantId;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const totalAppointmentsThisMonth = await db
        .select({ count: count() })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            gte(appointments.startTime, monthStart),
            lte(appointments.startTime, monthEnd)
          )
        );

      const activeClientsLast30Days = await db
        .select({ clientId: appointments.clientId })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            gte(appointments.startTime, thirtyDaysAgo)
          )
        )
        .groupBy(appointments.clientId);

      const revenueThisMonth = await db
        .select({
          total: sql<number>`COALESCE(SUM(${services.price}), 0)`,
        })
        .from(appointments)
        .innerJoin(services, eq(appointments.serviceId, services.id))
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            eq(services.tenantId, tenantId),
            gte(appointments.startTime, monthStart),
            lte(appointments.startTime, monthEnd),
            eq(appointments.status, "scheduled")
          )
        );

      const appointmentsToday = await db
        .select({ count: count() })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            gte(appointments.startTime, todayStart),
            lte(appointments.startTime, todayEnd)
          )
        );

      const upcomingAppointments = await db
        .select({
          id: appointments.id,
          startTime: appointments.startTime,
          clientId: appointments.clientId,
          serviceId: appointments.serviceId,
          masterId: appointments.masterId,
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            gte(appointments.startTime, now),
            eq(appointments.status, "scheduled")
          )
        )
        .orderBy(appointments.startTime)
        .limit(10);

      const clientsList = await db
        .select()
        .from(clients)
        .where(eq(clients.tenantId, tenantId));

      const servicesList = await db
        .select()
        .from(services)
        .where(eq(services.tenantId, tenantId));

      const mastersList = await db
        .select()
        .from(masters)
        .where(eq(masters.tenantId, tenantId));

      const topServicesThisMonth = await db
        .select({
          serviceId: appointments.serviceId,
          count: count(),
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            gte(appointments.startTime, monthStart),
            lte(appointments.startTime, monthEnd)
          )
        )
        .groupBy(appointments.serviceId)
        .orderBy(desc(count()))
        .limit(5);

      const upcomingWithNames = upcomingAppointments.map((apt) => {
        const client = clientsList.find((c) => c.id === apt.clientId);
        const service = servicesList.find((s) => s.id === apt.serviceId);
        const master = mastersList.find((m) => m.id === apt.masterId);

        return {
          id: apt.id,
          startTime: apt.startTime.toISOString(),
          clientName: client?.name || `Клиент #${apt.clientId}`,
          serviceName: service?.name || `Услуга #${apt.serviceId}`,
          masterName: master?.name || `Мастер #${apt.masterId}`,
        };
      });

      const topServicesWithNames = topServicesThisMonth.map((item) => {
        const service = servicesList.find((s) => s.id === item.serviceId);
        return {
          serviceId: item.serviceId,
          serviceName: service?.name || `Услуга #${item.serviceId}`,
          count: Number(item.count),
        };
      });

      return {
        totalAppointmentsThisMonth: Number(totalAppointmentsThisMonth[0]?.count || 0),
        activeClientsLast30Days: activeClientsLast30Days.length,
        revenueThisMonth: Number(revenueThisMonth[0]?.total || 0),
        appointmentsTodayCount: Number(appointmentsToday[0]?.count || 0),
        upcomingAppointments: upcomingWithNames,
        topServicesThisMonth: topServicesWithNames,
      };
    }),
});

