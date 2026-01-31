import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";

export type VoiceMetadata = {
  fileId: string;
  tenantId: string;
  originalName?: string;
  contentType?: string;
  bytes: number;
  createdAt: string;
  storedPath: string;
};

export type VoiceUploadResult = {
  fileId: string;
  storedPath: string;
  bytes: number;
  contentType?: string;
  originalName?: string;
};

const safeName = (value?: string) => {
  if (!value) return "voice";
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100) || "voice";
};

const resolveExtension = (name?: string, contentType?: string) => {
  const ext = name ? path.extname(name) : "";
  if (ext) return ext;
  if (!contentType) return ".bin";
  if (contentType.includes("ogg")) return ".ogg";
  if (contentType.includes("wav")) return ".wav";
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return ".mp3";
  if (contentType.includes("webm")) return ".webm";
  return ".bin";
};

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

export const storeVoiceFile = async ({
  buffer,
  tenantId,
  originalName,
  contentType,
}: {
  buffer: Buffer;
  tenantId: string;
  originalName?: string;
  contentType?: string;
}): Promise<VoiceUploadResult> => {
  const fileId = crypto.randomUUID();
  const baseDir = config.voice.storagePath || path.join(process.cwd(), "storage", "voice");
  const tenantDir = await ensureDir(path.join(baseDir, tenantId));
  const safeOriginal = safeName(originalName);
  const ext = resolveExtension(safeOriginal, contentType);
  const storedPath = path.join(tenantDir, `${fileId}${ext}`);
  await fs.writeFile(storedPath, buffer);

  const metadata: VoiceMetadata = {
    fileId,
    tenantId,
    originalName,
    contentType,
    bytes: buffer.length,
    createdAt: new Date().toISOString(),
    storedPath,
  };
  await fs.writeFile(
    path.join(tenantDir, `${fileId}.json`),
    JSON.stringify(metadata, null, 2),
    "utf8",
  );

  return {
    fileId,
    storedPath,
    bytes: buffer.length,
    contentType,
    originalName,
  };
};

export const loadVoiceMetadata = async (tenantId: string, fileId: string) => {
  const baseDir = config.voice.storagePath || path.join(process.cwd(), "storage", "voice");
  const metaPath = path.join(baseDir, tenantId, `${fileId}.json`);
  const raw = await fs.readFile(metaPath, "utf8");
  return JSON.parse(raw) as VoiceMetadata;
};
