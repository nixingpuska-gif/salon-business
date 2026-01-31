import type { NotificationChannel } from "./channel";
import { db } from "../db";
import { appointments, clients, services, masters, notificationSettings, notificationLogs } from "../../drizzle/schema";
import { eq, and, gte, lte, gt, sql } from "drizzle-orm";
import { getNotificationSettings } from "../db/notificationSettings";
import { sendBookingTelegramMessage } from "../telegram/bookingBot";
import { env } from "../_core/env";
import { getTemplateForNotification, renderTemplate } from "./templateService";

export class NotificationService {
  private channels: Map<string, NotificationChannel> = new Map();

  registerChannel(name: string, channel: NotificationChannel) {
    this.channels.set(name, channel);
  }

  async processReminders() {
    const now = new Date();
    const reminder24hWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const reminder1hWindow = new Date(now.getTime() + 60 * 60 * 1000);
    const reminder24hWindowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 5 * 60 * 1000);
    const reminder1hWindowEnd = new Date(now.getTime() + 60 * 60 * 1000 + 5 * 60 * 1000);

    const allAppointments = await db
      .select({
        id: appointments.id,
        tenantId: appointments.tenantId,
        clientId: appointments.clientId,
        serviceId: appointments.serviceId,
        masterId: appointments.masterId,
        startTime: appointments.startTime,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, "scheduled"),
          gte(appointments.startTime, now),
          lte(appointments.startTime, reminder24hWindowEnd)
        )
      );

    for (const apt of allAppointments) {
      const startTime = apt.startTime as Date;
      const needs24hReminder =
        startTime >= reminder24hWindow && startTime <= reminder24hWindowEnd;
      const needs1hReminder = startTime >= reminder1hWindow && startTime <= reminder1hWindowEnd;

      if (!needs24hReminder && !needs1hReminder) {
        continue;
      }

      const settings = await getNotificationSettings(apt.tenantId);
      if (settings.reminderEnabled !== 1) {
        continue;
      }

      if (needs24hReminder && settings.reminder24hEnabled !== 1) {
        continue;
      }

      if (needs1hReminder && settings.reminder1hEnabled !== 1) {
        continue;
      }

      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, apt.clientId))
        .limit(1);

      if (!client) {
        continue;
      }

      const [service] = await db
        .select()
        .from(services)
        .where(eq(services.id, apt.serviceId))
        .limit(1);

      const [master] = await db
        .select()
        .from(masters)
        .where(eq(masters.id, apt.masterId))
        .limit(1);

      const logType = needs24hReminder ? "reminder_24h" : "reminder_1h";

      if (
        client.telegramChatId &&
        settings.telegramBookingRemindersEnabled === 1 &&
        env.TELEGRAM_BOOKING_BOT_TOKEN
      ) {
        try {
          const template = await getTemplateForNotification({
            tenantId: apt.tenantId,
            channel: "telegram_booking",
            type: logType,
            clientId: apt.clientId,
          });

          const dateStr = startTime.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
          const timeStr = startTime.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          });

          const vars = {
            clientName: client.name ?? "клиент",
            serviceName: service?.name ?? "услуга",
            masterName: master?.name ?? "мастер",
            date: dateStr,
            time: timeStr,
            businessName: "ваш салон",
          };

          const reminderText = renderTemplate(template.body, vars);

          await sendBookingTelegramMessage(client.telegramChatId, reminderText);
          console.log("[NotificationService] Telegram reminder sent", {
            appointmentId: apt.id,
            clientId: apt.clientId,
            reminderType: logType,
            chatId: client.telegramChatId,
            templateId: template.templateId,
            variantKey: template.variantKey,
          });

          await db.insert(notificationLogs).values({
            tenantId: apt.tenantId,
            clientId: apt.clientId,
            appointmentId: apt.id,
            channel: "telegram_booking",
            type: logType,
            status: "sent",
            errorMessage: null,
            messageText: reminderText,
            templateId: template.templateId,
            templateVariantKey: template.variantKey,
            isTest: 0,
            sentAt: new Date(),
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const truncatedError = errorMessage.length > 255 ? errorMessage.substring(0, 255) : errorMessage;

          console.error("[NotificationService] Error sending Telegram reminder", {
            error,
            appointmentId: apt.id,
            clientId: apt.clientId,
          });

          const template = await getTemplateForNotification({
            tenantId: apt.tenantId,
            channel: "telegram_booking",
            type: logType,
            clientId: apt.clientId,
          });

          const dateStr = startTime.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
          const timeStr = startTime.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          });

          const vars = {
            clientName: client.name ?? "клиент",
            serviceName: service?.name ?? "услуга",
            masterName: master?.name ?? "мастер",
            date: dateStr,
            time: timeStr,
            businessName: "ваш салон",
          };

          const reminderText = renderTemplate(template.body, vars);

          await db.insert(notificationLogs).values({
            tenantId: apt.tenantId,
            clientId: apt.clientId,
            appointmentId: apt.id,
            channel: "telegram_booking",
            type: logType,
            status: "failed",
            errorMessage: truncatedError,
            messageText: reminderText,
            templateId: template.templateId,
            templateVariantKey: template.variantKey,
            isTest: 0,
            sentAt: new Date(),
          });
        }
      }
    }
  }

}

