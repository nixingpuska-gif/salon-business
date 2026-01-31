import { NotificationService } from "./notificationService";
import { TelegramNotifier } from "./telegramNotifier";
import { WhatsAppNotifier } from "./whatsappNotifier";
import { getWhatsAppSettings } from "../db/whatsappSettings";

const REMINDER_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function startReminderWorker() {
  const notificationService = new NotificationService();
  notificationService.registerChannel("telegram", new TelegramNotifier());

  async function initializeWhatsAppNotifier() {
    try {
      const settings = await getWhatsAppSettings(1);
      if (settings && settings.isEnabled === 1 && settings.twilioAccountSid && settings.twilioAuthToken && settings.whatsappNumber) {
        const whatsappNotifier = new WhatsAppNotifier(
          settings.twilioAccountSid,
          settings.twilioAuthToken,
          settings.whatsappNumber
        );
        notificationService.registerChannel("whatsapp", whatsappNotifier);
        console.log("[NotificationService] WhatsApp notifier initialized");
      }
    } catch (error) {
      // WhatsApp не настроен - это нормально, просто пропускаем
      // Не логируем как ошибку, чтобы не засорять консоль
    }
  }

  initializeWhatsAppNotifier();

  setInterval(async () => {
    try {
      await notificationService.processReminders();
    } catch (error) {
      console.error("[NotificationService] Error processing reminders:", error);
    }
  }, REMINDER_INTERVAL);

  console.log("[NotificationService] Reminder worker started");
}

