import axios from 'axios';
import crypto from 'crypto';

interface InstagramConfig {
  pageAccessToken: string;
  appSecret: string;
  verifyToken: string;
}

interface InstagramMessage {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message: {
    mid: string;
    text?: string;
    attachments?: any[];
  };
}

export class InstagramService {
  private config: InstagramConfig;
  private apiUrl = 'https://graph.facebook.com/v18.0';

  constructor(config: InstagramConfig) {
    this.config = config;
  }

  /**
   * Verify webhook signature from Instagram
   */
  verifyWebhookSignature(signature: string, body: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.appSecret)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(`sha256=${expectedSignature}`)
    );
  }

  /**
   * Send text message to Instagram user
   */
  async sendMessage(recipientId: string, text: string): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/me/messages`,
        {
          recipient: { id: recipientId },
          message: { text },
        },
        {
          params: {
            access_token: this.config.pageAccessToken,
          },
        }
      );
    } catch (error) {
      console.error('Failed to send Instagram message:', error);
      throw error;
    }
  }

  /**
   * Send booking confirmation via Instagram
   */
  async sendBookingConfirmation(
    recipientId: string,
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

    await this.sendMessage(recipientId, message);
  }

  /**
   * Send booking reminder via Instagram
   */
  async sendBookingReminder(
    recipientId: string,
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

    await this.sendMessage(recipientId, message);
  }

  /**
   * Get user profile information
   */
  async getUserProfile(userId: string): Promise<{
    id: string;
    name: string;
    username?: string;
    profile_pic?: string;
  }> {
    try {
      const response = await axios.get(`${this.apiUrl}/${userId}`, {
        params: {
          fields: 'id,name,username,profile_pic',
          access_token: this.config.pageAccessToken,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get Instagram user profile:', error);
      throw error;
    }
  }
}
