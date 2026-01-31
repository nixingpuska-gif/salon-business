import { config } from "../config.js";
import { idempotency } from "./idempotency.js";
import { enqueue } from "./queue.js";
import { upsertJobLog } from "./coreDb.js";
import { logEvent } from "./logger.js";
import { loadVoiceMetadata } from "./voiceStorage.js";
import { transcribeVoiceFile } from "./voiceStt.js";
import { detectVoiceIntent } from "./voiceIntent.js";
import { createBookingForService } from "./booking.js";
import { suggestSlots } from "./slots.js";

type ClientInput = {
  name?: string;
  phone?: string;
  email?: string;
};

type VoiceBookingInput = {
  tenantId: string;
  fileId: string;
  text?: string;
  transcript?: string;
  client?: ClientInput;
  serviceId?: string;
  preferredTime?: string;
  timeZone?: string;
  language?: string;
  channel?: string;
  to?: string;
  idempotencyKey?: string;
};

type VoiceBookingResult = {
  status: "booked" | "needs_info";
  bookingId?: string;
  missingFields?: string[];
  followUpMessage?: string;
  suggestedSlots?: Array<{ start: string; end: string; score?: number; reason?: string }>;
  result?: unknown;
};

const allowedChannels = new Set(["telegram", "vkmax", "instagram", "whatsapp"]);

const buildFollowUpMessage = (missing: string[]) => {
  const labels: Record<string, string> = {
    serviceId: "услугу",
    preferredTime: "время",
    timeZone: "часовой пояс",
    "client.name": "имя клиента",
    "client.email": "email клиента",
    "client.phone": "телефон клиента",
    intent: "что вы хотите (запись/перенос/отмена)",
  };
  const readable = missing.map((item) => labels[item] || item);
  return `Нужно уточнить: ${readable.join(", ")}.`;
};

const enqueueFollowUp = async (input: {
  tenantId: string;
  channel: string;
  to: string;
  message: string;
  idempotencyKey?: string;
}) => {
  if (!allowedChannels.has(input.channel)) {
    throw new Error("Unsupported channel");
  }
  if (input.idempotencyKey) {
    const ok = await idempotency.checkAndSet(
      `idemp:voice:followup:${input.tenantId}:${input.idempotencyKey}`,
      24 * 60 * 60,
    );
    if (!ok) {
      return null;
    }
  }
  const job = await enqueue(`queue:send:${input.channel}`, {
    tenantId: input.tenantId,
    channel: input.channel,
    to: input.to,
    message: input.message,
    metadata: {},
  });
  await upsertJobLog({
    id: job.id,
    tenantId: input.tenantId,
    queue: job.queue,
    status: "queued",
    payload: job.payload,
  });
  await logEvent("voice_followup_queued", {
    tenantId: input.tenantId,
    jobId: job.id,
    channel: input.channel,
  });
  return job.id;
};

export const createBookingFromVoice = async (input: VoiceBookingInput): Promise<VoiceBookingResult> => {
  const metadata = await loadVoiceMetadata(input.tenantId, input.fileId);
  let text = input.text || input.transcript;
  if (!text) {
    const stt = await transcribeVoiceFile(metadata);
    text = stt.text;
  }

  const intentResult = detectVoiceIntent(text, {
    serviceId: input.serviceId,
    staffId: undefined,
    preferredTime: input.preferredTime,
  });

  if (intentResult.intent !== "booking") {
    const missing = ["intent"];
    const followUpMessage = buildFollowUpMessage(missing);
    if (input.channel && input.to) {
      await enqueueFollowUp({
        tenantId: input.tenantId,
        channel: input.channel,
        to: input.to,
        message: followUpMessage,
        idempotencyKey: input.idempotencyKey,
      });
    }
    return {
      status: "needs_info",
      missingFields: missing,
      followUpMessage,
    };
  }

  const serviceId = input.serviceId || intentResult.fields.serviceId;
  const preferredTime = input.preferredTime || intentResult.fields.preferredTime;
  const timeZone = input.timeZone;
  const client = input.client || {};

  const missing: string[] = [];
  if (!serviceId) missing.push("serviceId");
  if (!preferredTime) missing.push("preferredTime");
  if (!timeZone) missing.push("timeZone");
  if (!client.name) missing.push("client.name");
  const needsEmail = !client.email && !(config.contacts.allowSynthetic && client.phone);
  if (needsEmail) missing.push("client.email");

  if (missing.length) {
    const followUpMessage = buildFollowUpMessage(missing);
    if (input.channel && input.to) {
      await enqueueFollowUp({
        tenantId: input.tenantId,
        channel: input.channel,
        to: input.to,
        message: followUpMessage,
        idempotencyKey: input.idempotencyKey,
      });
    }
    return {
      status: "needs_info",
      missingFields: missing,
      followUpMessage,
    };
  }

  try {
    const booking = await createBookingForService({
      tenantId: input.tenantId,
      serviceId: serviceId as string,
      start: preferredTime as string,
      client: client as { name: string; email?: string; phone?: string },
      timeZone,
      language: input.language,
      idempotencyKey: input.idempotencyKey,
    });
    await logEvent("voice_booking_created", {
      tenantId: input.tenantId,
      bookingId: booking.bookingId,
    });
    return {
      status: "booked",
      bookingId: booking.bookingId,
      result: booking.result,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("aligned") && serviceId && preferredTime) {
      try {
        const suggestions = await suggestSlots({
          tenantId: input.tenantId,
          serviceId: serviceId as string,
          preferredTime: preferredTime as string,
          timeZone,
        });
        return {
          status: "needs_info",
          missingFields: ["preferredTime"],
          followUpMessage: "Предлагаем другое время",
          suggestedSlots: suggestions.slots,
        };
      } catch {
        return { status: "needs_info", missingFields: ["preferredTime"] };
      }
    }
    throw error;
  }
};
