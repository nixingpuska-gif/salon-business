import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { notificationLogs, notificationTemplates } from "../../drizzle/schema";
import { eq, and, gte, lte, ne, inArray } from "drizzle-orm";
import { getTemplateConversionStats } from "../notifications/conversionService";

export const notificationStatsRouter = router({
  byTemplateVariant: protectedProcedure
    .input(
      z.object({
        channel: z.string(),
        type: z.string(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const now = new Date();
      const defaultFrom = new Date(now);
      defaultFrom.setDate(defaultFrom.getDate() - 30);

      const fromDate = input.from ? new Date(input.from) : defaultFrom;
      const toDate = input.to ? new Date(input.to) : now;

      const logs = await db
        .select({
          templateId: notificationLogs.templateId,
          templateVariantKey: notificationLogs.templateVariantKey,
          status: notificationLogs.status,
          clientId: notificationLogs.clientId,
        })
        .from(notificationLogs)
        .where(
          and(
            eq(notificationLogs.tenantId, tenantId),
            eq(notificationLogs.channel, input.channel),
            eq(notificationLogs.type, input.type),
            gte(notificationLogs.createdAt, fromDate),
            lte(notificationLogs.createdAt, toDate),
            ne(notificationLogs.clientId, 0),
            ne(notificationLogs.appointmentId, 0),
            eq(notificationLogs.isTest, 0)
          )
        );

      const variantStats = new Map<
        string,
        {
          templateId: number | null;
          templateVariantKey: string | null;
          sentCount: number;
          failedCount: number;
          clientIds: Set<number>;
        }
      >();

      for (const log of logs) {
        const key = `${log.templateId ?? "null"}_${log.templateVariantKey ?? "null"}`;
        if (!variantStats.has(key)) {
          variantStats.set(key, {
            templateId: log.templateId,
            templateVariantKey: log.templateVariantKey,
            sentCount: 0,
            failedCount: 0,
            clientIds: new Set(),
          });
        }

        const stat = variantStats.get(key)!;
        if (log.status === "sent") {
          stat.sentCount++;
        } else if (log.status === "failed") {
          stat.failedCount++;
        }
        if (log.clientId) {
          stat.clientIds.add(log.clientId);
        }
      }

      const templateIds = Array.from(new Set(Array.from(variantStats.values()).map((v) => v.templateId).filter((id) => id !== null))) as number[];

      const templates = templateIds.length > 0
        ? await db
            .select({
              id: notificationTemplates.id,
              title: notificationTemplates.title,
              body: notificationTemplates.body,
            })
            .from(notificationTemplates)
            .where(
              and(
                eq(notificationTemplates.tenantId, tenantId),
                inArray(notificationTemplates.id, templateIds)
              )
            )
        : [];

      const templateMap = new Map(templates.map((t) => [t.id, t]));

      return Array.from(variantStats.values())
        .map((stat) => {
          const template = stat.templateId ? templateMap.get(stat.templateId) : null;
          const total = stat.sentCount + stat.failedCount;
          const successRate = total > 0 ? Math.round((stat.sentCount / total) * 100) : 0;

          return {
            templateId: stat.templateId,
            templateVariantKey: stat.templateVariantKey ?? "A",
            title: template?.title ?? null,
            bodyPreview: template?.body ? template.body.substring(0, 100) + (template.body.length > 100 ? "..." : "") : "",
            sentCount: stat.sentCount,
            failedCount: stat.failedCount,
            successRate,
            uniqueClients: stat.clientIds.size,
          };
        })
        .sort((a, b) => b.successRate - a.successRate);
    }),

  timelineByVariant: protectedProcedure
    .input(
      z.object({
        channel: z.string(),
        type: z.string(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const now = new Date();
      const defaultFrom = new Date(now);
      defaultFrom.setDate(defaultFrom.getDate() - 30);

      const fromDate = input.from ? new Date(input.from) : defaultFrom;
      const toDate = input.to ? new Date(input.to) : now;

      const logs = await db
        .select({
          createdAt: notificationLogs.createdAt,
          templateVariantKey: notificationLogs.templateVariantKey,
          status: notificationLogs.status,
        })
        .from(notificationLogs)
        .where(
          and(
            eq(notificationLogs.tenantId, tenantId),
            eq(notificationLogs.channel, input.channel),
            eq(notificationLogs.type, input.type),
            gte(notificationLogs.createdAt, fromDate),
            lte(notificationLogs.createdAt, toDate),
            ne(notificationLogs.clientId, 0),
            ne(notificationLogs.appointmentId, 0),
            eq(notificationLogs.isTest, 0)
          )
        );

      const dateMap = new Map<string, Map<string, { sent: number; failed: number }>>();

      for (const log of logs) {
        const date = log.createdAt instanceof Date ? log.createdAt.toISOString().split("T")[0] : String(log.createdAt).split("T")[0];
        const variantKey = log.templateVariantKey ?? "A";

        if (!dateMap.has(date)) {
          dateMap.set(date, new Map());
        }

        const variantMap = dateMap.get(date)!;
        if (!variantMap.has(variantKey)) {
          variantMap.set(variantKey, { sent: 0, failed: 0 });
        }

        const stat = variantMap.get(variantKey)!;
        if (log.status === "sent") {
          stat.sent++;
        } else if (log.status === "failed") {
          stat.failed++;
        }
      }

      const result: Array<{ date: string; variantKey: string; sentCount: number; failedCount: number }> = [];

      for (const [date, variantMap] of dateMap.entries()) {
        for (const [variantKey, stat] of variantMap.entries()) {
          result.push({
            date,
            variantKey,
            sentCount: stat.sent,
            failedCount: stat.failed,
          });
        }
      }

      return result.sort((a, b) => a.date.localeCompare(b.date));
    }),

  templateConversion: protectedProcedure
    .input(
      z.object({
        channel: z.string(),
        type: z.string(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const now = new Date();
      const defaultFrom = new Date(now);
      defaultFrom.setDate(defaultFrom.getDate() - 30);

      const fromDate = input.from ? new Date(input.from) : defaultFrom;
      const toDate = input.to ? new Date(input.to) : now;

      const stats = await getTemplateConversionStats({
        tenantId,
        channel: input.channel,
        type: input.type,
        from: fromDate,
        to: toDate,
      });

      // Подтянуть title/bodyPreview из notificationTemplates
      const templateIds = Array.from(
        new Set(stats.map((s) => s.templateId).filter((id) => id !== null))
      ) as number[];

      const templates =
        templateIds.length > 0
          ? await db
              .select({
                id: notificationTemplates.id,
                title: notificationTemplates.title,
                body: notificationTemplates.body,
              })
              .from(notificationTemplates)
              .where(
                and(
                  eq(notificationTemplates.tenantId, tenantId),
                  inArray(notificationTemplates.id, templateIds)
                )
              )
          : [];

      const templateMap = new Map(templates.map((t) => [t.id, t]));

      return stats.map((stat) => {
        const template = stat.templateId ? templateMap.get(stat.templateId) : null;
        const total = stat.sentCount + stat.failedCount;
        const successRate = total > 0 ? Math.round((stat.sentCount / total) * 100) : 0;

        return {
          templateId: stat.templateId,
          templateVariantKey: stat.templateVariantKey ?? "A",
          title: template?.title ?? null,
          bodyPreview: template?.body
            ? template.body.substring(0, 120) + (template.body.length > 120 ? "..." : "")
            : null,
          sentCount: stat.sentCount,
          failedCount: stat.failedCount,
          successRate,
          uniqueClients: stat.uniqueClients,
          uniqueAppointments: stat.uniqueAppointments,
          completedCount: stat.completedCount,
          cancelledCount: stat.cancelledCount,
          noShowCount: stat.noShowCount,
          completionRate: stat.completionRate,
          noShowRate: stat.noShowRate,
        };
      });
    }),
});

