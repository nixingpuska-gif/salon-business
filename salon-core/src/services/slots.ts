import { config } from "../config.js";
import { getAvailableSlots } from "./calcom.js";
import { getTenantConfig } from "./tenantConfig.js";

type SlotInput = {
  start: string;
  end?: string;
};

export type SlotSuggestionInput = {
  tenantId: string;
  serviceId: string;
  preferredTime: string;
  timeZone?: string;
  eventTypeId?: number;
  eventTypeSlug?: string;
  username?: string;
  teamSlug?: string;
  organizationSlug?: string;
  durationMinutes?: number;
  bufferMinutes?: number;
  gridMinutes?: number;
  start?: string;
  end?: string;
  limit?: number;
};

export type SlotSuggestion = {
  start: string;
  end: string;
  score: number;
  reason: string;
};

const getLocalHour = (date: Date, timeZone?: string) => {
  if (!timeZone) return date.getHours();
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone,
  });
  const hour = Number(formatter.format(date));
  return Number.isNaN(hour) ? date.getHours() : hour;
};

const getLocalDateKey = (date: Date, timeZone?: string) => {
  if (!timeZone) return date.toISOString().slice(0, 10);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
};

const isAlignedToGrid = (date: Date, gridMinutes: number) => {
  const safeGrid = Math.max(1, gridMinutes || 1);
  if (safeGrid <= 1) return true;
  return date.getMinutes() % safeGrid === 0;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const scoreSlots = (
  slots: SlotInput[],
  preferredTime: Date,
  timeZone: string | undefined,
  gridMinutes: number,
  offpeakMorningEnd: number,
  offpeakEveningStart: number,
) => {
  const grouped = new Map<string, Date[]>();
  for (const slot of slots) {
    const start = new Date(slot.start);
    if (Number.isNaN(start.getTime())) continue;
    const key = getLocalDateKey(start, timeZone);
    const list = grouped.get(key) || [];
    list.push(start);
    grouped.set(key, list);
  }

  for (const list of grouped.values()) {
    list.sort((a, b) => a.getTime() - b.getTime());
  }

  return slots.map((slot) => {
    const start = new Date(slot.start);
    const end = slot.end ? new Date(slot.end) : new Date(start);
    const key = getLocalDateKey(start, timeZone);
    const daySlots = grouped.get(key) || [];

    const safeGrid = Math.max(1, gridMinutes || 1);
    let gapMinutes = 180;
    if (daySlots.length > 1) {
      for (const other of daySlots) {
        if (other.getTime() === start.getTime()) continue;
        const diff = Math.abs(other.getTime() - start.getTime()) / 60000;
        if (diff < gapMinutes) gapMinutes = diff;
      }
    }
    const gapDenom = safeGrid * 2;
    const gapScore = gapDenom > 0 ? clamp((gapDenom - gapMinutes) / gapDenom, 0, 0.5) : 0;

    const hour = getLocalHour(start, timeZone);
    const offpeak =
      hour < offpeakMorningEnd || hour >= offpeakEveningStart ? 0.2 : 0;

    const distanceMinutes = Math.abs(start.getTime() - preferredTime.getTime()) / 60000;
    const proximity = clamp(1 - distanceMinutes / 120, 0, 1) * 0.3;

    const score = clamp(gapScore + offpeak + proximity, 0, 1);

    const reasons = [];
    if (offpeak > 0) reasons.push("offpeak");
    if (gapScore > 0.1) reasons.push("packed");
    if (proximity > 0.1) reasons.push("near");
    const reason = reasons.length ? reasons.join("+") : "ok";

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      score,
      reason,
    };
  });
};

const normalizeSlots = (
  data: Record<string, Array<{ start?: string; end?: string } | string>> | undefined,
  durationMinutes: number,
  bufferMinutes: number,
) => {
  if (!data) return [];
  const safeDuration = Math.max(1, durationMinutes || 1);
  const safeBuffer = Math.max(0, bufferMinutes || 0);
  const slots: SlotInput[] = [];
  for (const day of Object.values(data)) {
    for (const entry of day) {
      if (typeof entry === "string") {
        const start = new Date(entry);
        if (Number.isNaN(start.getTime())) continue;
        const end = new Date(start.getTime() + (safeDuration + safeBuffer) * 60000);
        slots.push({ start: start.toISOString(), end: end.toISOString() });
        continue;
      }
      const start = entry.start;
      if (!start) continue;
      const end = entry.end;
      if (end) {
        slots.push({ start, end });
      } else {
        const startDate = new Date(start);
        if (Number.isNaN(startDate.getTime())) continue;
        const endDate = new Date(startDate.getTime() + (safeDuration + safeBuffer) * 60000);
        slots.push({ start, end: endDate.toISOString() });
      }
    }
  }
  return slots;
};

