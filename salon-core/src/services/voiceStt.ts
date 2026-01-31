import fs from "fs/promises";
import { config } from "../config.js";
import type { VoiceMetadata } from "./voiceStorage.js";

type SttResult = {
  text: string;
  raw?: unknown;
};

const normalizeBase = (base: string) => base.replace(/\/+$/, "");

const resolveEndpoint = (base: string, endpoint: string, provider: string) => {
  if (!base) return "";
  if (endpoint) {
    if (endpoint.startsWith("http")) return endpoint;
    return `${normalizeBase(base)}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  }
  if (provider === "openai") {
    return `${normalizeBase(base)}/v1/audio/transcriptions`;
  }
  return `${normalizeBase(base)}/transcribe`;
};

const extractText = (result: unknown) => {
  if (!result || typeof result !== "object") return "";
  const obj = result as Record<string, unknown>;
  const text =
    (obj.text as string | undefined) ||
    (obj.transcript as string | undefined) ||
    ((obj.data as Record<string, unknown> | undefined)?.text as string | undefined);
  return text || "";
};

export const transcribeVoiceFile = async (
  metadata: VoiceMetadata,
  overrides?: { language?: string },
): Promise<SttResult> => {
  if (config.stt.mock) {
    return { text: "записаться на услугу", raw: { mocked: true } };
  }

  const provider = config.stt.provider || "openai";
  const apiBase = config.stt.apiBase;
  const apiKey = config.stt.apiKey;
  const endpoint = resolveEndpoint(apiBase, config.stt.endpoint, provider);
  if (!endpoint) {
    throw new Error("STT API is not configured");
  }

  const buffer = await fs.readFile(metadata.storedPath);
  if (provider === "openai") {
    const form = new FormData();
    const blob = new Blob([buffer], {
      type: metadata.contentType || "application/octet-stream",
    });
    form.append("file", blob, metadata.originalName || `${metadata.fileId}.bin`);
    form.append("model", config.stt.model || "whisper-1");
    const language = overrides?.language || config.stt.language;
    if (language) {
      form.append("language", language);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      body: form,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`STT error: ${response.status} ${response.statusText} - ${text}`);
    }
    const parsed = text ? JSON.parse(text) : {};
    return { text: extractText(parsed), raw: parsed };
  }

  const payload = {
    fileBase64: buffer.toString("base64"),
    fileName: metadata.originalName || `${metadata.fileId}.bin`,
    contentType: metadata.contentType || "application/octet-stream",
    model: config.stt.model,
    language: overrides?.language || config.stt.language || undefined,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`STT error: ${response.status} ${response.statusText} - ${text}`);
  }
  const parsed = text ? JSON.parse(text) : {};
  return { text: extractText(parsed), raw: parsed };
};
