import { config } from "../../config.js";

export const sendTelegram = async ({
  to,
  message,
  botToken,
  sendUrl,
}: {
  to: string;
  message: string;
  botToken?: string;
  sendUrl?: string;
}) => {
  const token = botToken || config.channels.telegramBotToken;
  const url =
    sendUrl ||
    config.channels.telegramSendUrl ||
    (token ? `https://api.telegram.org/bot${token}/sendMessage` : "");

  if (!url) {
    throw new Error("TELEGRAM_SEND_URL or TELEGRAM_BOT_TOKEN is required");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: to, text: message }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Telegram send failed: ${response.status} ${text}`);
  }
  return text ? JSON.parse(text) : {};
};