const resolveServiceConfig = (serviceId: string, tenantConfig: Awaited<ReturnType<typeof getTenantConfig>>) => {
  const services = tenantConfig?.services || {};
  return services[serviceId] || undefined;
};

export const suggestSlots = async (input: SlotSuggestionInput) => {
  const tenantConfig = await getTenantConfig(input.tenantId);
  if (config.security.strictTenantConfig && !tenantConfig) {
    throw new Error("Unknown tenant");
  }

  const serviceConfig = resolveServiceConfig(input.serviceId, tenantConfig);
  const durationMinutes =
    input.durationMinutes ??
    serviceConfig?.durationMinutes ??
    60;
  const bufferMinutes =
    input.bufferMinutes ??
    serviceConfig?.bufferMinutes ??
    config.scheduling.slotBufferMinutes;
  const gridMinutes =
    input.gridMinutes ??
    serviceConfig?.gridMinutes ??
    config.scheduling.slotGridMinutes;
  const timeZone = input.timeZone;

  const eventTypeId =
    input.eventTypeId ??
    serviceConfig?.calcomEventTypeId ??
    (Number.isFinite(Number(input.serviceId)) ? Number(input.serviceId) : undefined);

  const eventTypeSlug = input.eventTypeSlug ?? serviceConfig?.eventTypeSlug;
  const username = input.username ?? serviceConfig?.username;
  const teamSlug = input.teamSlug ?? serviceConfig?.teamSlug;
  const organizationSlug = input.organizationSlug ?? serviceConfig?.organizationSlug;

  if (!eventTypeId && !eventTypeSlug) {
    throw new Error("eventTypeId or eventTypeSlug is required");
  }
  if (eventTypeSlug && !username && !teamSlug) {
    throw new Error("eventTypeSlug requires username or teamSlug");
  }

  const preferred = new Date(input.preferredTime);
  if (Number.isNaN(preferred.getTime())) {
    throw new Error("preferredTime must be ISO date-time");
  }

  const start = input.start || new Date(preferred).toISOString();
  const end =
    input.end ||
    new Date(preferred.getTime() + config.scheduling.suggestHorizonDays * 24 * 60 * 60 * 1000).toISOString();

  const calSlots = await getAvailableSlots(
    {
      eventTypeId: eventTypeId || undefined,
      eventTypeSlug: eventTypeSlug || undefined,
      username: username || undefined,
      teamSlug: teamSlug || undefined,
      organizationSlug: organizationSlug || undefined,
      start,
      end,
      timeZone,
      duration: durationMinutes,
      format: "range",
    },
    tenantConfig?.calcom,
  );

  const slots = normalizeSlots(calSlots.data, durationMinutes, bufferMinutes)
    .filter((slot) => {
      const startDate = new Date(slot.start);
      if (Number.isNaN(startDate.getTime())) return false;
      return isAlignedToGrid(startDate, gridMinutes);
    });

  const scored = scoreSlots(
    slots,
    preferred,
    timeZone,
    gridMinutes,
    config.scheduling.offpeakMorningEndHour,
    config.scheduling.offpeakEveningStartHour,
  );

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Math.abs(new Date(a.start).getTime() - preferred.getTime()) -
      Math.abs(new Date(b.start).getTime() - preferred.getTime());
  });

  const rawLimit = input.limit ?? config.scheduling.suggestLimit;
  const limit = Number.isFinite(rawLimit) ? Number(rawLimit) : config.scheduling.suggestLimit;
  return { slots: scored.slice(0, Math.max(1, limit)) };
};

export { isAlignedToGrid };

export const _test = {
  isAlignedToGrid,
  scoreSlots,
  normalizeSlots,
};
