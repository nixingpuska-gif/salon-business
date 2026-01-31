import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { notificationTemplates, notificationLogs } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getNotificationSettings } from "../db/notificationSettings";
import { getTemplateForNotification, renderTemplate } from "../notifications/templateService";
import { sendBookingTelegramMessage } from "../telegram/bookingBot";

export const notificationTemplatesRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          channel: z.string().default("telegram_booking"),
          type: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const channel = input?.channel ?? "telegram_booking";

      const conditions = [eq(notificationTemplates.tenantId, tenantId), eq(notificationTemplates.channel, channel)];

      if (input?.type) {
        conditions.push(eq(notificationTemplates.type, input.type));
      }

      const result = await db
        .select({
          id: notificationTemplates.id,
          channel: notificationTemplates.channel,
          type: notificationTemplates.type,
          variantKey: notificationTemplates.variantKey,
          title: notificationTemplates.title,
          body: notificationTemplates.body,
          isDefault: notificationTemplates.isDefault,
          isActive: notificationTemplates.isActive,
          updatedAt: notificationTemplates.updatedAt,
        })
        .from(notificationTemplates)
        .where(and(...conditions));

      return result.map((template) => ({
        id: template.id,
        channel: template.channel,
        type: template.type,
        variantKey: template.variantKey ?? "A",
        title: template.title,
        body: template.body,
        isDefault: template.isDefault === 1,
        isActive: template.isActive === 1,
        updatedAt: template.updatedAt instanceof Date ? template.updatedAt.toISOString() : String(template.updatedAt),
      }));
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        channel: z.string(),
        type: z.string(),
        variantKey: z.string().max(16).default("A"),
        title: z.string().min(1).max(100),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;

      if (input.id) {
        const [existing] = await db
          .select()
          .from(notificationTemplates)
          .where(and(eq(notificationTemplates.id, input.id), eq(notificationTemplates.tenantId, tenantId)))
          .limit(1);

        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
        }

        await db
          .update(notificationTemplates)
          .set({
            title: input.title,
            body: input.body,
            updatedAt: new Date(),
          })
          .where(eq(notificationTemplates.id, input.id));

        const [updated] = await db
          .select()
          .from(notificationTemplates)
          .where(eq(notificationTemplates.id, input.id))
          .limit(1);

        return {
          id: updated!.id,
          channel: updated!.channel,
          type: updated!.type,
          variantKey: updated!.variantKey ?? "A",
          title: updated!.title,
          body: updated!.body,
          isDefault: updated!.isDefault === 1,
          isActive: updated!.isActive === 1,
          updatedAt: updated!.updatedAt instanceof Date ? updated!.updatedAt.toISOString() : String(updated!.updatedAt),
        };
      } else {
        const [existing] = await db
          .select()
          .from(notificationTemplates)
          .where(
            and(
              eq(notificationTemplates.tenantId, tenantId),
              eq(notificationTemplates.channel, input.channel),
              eq(notificationTemplates.type, input.type),
              eq(notificationTemplates.variantKey, input.variantKey)
            )
          )
          .limit(1);

        if (existing) {
          await db
            .update(notificationTemplates)
            .set({
              title: input.title,
              body: input.body,
              updatedAt: new Date(),
            })
            .where(eq(notificationTemplates.id, existing.id));

          const [updated] = await db
            .select()
            .from(notificationTemplates)
            .where(eq(notificationTemplates.id, existing.id))
            .limit(1);

          return {
            id: updated!.id,
            channel: updated!.channel,
            type: updated!.type,
            variantKey: updated!.variantKey ?? "A",
            title: updated!.title,
            body: updated!.body,
            isDefault: updated!.isDefault === 1,
            isActive: updated!.isActive === 1,
            updatedAt: updated!.updatedAt instanceof Date ? updated!.updatedAt.toISOString() : String(updated!.updatedAt),
          };
        }

        const insertResult = await db.insert(notificationTemplates).values({
          tenantId,
          channel: input.channel,
          type: input.type,
          variantKey: input.variantKey,
          title: input.title,
          body: input.body,
          isDefault: 0,
          isActive: 1,
          updatedAt: new Date(),
        });

        const insertId = Number(insertResult[0].insertId);
        const [created] = await db
          .select()
          .from(notificationTemplates)
          .where(eq(notificationTemplates.id, insertId))
          .limit(1);

        return {
          id: created!.id,
          channel: created!.channel,
          type: created!.type,
          variantKey: created!.variantKey ?? "A",
          title: created!.title,
          body: created!.body,
          isDefault: created!.isDefault === 1,
          isActive: created!.isActive === 1,
          updatedAt: created!.updatedAt instanceof Date ? created!.updatedAt.toISOString() : String(created!.updatedAt),
        };
      }
    }),

  resetToDefault: protectedProcedure
    .input(
      z.object({
        channel: z.string(),
        type: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;

      await db
        .delete(notificationTemplates)
        .where(
          and(
            eq(notificationTemplates.tenantId, tenantId),
            eq(notificationTemplates.channel, input.channel),
            eq(notificationTemplates.type, input.type)
          )
        );

      return { success: true };
    }),

  get: protectedProcedure
    .input(
      z.object({
        channel: z.string(),
        type: z.string(),
        variantKey: z.string().max(16).default("A"),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;

      const [custom] = await db
        .select()
        .from(notificationTemplates)
        .where(
          and(
            eq(notificationTemplates.tenantId, tenantId),
            eq(notificationTemplates.channel, input.channel),
            eq(notificationTemplates.type, input.type),
            eq(notificationTemplates.variantKey, input.variantKey)
          )
        )
        .limit(1);

      if (custom) {
        return {
          id: custom.id,
          channel: custom.channel,
          type: custom.type,
          variantKey: custom.variantKey ?? "A",
          title: custom.title,
          body: custom.body,
          isDefault: custom.isDefault === 1,
          isActive: custom.isActive === 1,
          updatedAt: custom.updatedAt instanceof Date ? custom.updatedAt.toISOString() : String(custom.updatedAt),
        };
      }

      const [defaultTemplate] = await db
        .select()
        .from(notificationTemplates)
        .where(
          and(
            eq(notificationTemplates.tenantId, 0),
            eq(notificationTemplates.isDefault, 1),
            eq(notificationTemplates.channel, input.channel),
            eq(notificationTemplates.type, input.type),
            eq(notificationTemplates.variantKey, input.variantKey)
          )
        )
        .limit(1);

      if (defaultTemplate) {
        return {
          id: defaultTemplate.id,
          channel: defaultTemplate.channel,
          type: defaultTemplate.type,
          variantKey: defaultTemplate.variantKey ?? "A",
          title: defaultTemplate.title,
          body: defaultTemplate.body,
          isDefault: defaultTemplate.isDefault === 1,
          isActive: defaultTemplate.isActive === 1,
          updatedAt:
            defaultTemplate.updatedAt instanceof Date
              ? defaultTemplate.updatedAt.toISOString()
              : String(defaultTemplate.updatedAt),
        };
      }

      return null;
    }),

  listVariants: protectedProcedure
    .input(
      z.object({
        channel: z.string(),
        type: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;

      const customTemplates = await db
        .select()
        .from(notificationTemplates)
        .where(
          and(
            eq(notificationTemplates.tenantId, tenantId),
            eq(notificationTemplates.channel, input.channel),
            eq(notificationTemplates.type, input.type)
          )
        )
        .orderBy(notificationTemplates.variantKey);

      if (customTemplates.length > 0) {
        return customTemplates.map((t) => ({
          id: t.id,
          channel: t.channel,
          type: t.type,
          variantKey: t.variantKey ?? "A",
          title: t.title,
          body: t.body,
          isDefault: t.isDefault === 1,
          isActive: t.isActive === 1,
          updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : String(t.updatedAt),
        }));
      }

      const defaultTemplates = await db
        .select()
        .from(notificationTemplates)
        .where(
          and(
            eq(notificationTemplates.tenantId, 0),
            eq(notificationTemplates.isDefault, 1),
            eq(notificationTemplates.channel, input.channel),
            eq(notificationTemplates.type, input.type)
          )
        )
        .orderBy(notificationTemplates.variantKey);

      return defaultTemplates.map((t) => ({
        id: t.id,
        channel: t.channel,
        type: t.type,
        variantKey: t.variantKey ?? "A",
        title: t.title,
        body: t.body,
        isDefault: t.isDefault === 1,
        isActive: t.isActive === 1,
        updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : String(t.updatedAt),
      }));
    }),

  sendTest: protectedProcedure
    .input(
      z.object({
        channel: z.string(),
        type: z.string(),
        bodyOverride: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;

      const settings = await getNotificationSettings(tenantId);

      if (input.channel === "telegram_booking") {
        if (!settings.testTelegramChatId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Не указан Telegram chat ID для тестовых отправок. Укажите его в настройках уведомлений.",
          });
        }

        let templateBody: string;

        if (input.bodyOverride) {
          templateBody = input.bodyOverride;
        } else {
          const template = await getTemplateForNotification({
            tenantId,
            channel: input.channel,
            type: input.type,
          });
          templateBody = template.body;
        }

        const vars = {
          clientName: "Анна",
          serviceName: "Маникюр люкс",
          masterName: "Мария",
          date: "12.12.2025",
          time: "14:00",
          businessName: "Ваш салон",
        };

        const renderedText = renderTemplate(templateBody, vars);
        const testMessageText = `[TEST] ${renderedText}`;

        try {
          await sendBookingTelegramMessage(settings.testTelegramChatId, testMessageText);
          console.log("[NotificationTemplates][TestSend] Test message sent", {
            tenantId,
            channel: input.channel,
            type: input.type,
            chatId: settings.testTelegramChatId,
          });

          const template = await getTemplateForNotification({
            tenantId,
            channel: input.channel,
            type: input.type,
            clientId: null,
          });

          await db.insert(notificationLogs).values({
            tenantId,
            clientId: 0,
            appointmentId: 0,
            channel: input.channel,
            type: input.type,
            status: "sent",
            errorMessage: null,
            messageText: testMessageText,
            templateId: template.templateId,
            templateVariantKey: template.variantKey,
            isTest: 1,
            sentAt: new Date(),
          });

          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const truncatedError = errorMessage.length > 255 ? errorMessage.substring(0, 255) : errorMessage;

          console.error("[NotificationTemplates][TestSend] Error sending test message", {
            error,
            tenantId,
            channel: input.channel,
            type: input.type,
            chatId: settings.testTelegramChatId,
          });

          const template = await getTemplateForNotification({
            tenantId,
            channel: input.channel,
            type: input.type,
            clientId: null,
          });

          await db.insert(notificationLogs).values({
            tenantId,
            clientId: 0,
            appointmentId: 0,
            channel: input.channel,
            type: input.type,
            status: "failed",
            errorMessage: truncatedError,
            messageText: testMessageText,
            templateId: template.templateId,
            templateVariantKey: template.variantKey,
            isTest: 1,
            sentAt: new Date(),
          });

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Не удалось отправить тестовое сообщение. Попробуйте позже.",
          });
        }
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Тестовая отправка для канала "${input.channel}" пока не поддерживается.`,
      });
    }),
});

