import { db } from "../db";
import { notificationSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export async function getNotificationSettings(tenantId: number) {
  const [row] = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.tenantId, tenantId))
    .limit(1);

  if (!row) {
    return {
      tenantId,
      reminderEnabled: 1,
      reminder24hEnabled: 1,
      reminder1hEnabled: 1,
      telegramBookingRemindersEnabled: 1,
      testTelegramChatId: null,
      aiTone: "luxury",
      businessDescription: null,
    };
  }

  return {
    tenantId: row.tenantId,
    reminderEnabled: row.reminderEnabled,
    reminder24hEnabled: row.reminder24hEnabled,
    reminder1hEnabled: row.reminder1hEnabled,
    telegramBookingRemindersEnabled: row.telegramBookingRemindersEnabled,
    testTelegramChatId: row.testTelegramChatId,
    aiTone: (row.aiTone as "luxury" | "friendly" | "neutral") || "luxury",
    businessDescription: row.businessDescription || null,
  };
}

