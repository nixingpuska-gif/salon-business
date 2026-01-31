import { Telegraf } from "telegraf";
import { env } from "../_core/env";
import { BotManager } from "./botManager";

let bot: Telegraf | null = null;
let botManager: BotManager | null = null;

export function initializeTelegramBot() {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.warn("[Telegram] Bot token not configured, skipping initialization");
    return;
  }

  bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
  botManager = new BotManager(bot);
  bot.launch();
  console.log("[Telegram] Bot started");

  process.once("SIGINT", () => bot?.stop("SIGINT"));
  process.once("SIGTERM", () => bot?.stop("SIGTERM"));
}

export function getBotManager(): BotManager | null {
  return botManager;
}

