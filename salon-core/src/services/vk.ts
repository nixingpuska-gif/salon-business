import axios from 'axios';
import crypto from 'crypto';

interface VKConfig {
  accessToken: string;
  groupId: string;
  secretKey: string;
  confirmationToken: string;
  apiVersion: string;
}

interface VKMessage {
  from_id: number;
  peer_id: number;
  text: string;
  conversation_message_id: number;
}

export class VKService {
  private config: VKConfig;
  private apiUrl = 'https://api.vk.com/method';

  constructor(config: VKConfig) {
    this.config = config;
  }

  /**
   * Verify webhook signature from VK
   */
  verifyWebhookSignature(signature: string, body: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.secretKey)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Send message to VK user
   */
  async sendMessage(userId: number, message: string): Promise<void> {
    try {
      await axios.post(`${this.apiUrl}/messages.send`, null, {
        params: {
          user_id: userId,
          message: message,
          random_id: Math.floor(Math.random() * 1000000000),
          access_token: this.config.accessToken,
          v: this.config.apiVersion,
        },
      });
    } catch (error) {
      console.error('Failed to send VK message:', error);
      throw error;
    }
  }

  /**
   * Send booking confirmation via VK
   */
  async sendBookingConfirmation(
    userId: number,
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
   * Send booking reminder via VK
   */
  async sendBookingReminder(
    userId: number,
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
   * Get user information
   */
  async getUserInfo(userId: number): Promise<{
    id: number;
    first_name: string;
    last_name: string;
    photo_100?: string;
  }> {
    try {
      const response = await axios.get(`${this.apiUrl}/users.get`, {
        params: {
          user_ids: userId,
          fields: 'photo_100',
          access_token: this.config.accessToken,
          v: this.config.apiVersion,
        },
      });

      return response.data.response[0];
    } catch (error) {
      console.error('Failed to get VK user info:', error);
      throw error;
    }
  }
}
