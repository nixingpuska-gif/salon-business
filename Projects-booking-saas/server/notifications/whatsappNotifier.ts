import type { NotificationChannel } from "./channel";

export class WhatsAppNotifier implements NotificationChannel {
  constructor(
    private accountSid: string,
    private authToken: string,
    private whatsappNumber: string
  ) {}

  async send(message: string, recipient: string): Promise<void> {
    // TODO: Implement WhatsApp notification
  }
}

