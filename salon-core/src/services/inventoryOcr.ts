import { config } from "../config.js";

type OcrResult = {
  text?: string;
  items?: Array<{ sku?: string; name?: string; qty?: number; unit?: string }>;
  raw?: unknown;
};

const normalizeBase = (base: string) => base.replace(/\/+$/, "");

const resolveEndpoint = (base: string, endpoint: string) => {
  if (!base) return "";
  if (endpoint) {
    if (endpoint.startsWith("http")) return endpoint;
    return `${normalizeBase(base)}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  }
  return `${normalizeBase(base)}/ocr`;
};

export const extractInventoryFromFile = async (input: {
  buffer: Buffer;
  fileName?: string;
  contentType?: string;
}): Promise<OcrResult> => {
  if (config.ocr.mock) {
    return {
      text: "shampoo 2\nmask 1",
      items: [
        { sku: "shampoo", name: "Shampoo", qty: 2, unit: "pcs" },
        { sku: "mask", name: "Mask", qty: 1, unit: "pcs" },
      ],
      raw: { mocked: true },
    };
  }

  const apiBase = config.ocr.apiBase;
  const endpoint = resolveEndpoint(apiBase, config.ocr.endpoint);
  if (!endpoint) {
    throw new Error("OCR API is not configured");
  }

  const payload = {
    fileBase64: input.buffer.toString("base64"),
    fileName: input.fileName || "intake",
    contentType: input.contentType || "application/octet-stream",
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.ocr.apiKey ? { Authorization: `Bearer ${config.ocr.apiKey}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`OCR error: ${response.status} ${response.statusText} - ${text}`);
  }
  const parsed = text ? JSON.parse(text) : {};
  const items = Array.isArray(parsed.items) ? parsed.items : undefined;
  const outText =
    (parsed.text as string | undefined) ||
    (parsed.rawText as string | undefined) ||
    undefined;
  return { text: outText, items, raw: parsed };
};
