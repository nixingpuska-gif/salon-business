export type Channel = "telegram" | "whatsapp" | "instagram" | "vkmax";

export type ChannelConfig = {
  token?: string;
  sendUrl?: string;
  apiBase?: string;
  phoneId?: string;
};

export type WebhookConfig = {
  secret?: string;
};

export type TenantConfig = {
  erxes?: {
    apiBase?: string;
    appToken?: string;
    nginxHostname?: string;
    brandId?: string;
    integrationIds?: string[];
  };
  calcom?: {
    apiBase?: string;
    apiKey?: string;
    apiVersion?: string;
    webhookSecret?: string;
    teamId?: string;
  };
  channels?: {
    telegram?: ChannelConfig;
    whatsapp?: ChannelConfig;
    instagram?: ChannelConfig;
    vkmax?: ChannelConfig;
  };
  webhooks?: {
    telegram?: WebhookConfig;
    whatsapp?: WebhookConfig;
    instagram?: WebhookConfig;
    vkmax?: WebhookConfig;
  };
  access?: {
    ownerTokens?: string[];
    staffTokens?: string[];
  };
  inventory?: {
    services?: Record<
      string,
      {
        items?: Array<{ sku?: string; name?: string; qty?: number; unit?: string }>;
      }
    >;
  };
};

export type SlotSuggestRequest = {
  tenantId: string;
  serviceId: string;
  preferredTime: string;
  staffId?: string;
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

export type Slot = {
  start: string;
  end: string;
  score?: number;
  reason?: string;
};

export type SlotSuggestResponse = {
  slots: Slot[];
};

export type Client = {
  name?: string;
  phone?: string;
  email?: string;
};

export type BookingCreateRequest = {
  tenantId: string;
  serviceId: string;
  staffId?: string;
  start: string;
  end?: string;
  client: Client;
  metadata?: Record<string, unknown>;
  timeZone?: string;
  language?: string;
  idempotencyKey?: string;
  channel?: Channel;
};

export type BookingRescheduleRequest = {
  tenantId: string;
  bookingId: string;
  serviceId?: string;
  start: string;
  end?: string;
  reason?: string;
  rescheduledBy?: string;
  emailVerificationCode?: string;
};

export type BookingCancelRequest = {
  tenantId: string;
  bookingId: string;
  reason?: string;
  cancelSubsequentBookings?: boolean;
};

export type BookingResponse = {
  bookingId: string;
  status: string;
  start?: string;
  end?: string;
  result?: unknown;
};

export type SendRequest = {
  tenantId: string;
  channel: Channel;
  to: string;
  message: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export type SendResponse = {
  messageId: string;
  status: string;
};

export type VoiceUploadResponse = {
  fileId: string;
};

export type VoiceIntentRequest = {
  tenantId: string;
  fileId: string;
  text?: string;
  transcript?: string;
  serviceId?: string;
  staffId?: string;
  preferredTime?: string;
};

export type VoiceIntentResponse = {
  intent: string;
  fields: {
    serviceId?: string;
    preferredTime?: string;
    staffId?: string;
  };
};

export type VoiceBookingRequest = {
  tenantId: string;
  fileId: string;
  text?: string;
  transcript?: string;
  client?: Client;
  serviceId?: string;
  preferredTime?: string;
  timeZone?: string;
  language?: string;
  channel?: Channel;
  to?: string;
  idempotencyKey?: string;
};

export type VoiceBookingResponse = {
  status: "booked" | "needs_info";
  bookingId?: string;
  missingFields?: string[];
  followUpMessage?: string;
  suggestedSlots?: Slot[];
  result?: unknown;
};

export type InventoryIntakeRequest = {
  tenantId: string;
  fileId?: string;
  fileBase64?: string;
  filename?: string;
  contentType?: string;
  text?: string;
  items?: InventoryItemDraft[];
};

export type InventoryItemDraft = {
  sku?: string;
  name?: string;
  qty?: number;
};

export type InventoryIntakeResponse = {
  draftId: string;
  extractedItems: InventoryItemDraft[];
};

export type InventoryConfirmRequest = {
  tenantId: string;
  draftId: string;
  items?: InventoryItemDraft[];
};

export type InventoryConfirmResponse = {
  ledgerIds: string[];
};

export type InventoryConsumeRequest = {
  tenantId: string;
  bookingId: string;
  serviceId?: string;
  items?: InventoryItemDraft[];
};

export type InventoryReconcileRequest = {
  tenantId: string;
  items: Array<{ sku: string; qtyPhysical: number }>;
  applyCorrection?: boolean;
};

export type InventoryReconcileResponse = {
  variance: Array<{ sku: string; qtyExpected: number; qtyPhysical: number; diff: number }>;
};

export type FeedbackRequest = {
  tenantId: string;
  bookingId: string;
  channel?: Channel;
  to?: string;
  message?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
};

export type FeedbackSubmitRequest = {
  tenantId: string;
  bookingId: string;
  rating: number;
  comment?: string;
  staffId?: string;
  serviceId?: string;
  channel?: Channel;
};

export type KpiSummaryResponse = {
  period: string;
  metrics: Record<string, unknown>;
};

export type KpiStaffResponse = {
  staffId: string;
  period: string;
  metrics: Record<string, unknown>;
};

export type AuditResponse = {
  items: Record<string, unknown>[];
};
