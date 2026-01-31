import { MessengerBot, MessengerType } from '../models/MessengerBot';
import { InstagramService } from './instagram';
import { VKService } from './vk';
import { ViberService } from './viber';
import { MAXService } from './max';

export class BotManager {
  private instagramBots: Map<string, InstagramService> = new Map();
  private vkBots: Map<string, VKService> = new Map();
  private viberBots: Map<string, ViberService> = new Map();
  private maxBots: Map<string, MAXService> = new Map();

  /**
   * Get Instagram bot for salon
   */
  async getInstagramBot(salonId: string): Promise<InstagramService | null> {
    if (this.instagramBots.has(salonId)) {
      return this.instagramBots.get(salonId)!;
    }

    const botConfig = await MessengerBot.findOne({
      where: {
        salonId,
        messengerType: MessengerType.INSTAGRAM,
        isActive: true,
      },
    });

    if (!botConfig) {
      return null;
    }

    const bot = new InstagramService({
      pageAccessToken: botConfig.credentials.pageAccessToken!,
      appSecret: botConfig.credentials.appSecret!,
      verifyToken: botConfig.credentials.verifyToken!,
    });

    this.instagramBots.set(salonId, bot);
    return bot;
  }

  /**
   * Get VK bot for salon
   */
  async getVKBot(salonId: string): Promise<VKService | null> {
    if (this.vkBots.has(salonId)) {
      return this.vkBots.get(salonId)!;
    }

    const botConfig = await MessengerBot.findOne({
      where: {
        salonId,
        messengerType: MessengerType.VK,
        isActive: true,
      },
    });

    if (!botConfig) {
      return null;
    }

    const bot = new VKService({
      accessToken: botConfig.credentials.accessToken!,
      groupId: botConfig.credentials.groupId!,
      secretKey: botConfig.credentials.secretKey!,
      confirmationToken: botConfig.credentials.confirmationToken!,
      apiVersion: '5.131',
    });

    this.vkBots.set(salonId, bot);
    return bot;
  }

  /**
   * Get Viber bot for salon
   */
  async getViberBot(salonId: string): Promise<ViberService | null> {
    if (this.viberBots.has(salonId)) {
      return this.viberBots.get(salonId)!;
    }

    const botConfig = await MessengerBot.findOne({
      where: {
        salonId,
        messengerType: MessengerType.VIBER,
        isActive: true,
      },
    });

    if (!botConfig) {
      return null;
    }

    const bot = new ViberService({
      authToken: botConfig.credentials.authToken!,
      webhookUrl: botConfig.config.webhookUrl!,
      botName: botConfig.config.botName || 'Salon Bot',
    });

    this.viberBots.set(salonId, bot);
    return bot;
  }

  /**
   * Get MAX bot for salon
   */
  async getMAXBot(salonId: string): Promise<MAXService | null> {
    if (this.maxBots.has(salonId)) {
      return this.maxBots.get(salonId)!;
    }

    const botConfig = await MessengerBot.findOne({
      where: {
        salonId,
        messengerType: MessengerType.MAX,
        isActive: true,
      },
    });

    if (!botConfig) {
      return null;
    }

    const bot = new MAXService({
      apiKey: botConfig.credentials.apiKey!,
      botToken: botConfig.credentials.botToken!,
      webhookSecret: botConfig.credentials.webhookSecret!,
    });

    this.maxBots.set(salonId, bot);
    return bot;
  }

  /**
   * Clear cached bot instance
   */
  clearCache(salonId: string, messengerType: MessengerType): void {
    switch (messengerType) {
      case MessengerType.INSTAGRAM:
        this.instagramBots.delete(salonId);
        break;
      case MessengerType.VK:
        this.vkBots.delete(salonId);
        break;
      case MessengerType.VIBER:
        this.viberBots.delete(salonId);
        break;
      case MessengerType.MAX:
        this.maxBots.delete(salonId);
        break;
    }
  }
}

export const botManager = new BotManager();
