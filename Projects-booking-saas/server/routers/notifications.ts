import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { notificationSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getNotificationSettings } from "../db/notificationSettings";

export const notificationsRouter = router({
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    return await getNotificationSettings(tenantId);
  }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        reminderEnabled: z.number().int().min(0).max(1).optional(),
        reminder24hEnabled: z.number().int().min(0).max(1).optional(),
        reminder1hEnabled: z.number().int().min(0).max(1).optional(),
        telegramBookingRemindersEnabled: z.number().int().min(0).max(1).optional(),
        testTelegramChatId: z.string().max(64).nullable().optional(),
        aiTone: z.enum(["luxury", "friendly", "neutral"]).optional(),
        businessDescription: z.string().max(1000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;

      const [existing] = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.tenantId, tenantId))
        .limit(1);

      if (existing) {
        await db
          .update(notificationSettings)
          .set(input)
          .where(eq(notificationSettings.tenantId, tenantId));
      } else {
        await db.insert(notificationSettings).values({
          tenantId,
          reminderEnabled: input.reminderEnabled ?? 1,
          reminder24hEnabled: input.reminder24hEnabled ?? 1,
          reminder1hEnabled: input.reminder1hEnabled ?? 1,
          telegramBookingRemindersEnabled: input.telegramBookingRemindersEnabled ?? 1,
        });
      }

      return await getNotificationSettings(tenantId);
    }),
});

