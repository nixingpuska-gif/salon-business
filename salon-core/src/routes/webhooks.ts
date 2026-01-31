import { Request, Response, Router } from "express";
import { config } from "../config.js";
import { createBooking } from "../services/calcom.js";
import { insertMessage, upsertCustomer } from "../services/erxes.js";
import { verifySignature } from "../services/signature.js";
import { rateLimit } from "../services/rateLimit.js";
import { idempotency } from "../services/idempotency.js";
import { logEvent } from "../services/logger.js";
import { logMessage } from "../services/messageLog.js";
import { removeRemindersByBooking, scheduleReminder } from "../services/reminders.js";
import { shiftOutOfQuietHours } from "../services/quietHours.js";
import {
  ensureTenant,
  upsertAppointmentMap,
  upsertClient,
  upsertTenantMapping,
  insertBookingEvent,
} from "../services/coreDb.js";
import { getTenantConfig } from "../services/tenantConfig.js";
import { resolveTenantId } from "../services/tenantResolve.js";

export const webhooksRouter = Router();

type WebhookRequest = Request & { rawBody?: string };

const requireSignature = (req: WebhookRequest, secret?: string) => {
  const signature = req.header("x-signature") || req.header("x-webhook-signature") || "";
  const payload = req.rawBody || "";
  if (!secret) {
    return false;
  }
  return verifySignature(secret, payload, signature);
};

const extractTenant = (req: Request, body?: Record<string, unknown>) => resolveTenantId(req, body);

const extractContact = (body: Record<string, unknown>, channel: string) => {
  const phone = (body.phone as string) || (body.primaryPhone as string);
  const email = (body.email as string) || (body.primaryEmail as string);
  const firstName = (body.firstName as string) || (body.name as string)?.split(" ")[0];
  const lastName = (body.lastName as string) || (body.name as string)?.split(" ").slice(1).join(" ");
  const senderId = (body.senderId as string) || (body.to as string) || (body.from as string) || "";
  let primaryEmail = email;
  if (!phone && !primaryEmail && senderId && config.contacts.allowSynthetic) {
    primaryEmail = `${channel}-${senderId}@${config.contacts.syntheticDomain}`;
  }
  return {
    primaryPhone: phone,
    primaryEmail,
    firstName,
    lastName,
  };
};

type NormalizedInbound = {
  body: Record<string, unknown>;
  raw: Record<string, unknown>;
  valid: boolean;
  errors: string[];
};

