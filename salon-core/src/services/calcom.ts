import { config } from "../config.js";

const DEFAULT_API_VERSION = "2024-08-13";

type LegacyResponses = {
  name?: string;
  email?: string;
  location?:
    | {
        optionValue?: string;
        value?: string;
      }
    | string;
  guests?: string[];
  notes?: string;
  phoneNumber?: string;
  timeZone?: string;
  language?: string;
  [key: string]: unknown;
};

type CalcomAttendee = {
  name?: string;
  email?: string;
  timeZone?: string;
  language?: string;
  phoneNumber?: string;
};

export type CalcomBookingRequest = {
  eventTypeId?: number;
  eventTypeSlug?: string;
  username?: string;
  teamSlug?: string;
  organizationSlug?: string;
  start: string;
  end?: string;
  rescheduleUid?: string;
  responses?: LegacyResponses;
  attendee?: CalcomAttendee;
  timeZone?: string;
  language?: string;
  guests?: string[];
  location?: unknown;
  bookingFieldsResponses?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  lengthInMinutes?: number;
  meetingUrl?: string;
  [key: string]: unknown;
};

type CalcomBookingResponse = unknown;

export type CalcomRescheduleRequest = {
  bookingUid: string;
  start: string;
  rescheduledBy?: string;
  reschedulingReason?: string;
  emailVerificationCode?: string;
};

export type CalcomCancelRequest = {
  bookingUid: string;
  cancellationReason?: string;
  cancelSubsequentBookings?: boolean;
};

export type CalcomOverrides = {
  apiBase?: string;
  apiKey?: string;
  apiVersion?: string;
};

export type CalcomSlotsQuery = {
  eventTypeId?: number;
  eventTypeSlug?: string;
  username?: string;
  teamSlug?: string;
  organizationSlug?: string;
  start: string;
  end: string;
  timeZone?: string;
  duration?: number;
  format?: "range" | "time";
  bookingUidToReschedule?: string;
};

export type CalcomSlotsResponse = {
  status?: string;
  data?: Record<string, Array<{ start?: string; end?: string } | string>>;
};

const normalizeBase = (base: string) => {
  const trimmed = base.replace(/\/+$/, "");
  if (
    trimmed.endsWith("/v2") ||
    trimmed.endsWith("/api/v2") ||
    trimmed.endsWith("/v2/bookings") ||
    trimmed.endsWith("/api/v2/bookings")
  ) {
    return trimmed.replace(/\/bookings$/, "");
  }
  return `${trimmed}/v2`;
};

const normalizeLocation = (location: unknown) => {
  if (!location) return undefined;
  if (typeof location === "string") return location;
  if (typeof location === "object") {
    const record = location as Record<string, unknown>;
    if (typeof record.type === "string") return record;
    if (typeof record.value === "string") return record.value;
    if (typeof record.optionValue === "string") return record.optionValue;
  }
  return undefined;
};

const extractBookingFieldsResponses = (responses: LegacyResponses | undefined) => {
  if (!responses) return undefined;
  const known = new Set([
    "name",
    "email",
    "location",
    "guests",
    "notes",
    "phoneNumber",
    "timeZone",
    "language",
  ]);
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(responses)) {
    if (known.has(key)) continue;
    extra[key] = value;
  }
  return Object.keys(extra).length > 0 ? extra : undefined;
};

