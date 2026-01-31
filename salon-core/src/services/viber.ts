import axios from 'axios';
import crypto from 'crypto';

interface ViberConfig {
  authToken: string;
  webhookUrl: string;
  botName: string;
}

interface ViberMessage {
  sender: {
    id: string;
    name: string;
  };
  message: {
    text?: string;
    type: string;
  };
  timestamp: number;
}

export class ViberService {
  private config: ViberConfig;
  private apiUrl = 'https://chatapi.viber.com/pa';

  constructor(config: ViberConfig) {
    this.config = config;
  }

  /**
   * Verify webhook signature from Viber
   */
  verifyWebhookSignature(signature: string, body: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.authToken)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Send text message to Viber user
   */
  async sendMessage(receiverId: string, text: string): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/send_message`,
        {
          receiver: receiverId,
          type: 'text',
          text: text,
          sender: {
            name: this.config.botName,
          },
        },
        {
          headers: {
            'X-Viber-Auth-Token': this.config.authToken,
          },
        }
      );
    } catch (error) {
      console.error('Failed to send Viber message:', error);
      throw error;
    }
  }

  /**
   * Send booking confirmation via Viber
   */
  async sendBookingConfirmation(
    receiverId: string,
    booking: {
      id: string;
      salonName: string;
      serviceName: string;
      date: string;
      time: string;
    }
  ): Promise<void> {
    const message = `
✅ Бронирование подтверждено!

📍 Салон: ${booking.salonName}
💇 Услуга: ${booking.serviceName}
📅 Дата: ${booking.date}
🕐 Время: ${booking.time}

ID бронирования: ${booking.id}

Ждем вас! 💖
    `.trim();

    await this.sendMessage(receiverId, message);
  }

  /**
   * Send booking reminder via Viber
   */
  async sendBookingReminder(
    receiverId: string,
    booking: {
      salonName: string;
      serviceName: string;
      date: string;
      time: string;
    }
  ): Promise<void> {
    const message = `
⏰ Напоминание о записи!

Завтра у вас запись:
📍 ${booking.salonName}
💇 ${booking.serviceName}
🕐 ${booking.time}

До встречи! 💖
    `.trim();

    await this.sendMessage(receiverId, message);
  }

  /**
   * Set webhook URL
   */
  async setWebhook(): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/set_webhook`,
        {
          url: this.config.webhookUrl,
          event_types: ['delivered', 'seen', 'failed', 'subscribed', 'unsubscribed', 'conversation_started'],
        },
        {
          headers: {
            'X-Viber-Auth-Token': this.config.authToken,
          },
        }
      );
      console.log('Viber webhook set successfully');
    } catch (error) {
      console.error('Failed to set Viber webhook:', error);
      throw error;
    }
  }
}
