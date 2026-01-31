import { config } from "../../config.js";

export const sendInstagram = async ({
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
  const { instagramSendUrl, instagramToken } = config.channels;
  const url = sendUrl || instagramSendUrl;
  const bearer = token || instagramToken;
  if (!url || !bearer) {
    throw new Error("INSTAGRAM_SEND_URL and INSTAGRAM_TOKEN are required");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify({
      recipient: { id: to },
      message: { text: message },
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Instagram send failed: ${response.status} ${text}`);
  }
  return text ? JSON.parse(text) : {};
};