const normalizeMetadata = (metadata?: Record<string, unknown>) => {
  if (!metadata || typeof metadata !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) continue;
    if (typeof value === "string") {
      out[key] = value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      out[key] = String(value);
    } else {
      out[key] = JSON.stringify(value);
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

const buildV2Payload = (payload: CalcomBookingRequest) => {
  const responses = payload.responses;
  const attendeeInput = payload.attendee;

  const attendee: Record<string, unknown> = {};
  const name = attendeeInput?.name || (responses?.name as string | undefined);
  const email = attendeeInput?.email || (responses?.email as string | undefined);
  const timeZone =
    attendeeInput?.timeZone ||
    (payload.timeZone as string | undefined) ||
    (responses?.timeZone as string | undefined);
  const language =
    attendeeInput?.language ||
    (payload.language as string | undefined) ||
    (responses?.language as string | undefined);
  const phoneNumber = attendeeInput?.phoneNumber || (responses?.phoneNumber as string | undefined);

  if (name) attendee.name = name;
  if (email) attendee.email = email;
  if (timeZone) attendee.timeZone = timeZone;
  if (language) attendee.language = language;
  if (phoneNumber) attendee.phoneNumber = phoneNumber;

  const guests =
    (Array.isArray(payload.guests) ? payload.guests : undefined) ||
    (Array.isArray(responses?.guests) ? responses?.guests : undefined);
  const location = normalizeLocation(payload.location ?? responses?.location);
  const bookingFieldsResponses =
    payload.bookingFieldsResponses || extractBookingFieldsResponses(responses);
  const metadata = normalizeMetadata(payload.metadata);

  return {
    start: payload.start,
    attendee,
    eventTypeId: payload.eventTypeId,
    eventTypeSlug: payload.eventTypeSlug,
    username: payload.username,
    teamSlug: payload.teamSlug,
    organizationSlug: payload.organizationSlug,
    guests,
    location,
    bookingFieldsResponses,
    metadata,
    lengthInMinutes: payload.lengthInMinutes,
    meetingUrl: payload.meetingUrl,
  };
};

export const createBooking = async (
  payload: CalcomBookingRequest,
  overrides?: CalcomOverrides,
): Promise<CalcomBookingResponse> => {
  if (process.env.MOCK_CALCOM === "1") {
    return {
      bookingId: `mock-${Date.now()}`,
      status: "created",
      payload,
    };
  }
  const apiBase = overrides?.apiBase || config.calcom.apiBase;
  const apiKey = overrides?.apiKey || config.calcom.apiKey;
  const apiVersion = overrides?.apiVersion || config.calcom.apiVersion || DEFAULT_API_VERSION;

  if (!apiBase || !apiKey) {
    throw new Error("Cal.com API base or key is not configured");
  }

  const base = normalizeBase(apiBase);
  const url = `${base}/bookings`;
  const body = buildV2Payload(payload);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "cal-api-version": apiVersion,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Cal.com API error: ${response.status} ${response.statusText} - ${text}`);
  }

  return text ? JSON.parse(text) : {};
};

export const rescheduleBooking = async (
  input: CalcomRescheduleRequest,
  overrides?: CalcomOverrides,
): Promise<CalcomBookingResponse> => {
  if (process.env.MOCK_CALCOM === "1") {
    return {
      status: "success",
      data: {
        uid: input.bookingUid,
        start: input.start,
      },
    };
  }

  const apiBase = overrides?.apiBase || config.calcom.apiBase;
  const apiKey = overrides?.apiKey || config.calcom.apiKey;
  const apiVersion = overrides?.apiVersion || config.calcom.apiVersion || DEFAULT_API_VERSION;

  if (!apiBase || !apiKey) {
    throw new Error("Cal.com API base or key is not configured");
  }

  const base = normalizeBase(apiBase);
  const url = `${base}/bookings/${encodeURIComponent(input.bookingUid)}/reschedule`;
  const body = {
    start: input.start,
    rescheduledBy: input.rescheduledBy,
    reschedulingReason: input.reschedulingReason,
    emailVerificationCode: input.emailVerificationCode,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "cal-api-version": apiVersion,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Cal.com reschedule error: ${response.status} ${response.statusText} - ${text}`);
  }

  return text ? JSON.parse(text) : {};
};

export const cancelBooking = async (
  input: CalcomCancelRequest,
  overrides?: CalcomOverrides,
): Promise<CalcomBookingResponse> => {
  if (process.env.MOCK_CALCOM === "1") {
    return {
      status: "success",
      data: {
        uid: input.bookingUid,
      },
    };
  }

  const apiBase = overrides?.apiBase || config.calcom.apiBase;
  const apiKey = overrides?.apiKey || config.calcom.apiKey;
  const apiVersion = overrides?.apiVersion || config.calcom.apiVersion || DEFAULT_API_VERSION;

  if (!apiBase || !apiKey) {
    throw new Error("Cal.com API base or key is not configured");
  }

  const base = normalizeBase(apiBase);
  const url = `${base}/bookings/${encodeURIComponent(input.bookingUid)}/cancel`;
  const body = {
    cancellationReason: input.cancellationReason,
    cancelSubsequentBookings: input.cancelSubsequentBookings,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "cal-api-version": apiVersion,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Cal.com cancel error: ${response.status} ${response.statusText} - ${text}`);
  }

  return text ? JSON.parse(text) : {};
};

export const getAvailableSlots = async (
  query: CalcomSlotsQuery,
  overrides?: CalcomOverrides,
): Promise<CalcomSlotsResponse> => {
  if (process.env.MOCK_CALCOM === "1") {
    return { status: "success", data: {} };
  }
  const apiBase = overrides?.apiBase || config.calcom.apiBase;
  const apiKey = overrides?.apiKey || config.calcom.apiKey;
  const apiVersion = overrides?.apiVersion || config.calcom.apiVersion || DEFAULT_API_VERSION;
  if (!apiBase || !apiKey) {
    throw new Error("Cal.com API base or key is not configured");
  }

  const base = normalizeBase(apiBase);
  const url = new URL(`${base}/slots`);
  const params = url.searchParams;
  if (query.eventTypeId) params.set("eventTypeId", String(query.eventTypeId));
  if (query.eventTypeSlug) params.set("eventTypeSlug", query.eventTypeSlug);
  if (query.username) params.set("username", query.username);
  if (query.teamSlug) params.set("teamSlug", query.teamSlug);
  if (query.organizationSlug) params.set("organizationSlug", query.organizationSlug);
  if (query.timeZone) params.set("timeZone", query.timeZone);
  if (query.duration) params.set("duration", String(query.duration));
  if (query.format) params.set("format", query.format);
  if (query.bookingUidToReschedule) {
    params.set("bookingUidToReschedule", query.bookingUidToReschedule);
  }
  params.set("start", query.start);
  params.set("end", query.end);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "cal-api-version": apiVersion,
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Cal.com slots error: ${response.status} ${response.statusText} - ${text}`);
  }
  return text ? (JSON.parse(text) as CalcomSlotsResponse) : { status: "success", data: {} };
};