const normalizeInboundBody = (channel: string, body: Record<string, unknown>): NormalizedInbound => {
  const errors: string[] = [];
  const normalized: Record<string, unknown> = { ...body };
  const setIfMissing = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    if (normalized[key] === undefined || normalized[key] === null || normalized[key] === "") {
      normalized[key] = value;
    }
  };

  if (channel === "whatsapp") {
    const entry = (body.entry as Record<string, unknown>[] | undefined)?.[0];
    const change = (entry?.changes as Record<string, unknown>[] | undefined)?.[0];
    const value = (change?.value as Record<string, unknown>) || {};
    const message = (value.messages as Record<string, unknown>[] | undefined)?.[0];
    const contact = (value.contacts as Record<string, unknown>[] | undefined)?.[0];
    const profile = (contact?.profile as Record<string, unknown>) || {};
    const textBody = (message?.text as Record<string, unknown> | undefined)?.body as string | undefined;
    const buttonText = (message?.button as Record<string, unknown> | undefined)?.text as string | undefined;
    const interactive = message?.interactive as Record<string, unknown> | undefined;
    const buttonReply = (interactive?.button_reply as Record<string, unknown> | undefined)?.title as
      | string
      | undefined;
    const listReply = (interactive?.list_reply as Record<string, unknown> | undefined)?.title as
      | string
      | undefined;
    const text = textBody || buttonText || buttonReply || listReply;
    const from = message?.from as string | undefined;
    const waId = contact?.wa_id as string | undefined;
    setIfMissing("message", text);
    setIfMissing("messageId", message?.id ? String(message.id) : undefined);
    setIfMissing("phone", waId || from);
    setIfMissing("name", profile?.name as string | undefined);
    setIfMissing("senderId", from || waId);
    if (!message && !text) {
      errors.push("whatsapp: missing messages[0].text");
    }
    if (!from && !waId) {
      errors.push("whatsapp: missing sender");
    }
  }

  if (channel === "instagram") {
    const entry = (body.entry as Record<string, unknown>[] | undefined)?.[0];
    const messaging =
      (entry?.messaging as Record<string, unknown>[] | undefined)?.[0] ||
      (entry?.standby as Record<string, unknown>[] | undefined)?.[0];
    const sender = (messaging?.sender as Record<string, unknown>) || {};
    const message = (messaging?.message as Record<string, unknown>) || {};
    setIfMissing("message", message.text as string | undefined);
    setIfMissing("messageId", message.mid as string | undefined);
    setIfMissing("senderId", sender.id as string | undefined);
    if (!message?.text) {
      errors.push("instagram: missing message.text");
    }
    if (!sender?.id) {
      errors.push("instagram: missing sender.id");
    }
  }

  if (channel === "vkmax") {
    const object = (body.object as Record<string, unknown>) || {};
    const message = (object.message as Record<string, unknown>) || (body.message as Record<string, unknown>) || {};
    setIfMissing("message", message.text as string | undefined);
    setIfMissing("messageId", message.id ? String(message.id) : undefined);
    setIfMissing("senderId", (message.from_id as number | string | undefined)?.toString());
    setIfMissing("name", message.from as string | undefined);
    if (!message?.text) {
      errors.push("vkmax: missing message.text");
    }
    if (!message?.from_id) {
      errors.push("vkmax: missing from_id");
    }
  }

  if (channel === "telegram") {
    const message = (body.message as Record<string, unknown>) || {};
    const from = (message.from as Record<string, unknown>) || {};
    setIfMissing("message", message.text as string | undefined);
    setIfMissing("messageId", message.message_id ? String(message.message_id) : undefined);
    setIfMissing("senderId", (from.id as number | undefined)?.toString());
    setIfMissing(
      "name",
      [from.first_name as string | undefined, from.last_name as string | undefined]
        .filter(Boolean)
        .join(" "),
    );
    if (!message?.text) {
      errors.push("telegram: missing message.text");
    }
    if (!from?.id) {
      errors.push("telegram: missing from.id");
    }
  }

  const valid = errors.length === 0;
  return { body: normalized, raw: body, valid, errors };
};

const resolveWebhookSecret = async (
  tenantId: string,
  channel: string,
  fallback?: string,
  tenantConfig?: Awaited<ReturnType<typeof getTenantConfig>>,
) => {
  const configData = tenantConfig ?? (await getTenantConfig(tenantId));
  if (channel === "calcom") {
    return configData?.calcom?.webhookSecret || fallback;
  }
  const channelConfig =
    ((configData?.webhooks as Record<string, { secret?: string }> | undefined)?.[channel] as
      | { secret?: string }
      | undefined) || {};
  return channelConfig.secret || fallback;
};

const isRescheduledStatus = (status: string) => status.toLowerCase() === "rescheduled";

const isTerminalBookingStatus = (status: string) => {
  const normalized = status.toLowerCase();
  return ["cancelled", "canceled", "rejected", "no_show", "noshow"].includes(normalized);
};

const isActiveBookingStatus = (status: string) => {
  const normalized = status.toLowerCase();
  return ["created", "confirmed", "accepted", "scheduled"].includes(normalized);
};

const mapBookingEventType = (status?: string, event?: string) => {
  const raw = `${status || ""} ${event || ""}`.trim().toLowerCase();
  if (!raw) return undefined;
  if (raw.includes("no_show") || raw.includes("noshow")) return "booking_no_show";
  if (raw.includes("cancel") || raw.includes("rejected")) return "booking_cancelled";
  if (raw.includes("rescheduled")) return "booking_rescheduled";
  if (raw.includes("created")) return "booking_created";
  if (raw.includes("confirmed") || raw.includes("accepted") || raw.includes("scheduled")) {
    return "booking_confirmed";
  }
  return undefined;
};

const extractBookingId = (body: Record<string, unknown>) => {
  return (
    (body.bookingId as string) ||
    (body.id as string) ||
    (body.uid as string) ||
    (body.bookingUid as string) ||
    ((body.payload as Record<string, unknown> | undefined)?.bookingId as string) ||
    ((body.payload as Record<string, unknown> | undefined)?.id as string) ||
    ((body.payload as Record<string, unknown> | undefined)?.uid as string) ||
    ""
  );
};

