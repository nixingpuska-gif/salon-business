import axios from 'axios';
import crypto from 'crypto';

interface MAXConfig {
  apiKey: string;
  botToken: string;
  webhookSecret: string;
}

interface MAXMessage {
  from: {
    id: string;
    name: string;
  };
  text: string;
  timestamp: number;
}

export class MAXService {
  private config: MAXConfig;
  private apiUrl = 'https://api.max.ru/v1'; // TODO: Уточнить реальный URL

  constructor(config: MAXConfig) {
    this.config = config;
  }

  /**
   * Verify webhook signature from MAX
   */
  verifyWebhookSignature(signature: string, body: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Send text message to MAX user
   */
  async sendMessage(userId: string, text: string): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/messages/send`,
        {
          user_id: userId,
          text: text,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.botToken}`,
            'X-API-Key': this.config.apiKey,
          },
        }
      );
    } catch (error) {
      console.error('Failed to send MAX message:', error);
      throw error;
    }
  }

  /**
   * Send booking confirmation via MAX
   */
  async sendBookingConfirmation(
    userId: string,
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

    await this.sendMessage(userId, message);
  }

  /**
   * Send booking reminder via MAX
   */
  async sendBookingReminder(
    userId: string,
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

    await this.sendMessage(userId, message);
  }

  /**
   * Get user profile information
   */
  async getUserProfile(userId: string): Promise<{
    id: string;
    name: string;
    phone?: string;
  }> {
    try {
      const response = await axios.get(`${this.apiUrl}/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.botToken}`,
          'X-API-Key': this.config.apiKey,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get MAX user profile:', error);
      throw error;
    }
  }
}
