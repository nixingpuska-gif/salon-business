import { getRedis } from "./redis.js";

export type ReminderJob = {
  tenantId: string;
  channel: string;
  to: string;
  message: string;
  metadata?: Record<string, unknown>;
  timeZone?: string;
  bookingId?: string;
  targetQueue?: string;
};

const REMINDER_ZSET = "reminders:global";
const bookingKey = (tenantId: string, bookingId: string) => `reminders:booking:${tenantId}:${bookingId}`;

export const scheduleReminder = async (runAtMs: number, payload: ReminderJob) => {
  const redis = getRedis();
  const member = JSON.stringify(payload);
  await redis.zadd(REMINDER_ZSET, String(runAtMs), member);
  if (payload.bookingId) {
    await redis.sadd(bookingKey(payload.tenantId, payload.bookingId), member);
  }
};

export const popDueReminder = async (nowMs: number) => {
  const redis = getRedis();
  const item = await redis.zpopmin(REMINDER_ZSET, 1);
  if (!item || item.length < 2) return null;
  const [member, score] = item;
  const runAtMs = Number(score);

  if (runAtMs > nowMs) {
    // not yet due: put it back and return null
    await redis.zadd(REMINDER_ZSET, String(runAtMs), member);
    return null;
  }

  const payload = JSON.parse(member) as ReminderJob;
  return { payload, runAtMs };
};

export const removeRemindersByBooking = async (tenantId: string, bookingId: string) => {
  const redis = getRedis();
  const key = bookingKey(tenantId, bookingId);
  const members = await redis.smembers(key);
  if (members.length) {
    await redis.zrem(REMINDER_ZSET, ...members);
  }
  await redis.del(key);
  return members.length;
};
