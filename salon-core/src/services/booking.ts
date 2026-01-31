import { config } from "../config.js";
import {
  cancelBooking,
  createBooking,
  rescheduleBooking,
  type CalcomBookingRequest,
} from "./calcom.js";
import { getTenantConfig } from "./tenantConfig.js";
import { isAlignedToGrid } from "./slots.js";
import { idempotency } from "./idempotency.js";
import { insertBookingEvent, upsertAppointmentMap, upsertClient } from "./coreDb.js";

type BookingInput = {
  tenantId: string;
  serviceId: string;
  start: string;
  end?: string;
  client: {
    name?: string;
    phone?: string;
    email?: string;
  };
  timeZone?: string;
  language?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
};

type BookingRescheduleInput = {
  tenantId: string;
  bookingId: string;
  start: string;
  end?: string;
  serviceId?: string;
  reason?: string;
  rescheduledBy?: string;
  emailVerificationCode?: string;
};

type BookingCancelInput = {
  tenantId: string;
  bookingId: string;
  reason?: string;
  cancelSubsequentBookings?: boolean;
};

const sanitizeEmailToken = (value: string) =>
  value.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const resolveServiceConfig = (
  tenantConfig: Awaited<ReturnType<typeof getTenantConfig>>,
  serviceId: string,
) => {
  const services = tenantConfig?.services || {};
  return services[serviceId] || undefined;
};

const computeEnd = (
  start: Date,
  serviceConfig?: { durationMinutes?: number; bufferMinutes?: number },
) => {
  if (!serviceConfig) return undefined;
  const durationMinutes = serviceConfig.durationMinutes ?? 60;
  const bufferMinutes = serviceConfig.bufferMinutes ?? config.scheduling.slotBufferMinutes;
  return new Date(start.getTime() + (durationMinutes + bufferMinutes) * 60000).toISOString();
};

