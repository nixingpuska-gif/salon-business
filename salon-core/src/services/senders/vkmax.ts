import { config } from "../../config.js";

export const sendVkmax = async ({
  to,
  message,
  sendUrl,
  token,
}: {
  to: string;
  message: string;
  sendUrl?: string;
  token?: string;
}) => {
  const { vkmaxSendUrl, vkmaxToken } = config.channels;
  const url = sendUrl || vkmaxSendUrl;
  const bearer = token || vkmaxToken;
  if (!url || !bearer) {
    throw new Error("VKMAX_SEND_URL and VKMAX_TOKEN are required");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify({ to, message }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`VK Max send failed: ${response.status} ${text}`);
  }
  return text ? JSON.parse(text) : {};
};
