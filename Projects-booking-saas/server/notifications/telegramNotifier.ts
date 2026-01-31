import type { NotificationChannel } from "./channel";

export class TelegramNotifier implements NotificationChannel {
  async send(message: string, recipient: string): Promise<void> {
    // TODO: Implement Telegram notification
  }
}