const extractBookingId = (result: unknown): string | undefined => {
  const tryExtract = (value: unknown): string | undefined => {
    if (!value || typeof value !== "object") return undefined;
    const obj = value as Record<string, unknown>;
    return (
      (obj.id as string) ||
      (obj.bookingId as string) ||
      (obj.uid as string) ||
      (obj.bookingUid as string) ||
      undefined
    );
  };

  if (Array.isArray(result)) {
    for (const item of result) {
      const found = tryExtract(item);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof result === "object" && result) {
    const obj = result as Record<string, unknown>;
    return (
      tryExtract(obj) ||
      tryExtract(obj.booking) ||
      tryExtract(obj.data)
    );
  }
  return undefined;
};

export const createBookingForService = async (input: BookingInput) => {
  const tenantConfig = await getTenantConfig(input.tenantId);
  if (config.security.strictTenantConfig && !tenantConfig) {
    throw new Error("Unknown tenant");
  }

  const serviceConfig = resolveServiceConfig(tenantConfig, input.serviceId);
  if (!serviceConfig) {
    throw new Error("serviceId is not configured for tenant");
  }

  const durationMinutes =
    serviceConfig.durationMinutes ?? 60;
  const bufferMinutes =
    serviceConfig.bufferMinutes ?? config.scheduling.slotBufferMinutes;
  const gridMinutes =
    serviceConfig.gridMinutes ?? config.scheduling.slotGridMinutes;

  const start = new Date(input.start);
  if (Number.isNaN(start.getTime())) {
    throw new Error("start must be ISO date-time");
  }
  if (!isAlignedToGrid(start, gridMinutes)) {
    throw new Error("start is not aligned to slot grid");
  }

  const end =
    input.end ||
    new Date(start.getTime() + (durationMinutes + bufferMinutes) * 60000).toISOString();

  if (input.idempotencyKey) {
    const ok = await idempotency.checkAndSet(
      `idemp:booking:${input.tenantId}:${input.idempotencyKey}`,
      24 * 60 * 60,
    );
    if (!ok) {
      throw new Error("Duplicate booking request");
    }
  }

  const name = input.client.name?.trim() || "";
  let email = input.client.email?.trim() || "";
  const phone = input.client.phone?.trim() || "";

  if (!name) {
    throw new Error("client.name is required");
  }
  if (!email && config.contacts.allowSynthetic && phone) {
    const token = sanitizeEmailToken(phone);
    email = `${token}@${config.contacts.syntheticDomain}`;
  }
  if (!email) {
    throw new Error("client.email is required (or enable synthetic emails)");
  }

  const timeZone = input.timeZone || (input.metadata?.timeZone as string | undefined);
  if (!timeZone) {
    throw new Error("timeZone is required");
  }

  const payload: CalcomBookingRequest = {
    start: start.toISOString(),
    end,
    timeZone,
    language: input.language,
    eventTypeId: serviceConfig.calcomEventTypeId,
    eventTypeSlug: serviceConfig.eventTypeSlug,
    username: serviceConfig.username,
    teamSlug: serviceConfig.teamSlug,
    organizationSlug: serviceConfig.organizationSlug,
    lengthInMinutes: durationMinutes + bufferMinutes,
    attendee: {
      name,
      email,
      timeZone,
      language: input.language,
      phoneNumber: phone || undefined,
    },
    metadata: {
      ...(input.metadata || {}),
      tenantId: input.tenantId,
      serviceId: input.serviceId,
    },
  };

  const result = await createBooking(payload, tenantConfig?.calcom);
  const bookingId = extractBookingId(result);

  if (bookingId) {
    await upsertAppointmentMap({
      tenantId: input.tenantId,
      calcomBookingId: bookingId,
      status: "created",
      startAt: payload.start,
      metadata: { serviceId: input.serviceId },
    });

    await insertBookingEvent({
      tenantId: input.tenantId,
      bookingId,
      eventType: "booking_created",
      source: "api:booking",
      payload: {
        serviceId: input.serviceId,
        start: payload.start,
      },
    });
  }

  if (input.client.phone || input.client.email) {
    await upsertClient({
      tenantId: input.tenantId,
      phone: phone || undefined,
      email: email || undefined,
      firstName: name.split(" ")[0],
      lastName: name.split(" ").slice(1).join(" ") || undefined,
      metadata: { serviceId: input.serviceId },
    });
  }

  return { result, bookingId, start: payload.start, end };
};

export const rescheduleBookingForService = async (input: BookingRescheduleInput) => {
  const tenantConfig = await getTenantConfig(input.tenantId);
  if (config.security.strictTenantConfig && !tenantConfig) {
    throw new Error("Unknown tenant");
  }

  const start = new Date(input.start);
  if (Number.isNaN(start.getTime())) {
    throw new Error("start must be ISO date-time");
  }

  const serviceConfig = input.serviceId
    ? resolveServiceConfig(tenantConfig, input.serviceId)
    : undefined;
  const gridMinutes = serviceConfig?.gridMinutes ?? config.scheduling.slotGridMinutes;

  if (!isAlignedToGrid(start, gridMinutes)) {
    throw new Error("start is not aligned to slot grid");
  }

  const result = await rescheduleBooking(
    {
      bookingUid: input.bookingId,
      start: start.toISOString(),
      rescheduledBy: input.rescheduledBy,
      reschedulingReason: input.reason,
      emailVerificationCode: input.emailVerificationCode,
    },
    tenantConfig?.calcom,
  );

  await upsertAppointmentMap({
    tenantId: input.tenantId,
    calcomBookingId: input.bookingId,
    status: "rescheduled",
    startAt: start.toISOString(),
    metadata: {
      reason: input.reason,
      serviceId: input.serviceId,
    },
  });

  await insertBookingEvent({
    tenantId: input.tenantId,
    bookingId: input.bookingId,
    eventType: "booking_rescheduled",
    source: "api:booking",
    payload: {
      reason: input.reason,
      serviceId: input.serviceId,
      start: start.toISOString(),
    },
  });

  const end = input.end || computeEnd(start, serviceConfig);

  return {
    result,
    bookingId: input.bookingId,
    start: start.toISOString(),
    end,
  };
};

export const cancelBookingForService = async (input: BookingCancelInput) => {
  const tenantConfig = await getTenantConfig(input.tenantId);
  if (config.security.strictTenantConfig && !tenantConfig) {
    throw new Error("Unknown tenant");
  }

  const result = await cancelBooking(
    {
      bookingUid: input.bookingId,
      cancellationReason: input.reason,
      cancelSubsequentBookings: input.cancelSubsequentBookings,
    },
    tenantConfig?.calcom,
  );

  await upsertAppointmentMap({
    tenantId: input.tenantId,
    calcomBookingId: input.bookingId,
    status: "cancelled",
    metadata: {
      reason: input.reason,
    },
  });

  await insertBookingEvent({
    tenantId: input.tenantId,
    bookingId: input.bookingId,
    eventType: "booking_cancelled",
    source: "api:booking",
    payload: {
      reason: input.reason,
    },
  });

  return {
    result,
    bookingId: input.bookingId,
  };
};