const extractCalcomBookingId = (
  booking: Record<string, unknown> | undefined,
  result: unknown,
) => {
  const extractFrom = (value: Record<string, unknown> | undefined) =>
    (value?.id as string) ||
    (value?.bookingId as string) ||
    (value?.uid as string) ||
    (value?.bookingUid as string) ||
    "";

  const extractFromAny = (value: unknown) => {
    if (!value) return "";
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object") {
          const found = extractFrom(item as Record<string, unknown>);
          if (found) return found;
        }
      }
      return "";
    }
    if (typeof value === "object") {
      return extractFrom(value as Record<string, unknown>);
    }
    return "";
  };

  const resultObj = (result && typeof result === "object" ? (result as Record<string, unknown>) : undefined) || {};
  const resultBooking = (resultObj.booking as Record<string, unknown> | undefined) || undefined;
  const resultData = resultObj.data as unknown;

  return (
    extractFromAny(resultObj) ||
    extractFromAny(resultBooking) ||
    extractFromAny(resultData) ||
    extractFromAny(booking)
  );
};

const handleInbound = async (
  req: WebhookRequest,
  res: Response,
  channel: string,
  secret?: string,
) => {
  const tenantId = extractTenant(req, req.body as Record<string, unknown>);
  const tenantConfig = await getTenantConfig(tenantId);
  if (config.security.strictTenantConfig && !tenantConfig) {
    return res.status(401).json({ error: "Unknown tenant" });
  }
  await ensureTenant(tenantId);
  const rawBrandId = (req.body as Record<string, unknown>).brandId;
  const brandId = rawBrandId ? String(rawBrandId) : undefined;
  await upsertTenantMapping(
    tenantId,
    (tenantConfig?.erxes?.brandId as string | undefined) || brandId,
    tenantConfig?.calcom?.teamId,
  );
  const inbound = normalizeInboundBody(channel, req.body as Record<string, unknown>);
  if (config.validation.strictInboundSchema && !inbound.valid) {
    return res.status(400).json({ error: "Invalid inbound payload", details: inbound.errors });
  }
  const body = inbound.body;

  const webhookSecret = await resolveWebhookSecret(tenantId, channel, secret, tenantConfig);
  if (config.security.strictWebhookSignature && !webhookSecret) {
    return res.status(401).json({ error: "Missing webhook secret for tenant" });
  }
  if (webhookSecret && !requireSignature(req, webhookSecret)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const integrationId =
    (body.integrationId as string) || (req.header("x-erxes-integration-id") as string) || "";
  const message =
    (body.message as string) || (body.text as string) || (body.content as string) || "";
  const messageId = (body.messageId as string) || (body.id as string) || (body.mid as string) || "";

  if (message) {
    const allowed = tenantConfig?.erxes?.integrationIds;
    if (!integrationId) {
      return res.status(400).json({ error: "integrationId is required for message ingestion" });
    }
    if (allowed && allowed.length > 0 && !allowed.includes(integrationId)) {
      return res.status(403).json({ error: "integrationId not allowed for tenant" });
    }
  }

  const rate = await rateLimit.consume({
    key: `tenant:${tenantId}:tx`,
    limit: 1000000,
    windowSeconds: 24 * 60 * 60,
  });

  if (!rate.allowed) {
    return res.status(429).json({ error: "Rate limit exceeded", resetInSeconds: rate.resetInSeconds });
  }

  const contact = extractContact(body, channel);
  if (!contact.primaryPhone && !contact.primaryEmail) {
    return res.status(400).json({ error: "Missing contact info" });
  }

  const customer = await upsertCustomer({
    ...contact,
    brandId: (body.brandId as string) || tenantConfig?.erxes?.brandId || process.env.ERXES_BRAND_ID || undefined,
    state: (body.state as string) || "customer",
    erxes: tenantConfig?.erxes,
  });

  const clientId =
    (await upsertClient({
      tenantId,
      phone: contact.primaryPhone,
      email: contact.primaryEmail,
      firstName: contact.firstName,
      lastName: contact.lastName,
      erxesContactId: customer._id,
      metadata: {
        channel,
        senderId: (body.senderId as string) || undefined,
      },
    })) || undefined;

  await logEvent("inbound_received", {
    tenantId,
    channel,
    customerId: customer._id,
  });

  const booking = body.booking as Record<string, unknown> | undefined;
  if (booking) {
    const bookingIdempotencyKey =
      (booking.idempotencyKey as string) ||
      (body.idempotencyKey as string) ||
      (body.messageId as string) ||
      "";

    if (!bookingIdempotencyKey) {
      return res.status(400).json({ error: "booking.idempotencyKey or messageId is required" });
    }

    const bookingIdempotent = await idempotency.checkAndSet(
      `idemp:booking:${tenantId}:${bookingIdempotencyKey}`,
      24 * 60 * 60,
    );
    if (!bookingIdempotent) {
      return res.status(409).json({ error: "Duplicate booking request" });
    }

    const responses = (booking.responses as Record<string, unknown>) || {};
    const attendee = (booking.attendee as Record<string, unknown> | undefined) || undefined;
    if (!responses.name) {
      const nameFromContact = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
      if (nameFromContact) {
        responses.name = nameFromContact;
      } else if (body.name) {
        responses.name = body.name;
      }
    }
    if (!responses.email && contact.primaryEmail) {
      responses.email = contact.primaryEmail;
    }
    if (!responses.name && attendee?.name) {
      responses.name = String(attendee.name);
    }
    if (!responses.email && attendee?.email) {
      responses.email = String(attendee.email);
    }
    if (!responses.timeZone && attendee?.timeZone) {
      responses.timeZone = String(attendee.timeZone);
    }
    if (!responses.language && attendee?.language) {
      responses.language = String(attendee.language);
    }

    booking.responses = responses;

    const hasEventTypeId = Boolean(booking.eventTypeId);
    const hasSlug =
      Boolean(booking.eventTypeSlug) && (Boolean(booking.username) || Boolean(booking.teamSlug));
    const timeZone =
      (booking.timeZone as string | undefined) || (responses.timeZone as string | undefined) || undefined;
    const language =
      (booking.language as string | undefined) || (responses.language as string | undefined) || undefined;

    if (!hasEventTypeId && !hasSlug) {
      return res
        .status(400)
        .json({ error: "booking requires eventTypeId or eventTypeSlug + username/teamSlug" });
    }
    if (!booking.start || !timeZone) {
      return res.status(400).json({ error: "booking requires start and timeZone" });
    }
    if (!responses.name || !responses.email) {
      return res
        .status(400)
        .json({ error: "booking.attendee or booking.responses must include name and email" });
    }

    if (!booking.timeZone && timeZone) {
      booking.timeZone = timeZone;
    }
    if (!booking.language && language) {
      booking.language = language;
    }

    const bookingResult = await createBooking(
      booking as Parameters<typeof createBooking>[0],
      tenantConfig?.calcom,
    );

    const bookingId = extractCalcomBookingId(booking, bookingResult) || undefined;
    if (bookingId) {
      await upsertAppointmentMap({
        tenantId,
        clientId,
        calcomBookingId: bookingId,
        status: "created",
        startAt: booking.start as string | undefined,
        metadata: {
          eventTypeId: booking.eventTypeId,
        },
      });
    }

    const start = booking.start as string | undefined;
    if (start) {
      const startMs = Date.parse(start);
      if (!Number.isNaN(startMs)) {
        const nowMs = Date.now();
        const reminders = (booking.reminders as Record<string, unknown>) || {};
        const enable24h = reminders.enable24h !== false;
        const enable1h = reminders.enable1h !== false;
        const message24h =
          (reminders.message24h as string) || "Reminder: your appointment is in 24 hours";
        const message1h =
          (reminders.message1h as string) || "Reminder: your appointment is in 1 hour";

        const run24h = startMs - 24 * 60 * 60 * 1000;
        const run1h = startMs - 60 * 60 * 1000;

        const timeZone = (booking.timeZone as string) || (body.timeZone as string) || undefined;

        const bookingId =
          extractCalcomBookingId(booking as Record<string, unknown>, bookingResult) ||
          (booking.idempotencyKey as string) ||
          undefined;

        if (enable24h && run24h > nowMs) {
          const adjusted = shiftOutOfQuietHours(new Date(run24h), timeZone).getTime();
          await scheduleReminder(adjusted, {
            tenantId,
            channel: String(booking.channel || body.channel || ""),
            to: String(booking.to || body.to || ""),
            message: message24h,
            metadata: (booking.metadata as Record<string, unknown>) || {},
            timeZone,
            bookingId,
          });
        }
        if (enable1h && run1h > nowMs) {
          const adjusted = shiftOutOfQuietHours(new Date(run1h), timeZone).getTime();
          await scheduleReminder(adjusted, {
            tenantId,
            channel: String(booking.channel || body.channel || ""),
            to: String(booking.to || body.to || ""),
            message: message1h,
            metadata: (booking.metadata as Record<string, unknown>) || {},
            timeZone,
            bookingId,
          });
        }
      }
    }

    await logEvent("booking_created", {
      tenantId,
      channel,
      customerId: customer._id,
    });

    await insertBookingEvent({
      tenantId,
      bookingId,
      eventType: "booking_created",
      source: "inbound:webhook",
      payload: {
        channel,
        customerId: customer._id,
        start: booking.start,
      },
    });

    return res.status(200).json({
      ok: true,
      customerId: customer._id,
      booking: bookingResult,
    });
  }

  if (messageId) {
    const idempotent = await idempotency.checkAndSet(
      `idemp:msg:${tenantId}:${messageId}`,
      3 * 24 * 60 * 60,
    );
    if (!idempotent) {
      return res.status(409).json({ error: "Duplicate message" });
    }
  }

  if (message) {
    const payload = JSON.stringify(body);
    const created = await insertMessage({
      integrationId,
      customerId: customer._id,
      message,
      contentType: (body.contentType as string) || "text",
      payload,
      conversationId: body.conversationId as string | undefined,
      erxes: tenantConfig?.erxes,
    });

    await logMessage({
      tenantId,
      channel,
      direction: "inbound",
      messageId: messageId || created._id,
      customerId: customer._id,
      payload: body,
    });

    await logEvent("inbound_message", {
      tenantId,
      channel,
      customerId: customer._id,
      messageId: created._id,
    });

    return res.status(200).json({ ok: true, customerId: customer._id, messageId: created._id });
  }

  return res.status(200).json({ ok: true, customerId: customer._id });
};

const handleCalcomWebhook = async (req: WebhookRequest, res: Response) => {
  const tenantId = extractTenant(req, req.body as Record<string, unknown>);
  const tenantConfig = await getTenantConfig(tenantId);
  if (config.security.strictTenantConfig && !tenantConfig) {
    return res.status(401).json({ error: "Unknown tenant" });
  }
  await ensureTenant(tenantId);
  await upsertTenantMapping(tenantId, tenantConfig?.erxes?.brandId, tenantConfig?.calcom?.teamId);
  const body = req.body as Record<string, unknown>;

  const webhookSecret = await resolveWebhookSecret(tenantId, "calcom", config.security.calcomSecret, tenantConfig);
  if (config.security.strictWebhookSignature && !webhookSecret) {
    return res.status(401).json({ error: "Missing webhook secret for tenant" });
  }
  if (webhookSecret && !requireSignature(req, webhookSecret)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const status =
    (body.status as string) ||
    ((body.payload as Record<string, unknown> | undefined)?.status as string) ||
    "";
  const bookingId = extractBookingId(body);

  if (bookingId && status && isTerminalBookingStatus(status)) {
    const removed = await removeRemindersByBooking(tenantId, bookingId);
    await logEvent("booking_reminders_cleared", { tenantId, bookingId, status, removed });
    const eventType = mapBookingEventType(status, undefined);
    if (eventType) {
      await insertBookingEvent({
        tenantId,
        bookingId,
        eventType,
        source: "calcom:webhook",
        payload: { status },
      });
    }
    return res.status(200).json({ ok: true, removed });
  }

  if (bookingId && status && isRescheduledStatus(status)) {
    const removed = await removeRemindersByBooking(tenantId, bookingId);
    await logEvent("booking_reminders_cleared", { tenantId, bookingId, status, removed });
  }

  const event =
    (body.triggerEvent as string) ||
    (body.event as string) ||
    ((body.payload as Record<string, unknown> | undefined)?.event as string) ||
    "";

  if (bookingId) {
    await upsertAppointmentMap({
      tenantId,
      calcomBookingId: bookingId,
      status: status || event || undefined,
      startAt:
        (body.start as string) ||
        ((body.payload as Record<string, unknown> | undefined)?.start as string) ||
        undefined,
      metadata: {
        event,
        status,
      },
    });

    const eventType = mapBookingEventType(status, event);
    if (eventType) {
      await insertBookingEvent({
        tenantId,
        bookingId,
        eventType,
        source: "calcom:webhook",
        payload: { status, event },
      });
    }
  }

  const shouldSchedule =
    (status && (isActiveBookingStatus(status) || isRescheduledStatus(status))) ||
    (event &&
      ["created", "confirmed", "accepted", "scheduled", "rescheduled"].some((k) =>
        event.toLowerCase().includes(k),
      ));

  if (!shouldSchedule) {
    await logEvent("calcom_webhook_received", { tenantId, status, event });
    return res.status(200).json({ ok: true });
  }

  const payload = (body.payload as Record<string, unknown>) || body;
  const metadata =
    (payload.metadata as Record<string, unknown>) ||
    (body.metadata as Record<string, unknown>) ||
    {};

  const startRaw =
    (payload.start as string) ||
    (payload.startTime as string) ||
    (payload.startTimeUtc as string) ||
    (body.start as string) ||
    (body.startTime as string) ||
    "";
  const timeZone =
    (payload.timeZone as string) ||
    (body.timeZone as string) ||
    (metadata.timeZone as string) ||
    undefined;
  const channel = String(metadata.channel || payload.channel || body.channel || "");
  const to = String(metadata.to || payload.to || body.to || "");

  if (!bookingId || !startRaw || !channel || !to) {
    await logEvent("calcom_webhook_missing_data", {
      tenantId,
      bookingId,
      hasStart: Boolean(startRaw),
      channel,
      to,
    });
    return res.status(200).json({ ok: true, scheduled: 0 });
  }

  const startMs = Date.parse(startRaw);
  if (Number.isNaN(startMs)) {
    await logEvent("calcom_webhook_invalid_start", { tenantId, bookingId, startRaw });
    return res.status(200).json({ ok: true, scheduled: 0 });
  }

  const reminders = (metadata.reminders as Record<string, unknown>) || {};
  const enable24h = reminders.enable24h !== false;
  const enable1h = reminders.enable1h !== false;
  const message24h = (reminders.message24h as string) || "Reminder: your appointment is in 24 hours";
  const message1h = (reminders.message1h as string) || "Reminder: your appointment is in 1 hour";

  let scheduled = 0;
  const nowMs = Date.now();
  const run24h = startMs - 24 * 60 * 60 * 1000;
  const run1h = startMs - 60 * 60 * 1000;
  const idempotencyBase = `idemp:rem:${tenantId}:${bookingId}:${startMs}`;

  if (enable24h && run24h > nowMs) {
    const ok = await idempotency.checkAndSet(
      `${idempotencyBase}:24h`,
      14 * 24 * 60 * 60,
    );
    if (ok) {
      const adjusted = shiftOutOfQuietHours(new Date(run24h), timeZone).getTime();
      await scheduleReminder(adjusted, {
        tenantId,
        channel,
        to,
        message: message24h,
        metadata,
        timeZone,
        bookingId,
      });
      scheduled += 1;
    }
  }

  if (enable1h && run1h > nowMs) {
    const ok = await idempotency.checkAndSet(
      `${idempotencyBase}:1h`,
      14 * 24 * 60 * 60,
    );
    if (ok) {
      const adjusted = shiftOutOfQuietHours(new Date(run1h), timeZone).getTime();
      await scheduleReminder(adjusted, {
        tenantId,
        channel,
        to,
        message: message1h,
        metadata,
        timeZone,
        bookingId,
      });
      scheduled += 1;
    }
  }

  await logEvent("calcom_webhook_reminders_scheduled", {
    tenantId,
    bookingId,
    scheduled,
  });

  return res.status(200).json({ ok: true, scheduled });
};

webhooksRouter.post("/telegram/:tenantId?", async (req: WebhookRequest, res: Response) =>
  handleInbound(req, res, "telegram", config.security.telegramSecret),
);

webhooksRouter.post("/vkmax/:tenantId?", async (req: WebhookRequest, res: Response) =>
  handleInbound(req, res, "vkmax", config.security.vkmaxSecret),
);

webhooksRouter.post("/instagram/:tenantId?", async (req: WebhookRequest, res: Response) =>
  handleInbound(req, res, "instagram", config.security.instagramSecret),
);

webhooksRouter.post("/whatsapp/:tenantId?", async (req: WebhookRequest, res: Response) =>
  handleInbound(req, res, "whatsapp", config.security.whatsappSecret),
);

webhooksRouter.post("/calcom/:tenantId?", handleCalcomWebhook);

export const _test = {
  normalizeInboundBody,
  handleInbound,
};
