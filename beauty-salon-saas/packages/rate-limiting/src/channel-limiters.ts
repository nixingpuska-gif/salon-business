import { RateLimiterRedis } from "rate-limiter-flexible";
import { redis } from "./redis";

/**
 * Telegram Bot API.
 * Limit: 30 messages per second (global).
 */
export const telegramChannelLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:channel:telegram",
  points: 30,
  duration: 1,
});

/**
 * WhatsApp Business API.
 * Limit: 20 messages per second (global).
 */
export const whatsappChannelLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:channel:whatsapp",
  points: 20,
  duration: 1,
});

/**
 * MAX Messenger API.
 * Limit: 30 requests per second (global).
 */
export const maxChannelLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:channel:max",
  points: 30,
  duration: 1,
});

/**
 * Instagram Messaging API.
 * Limit: 25 messages per second (global).
 */
export const instagramChannelLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:channel:instagram",
  points: 25,
  duration: 1,
});

/**
 * VK Bots API.
 * Limit: 20 messages per second (global).
 */
export const vkChannelLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:channel:vk",
  points: 20,
  duration: 1,
});

export const channelLimiters = {
  telegram: telegramChannelLimiter,
  whatsapp: whatsappChannelLimiter,
  max: maxChannelLimiter,
  instagram: instagramChannelLimiter,
  vk: vkChannelLimiter,
};

export type ChannelLimiterKey = keyof typeof channelLimiters;
