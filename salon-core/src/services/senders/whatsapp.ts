import { config } from "../../config.js";

export const sendWhatsapp = async ({
  to,
  message,
  sendUrl,
  apiBase,
  phoneId,
  token,
}: {
  to: string;
  message: string;
  sendUrl?: string;
  apiBase?: string;
  phoneId?: string;
  token?: string;
}) => {
  const {
    whatsappSendUrl,
    whatsappApiBase,
    whatsappPhoneId,
    whatsappToken,
  } = config.channels;

  const url =
    sendUrl ||
    whatsappSendUrl ||
    ((apiBase || whatsappApiBase) && (phoneId || whatsappPhoneId)
      ? `${apiBase || whatsappApiBase}/${phoneId || whatsappPhoneId}/messages`
      : "");

  const bearer = token || whatsappToken;
  if (!url || !bearer) {
    throw new Error("WHATSAPP_TOKEN and (WHATSAPP_SEND_URL or WHATSAPP_API_BASE+WHATSAPP_PHONE_ID) required");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`WhatsApp send failed: ${response.status} ${text}`);
  }
  return text ? JSON.parse(text) : {};
};
