import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { notificationLogs } from "../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export const notificationLogsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
          channel: z.string().optional(),
          type: z.string().optional(),
          status: z.string().optional(),
          appointmentId: z.number().int().positive().optional(),
          clientId: z.number().int().positive().optional(),
          limit: z.number().int().min(1).max(200).default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const conditions = [eq(notificationLogs.tenantId, tenantId)];

      const now = new Date();
      const defaultFrom = new Date(now);
      defaultFrom.setDate(defaultFrom.getDate() - 7);

      const fromDate = input?.from ? new Date(input.from) : defaultFrom;
      const toDate = input?.to ? new Date(input.to) : now;

      conditions.push(gte(notificationLogs.createdAt, fromDate));
      conditions.push(lte(notificationLogs.createdAt, toDate));

      if (input?.channel) {
        conditions.push(eq(notificationLogs.channel, input.channel));
      }

      if (input?.type) {
        conditions.push(eq(notificationLogs.type, input.type));
      }

      if (input?.status) {
        conditions.push(eq(notificationLogs.status, input.status));
      }

      if (input?.appointmentId) {
        conditions.push(eq(notificationLogs.appointmentId, input.appointmentId));
      }

      if (input?.clientId) {
        conditions.push(eq(notificationLogs.clientId, input.clientId));
      }

      const result = await db
        .select({
          id: notificationLogs.id,
          createdAt: notificationLogs.createdAt,
          channel: notificationLogs.channel,
          type: notificationLogs.type,
          status: notificationLogs.status,
          errorMessage: notificationLogs.errorMessage,
          appointmentId: notificationLogs.appointmentId,
          clientId: notificationLogs.clientId,
          messageText: notificationLogs.messageText,
          sentAt: notificationLogs.sentAt,
        })
        .from(notificationLogs)
        .where(and(...conditions))
        .orderBy(desc(notificationLogs.createdAt))
        .limit(input?.limit ?? 50);

      return result.map((log) => ({
        id: log.id,
        createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt),
        channel: log.channel,
        type: log.type,
        status: log.status,
        errorMessage: log.errorMessage,
        appointmentId: log.appointmentId,
        clientId: log.clientId,
        messageText: log.messageText,
        sentAt: log.sentAt instanceof Date ? log.sentAt.toISOString() : String(log.sentAt),
      }));
    }),

  details: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;

      const [log] = await db
        .select()
        .from(notificationLogs)
        .where(and(eq(notificationLogs.id, input.id), eq(notificationLogs.tenantId, tenantId)))
        .limit(1);

      if (!log) {
        return null;
      }

      return {
        id: log.id,
        createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt),
        channel: log.channel,
        type: log.type,
        status: log.status,
        errorMessage: log.errorMessage,
        appointmentId: log.appointmentId,
        clientId: log.clientId,
        messageText: log.messageText,
        sentAt: log.sentAt instanceof Date ? log.sentAt.toISOString() : String(log.sentAt),
        deliveredAt: log.deliveredAt
          ? log.deliveredAt instanceof Date
            ? log.deliveredAt.toISOString()
            : String(log.deliveredAt)
          : null,
        meta: log.meta,
      };
    }),
});

