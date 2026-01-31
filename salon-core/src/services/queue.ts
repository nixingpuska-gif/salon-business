import crypto from "crypto";
import os from "os";
import { getRedis } from "./redis.js";

export type QueueJob = {
  id: string;
  queue: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type DequeuedJob = QueueJob & {
  ack: () => Promise<void>;
};

const groupName = process.env.QUEUE_GROUP || "salon-core";
const consumerName = process.env.QUEUE_CONSUMER || `${os.hostname()}-${process.pid}`;
const rawBlockMs = Number(process.env.QUEUE_BLOCK_MS || 5000);
const rawAckTimeoutMs = Number(process.env.QUEUE_ACK_TIMEOUT_MS || 60000);
const rawClaimCount = Number(process.env.QUEUE_CLAIM_COUNT || 1);
const blockMs = Number.isFinite(rawBlockMs) ? rawBlockMs : 5000;
const ackTimeoutMs = Number.isFinite(rawAckTimeoutMs) ? rawAckTimeoutMs : 60000;
const claimCount = Number.isFinite(rawClaimCount) ? Math.max(1, rawClaimCount) : 1;

const knownGroups = new Set<string>();

const ensureGroup = async (queue: string) => {
  if (knownGroups.has(queue)) return;
  const redis = getRedis();
  try {
    await redis.xgroup("CREATE", queue, groupName, "$", "MKSTREAM");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("BUSYGROUP")) {
      throw error;
    }
  }
  knownGroups.add(queue);
};

const parseJob = (queue: string, streamId: string, fields: string[]) => {
  const map: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    map[fields[i]] = fields[i + 1];
  }

  const raw = map.data || "";
  if (!raw) {
    return {
      id: streamId,
      queue,
      payload: { raw: map },
      createdAt: new Date().toISOString(),
    } as QueueJob;
  }

  try {
    const parsed = JSON.parse(raw) as QueueJob;
    return {
      ...parsed,
      queue: parsed.queue || queue,
    };
  } catch {
    return {
      id: streamId,
      queue,
      payload: { raw },
      createdAt: new Date().toISOString(),
    } as QueueJob;
  }
};

export const enqueue = async (queue: string, payload: Record<string, unknown>): Promise<QueueJob> => {
  const job: QueueJob = {
    id: crypto.randomUUID(),
    queue,
    payload,
    createdAt: new Date().toISOString(),
  };

  const redis = getRedis();
  await redis.xadd(queue, "*", "data", JSON.stringify(job));
  return job;
};

const claimStale = async (queue: string) => {
  if (!Number.isFinite(ackTimeoutMs) || ackTimeoutMs <= 0) return null;
  const redis = getRedis() as unknown as { xautoclaim?: (...args: unknown[]) => Promise<unknown> };
  if (typeof redis.xautoclaim !== "function") return null;
  const result = (await redis.xautoclaim(
    queue,
    groupName,
    consumerName,
    ackTimeoutMs,
    "0-0",
    "COUNT",
    claimCount,
  )) as unknown;

  if (!Array.isArray(result) || result.length < 2) return null;
  const entries = result[1] as Array<[string, string[]]>;
  if (!entries || entries.length === 0) return null;

  const [streamId, fields] = entries[0];
  const job = parseJob(queue, streamId, fields);
  return { streamId, job };
};

export const dequeueBlocking = async (queues: string[]): Promise<DequeuedJob | null> => {
  const redis = getRedis();
  for (const queue of queues) {
    await ensureGroup(queue);
  }

  for (const queue of queues) {
    const claimed = await claimStale(queue);
    if (claimed) {
      return {
        ...claimed.job,
        ack: async () => {
          await redis.xack(queue, groupName, claimed.streamId);
        },
      };
    }
  }

  const streams = queues;
  const ids = queues.map(() => ">");
  const result = await redis.xreadgroup(
    "GROUP",
    groupName,
    consumerName,
    "COUNT",
    1,
    "BLOCK",
    blockMs,
    "STREAMS",
    ...streams,
    ...ids,
  );

  if (!result || result.length === 0) return null;
  const [queue, entries] = result[0] as [string, Array<[string, string[]]>];
  if (!entries || entries.length === 0) return null;
  const [streamId, fields] = entries[0];
  const job = parseJob(queue, streamId, fields);

  return {
    ...job,
    ack: async () => {
      await redis.xack(queue, groupName, streamId);
    },
  };
};
