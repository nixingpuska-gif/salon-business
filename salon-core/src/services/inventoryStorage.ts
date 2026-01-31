import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";

export type InventoryDraft = {
  draftId: string;
  tenantId: string;
  fileId?: string;
  extractedItems: Array<{ sku?: string; name?: string; qty?: number; unit?: string }>;
  createdAt: string;
};

export type InventoryFileResult = {
  fileId: string;
  storedPath: string;
  bytes: number;
  contentType?: string;
  originalName?: string;
};

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

const safeName = (value?: string) => {
  if (!value) return "inventory";
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100) || "inventory";
};

const resolveExtension = (name?: string, contentType?: string) => {
  const ext = name ? path.extname(name) : "";
  if (ext) return ext;
  if (!contentType) return ".bin";
  if (contentType.includes("pdf")) return ".pdf";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";
  if (contentType.includes("png")) return ".png";
  return ".bin";
};

const resolveBaseDir = () =>
  config.inventory.storagePath || path.join(process.cwd(), "storage", "inventory");

export const storeInventoryFile = async ({
  buffer,
  tenantId,
  originalName,
  contentType,
}: {
  buffer: Buffer;
  tenantId: string;
  originalName?: string;
  contentType?: string;
}): Promise<InventoryFileResult> => {
  const fileId = crypto.randomUUID();
  const baseDir = resolveBaseDir();
  const tenantDir = await ensureDir(path.join(baseDir, tenantId, "files"));
  const safeOriginal = safeName(originalName);
  const ext = resolveExtension(safeOriginal, contentType);
  const storedPath = path.join(tenantDir, `${fileId}${ext}`);
  await fs.writeFile(storedPath, buffer);

  return {
    fileId,
    storedPath,
    bytes: buffer.length,
    contentType,
    originalName,
  };
};

export const writeInventoryDraft = async (draft: InventoryDraft) => {
  const baseDir = resolveBaseDir();
  const tenantDir = await ensureDir(path.join(baseDir, draft.tenantId, "drafts"));
  const draftPath = path.join(tenantDir, `${draft.draftId}.json`);
  await fs.writeFile(draftPath, JSON.stringify(draft, null, 2), "utf8");
  return draftPath;
};

export const loadInventoryDraft = async (tenantId: string, draftId: string) => {
  const baseDir = resolveBaseDir();
  const draftPath = path.join(baseDir, tenantId, "drafts", `${draftId}.json`);
  const raw = await fs.readFile(draftPath, "utf8");
  return JSON.parse(raw) as InventoryDraft;
};

export const appendInventoryLedger = async (
  tenantId: string,
  entry: Record<string, unknown>,
) => {
  const baseDir = resolveBaseDir();
  const tenantDir = await ensureDir(path.join(baseDir, tenantId));
  const ledgerPath = path.join(tenantDir, "ledger.jsonl");
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  await fs.appendFile(ledgerPath, `${line}\n`, "utf8");
  return ledgerPath;
};

export const readInventoryLedger = async (tenantId: string) => {
  const baseDir = resolveBaseDir();
  const ledgerPath = path.join(baseDir, tenantId, "ledger.jsonl");
  const raw = await fs.readFile(ledgerPath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
};
