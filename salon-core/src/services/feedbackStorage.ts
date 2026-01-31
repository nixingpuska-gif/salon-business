import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";

export type FeedbackEntry = {
  tenantId: string;
  bookingId: string;
  staffId?: string;
  serviceId?: string;
  channel?: string;
  rating: number;
  comment?: string;
  createdAt: string;
};

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

const baseDir = () => config.feedback.storagePath || path.join(process.cwd(), "storage", "feedback");

export const appendFeedback = async (entry: FeedbackEntry) => {
  const dir = await ensureDir(baseDir());
  const file = path.join(dir, `${entry.tenantId}.jsonl`);
  await fs.appendFile(file, `${JSON.stringify(entry)}\n`, "utf8");
  return file;
};

export const readFeedback = async (tenantId: string, since?: Date) => {
  const file = path.join(baseDir(), `${tenantId}.jsonl`);
  const raw = await fs.readFile(file, "utf8");
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as FeedbackEntry);
  if (!since) return rows;
  return rows.filter((row) => {
    const ts = Date.parse(row.createdAt);
    return !Number.isNaN(ts) && ts >= since.getTime();
  });
};
