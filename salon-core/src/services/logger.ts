import fs from "fs/promises";
import path from "path";
import { maybeRedact } from "./redact.js";

const getLogDir = () => process.env.LOG_DIR || path.join(process.cwd(), "logs");

const ensureDir = async () => {
  const dir = getLogDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

export const logEvent = async (type: string, payload: Record<string, unknown>) => {
  const dir = await ensureDir();
  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(dir, `${date}.jsonl`);
  const safePayload = maybeRedact(payload);
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    type,
    payload: safePayload,
  });
  await fs.appendFile(file, `${line}\n`, "utf8");
};
