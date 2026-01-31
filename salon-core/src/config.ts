type AppConfig = {
  port: number;
  calcom: {
    apiBase: string;
    apiKey: string;
    apiVersion: string;
    mock: boolean;
  };
  erxes: {
    apiBase: string;
    appToken: string;
    nginxHostname: string;
    mock: boolean;
  };
  security: {
    telegramSecret?: string;
    vkmaxSecret?: string;
    instagramSecret?: string;
    whatsappSecret?: string;
    strictWebhookSignature: boolean;
    strictTenantConfig: boolean;
    calcomSecret?: string;
  };
  channels: {
    telegramBotToken?: string;
    telegramSendUrl?: string;
    whatsappApiBase?: string;
    whatsappToken?: string;
    whatsappPhoneId?: string;
    whatsappSendUrl?: string;
    instagramSendUrl?: string;
    instagramToken?: string;
    vkmaxSendUrl?: string;
    vkmaxToken?: string;
  };
  quietHours: {
    start: number;
    end: number;
  };
  rateLimits: {
    mkClientLimit: number;
    mkClientWindowSeconds: number;
    mkRespectQuietHours: boolean;
    channelRps: {
      telegram: number;
      whatsapp: number;
      instagram: number;
      vkmax: number;
    };
  };
  scheduling: {
    slotGridMinutes: number;
    slotBufferMinutes: number;
    offpeakMorningEndHour: number;
    offpeakEveningStartHour: number;
    suggestHorizonDays: number;
    suggestLimit: number;
  };
  contacts: {
    allowSynthetic: boolean;
    syntheticDomain: string;
  };
  validation: {
    strictInboundSchema: boolean;
  };
  mocks: {
    senders: boolean;
  };
  stt: {
    provider: string;
    apiBase: string;
    apiKey: string;
    endpoint: string;
    model: string;
    language: string;
    mock: boolean;
  };
  ocr: {
    provider: string;
    apiBase: string;
    apiKey: string;
    endpoint: string;
    mock: boolean;
  };
  inventory: {
    storagePath: string;
    maxSizeMb: number;
  };
  feedback: {
    storagePath: string;
  };
  voice: {
    storagePath: string;
    maxSizeMb: number;
  };
};

const port = Number(process.env.PORT || 8080);

export const config: AppConfig = {
  port: Number.isFinite(port) ? port : 8080,
  calcom: {
    apiBase: process.env.CALCOM_API_BASE ?? "",
    apiKey: process.env.CALCOM_API_KEY ?? "",
    apiVersion: process.env.CALCOM_API_VERSION ?? "",
    mock: process.env.MOCK_CALCOM === "1",
  },
  erxes: {
    apiBase: process.env.ERXES_API_BASE ?? "",
    appToken: process.env.ERXES_APP_TOKEN ?? "",
    nginxHostname: process.env.ERXES_NGINX_HOSTNAME ?? "",
    mock: process.env.MOCK_ERXES === "1",
  },
  security: {
    telegramSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
    vkmaxSecret: process.env.VKMAX_WEBHOOK_SECRET,
    instagramSecret: process.env.INSTAGRAM_WEBHOOK_SECRET,
    whatsappSecret: process.env.WHATSAPP_WEBHOOK_SECRET,
    strictWebhookSignature: process.env.STRICT_WEBHOOK_SIGNATURE !== "0",
    strictTenantConfig: process.env.STRICT_TENANT_CONFIG !== "0",
    calcomSecret: process.env.CALCOM_WEBHOOK_SECRET,
  },
  channels: {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramSendUrl: process.env.TELEGRAM_SEND_URL,
    whatsappApiBase: process.env.WHATSAPP_API_BASE,
    whatsappToken: process.env.WHATSAPP_TOKEN,
    whatsappPhoneId: process.env.WHATSAPP_PHONE_ID,
    whatsappSendUrl: process.env.WHATSAPP_SEND_URL,
    instagramSendUrl: process.env.INSTAGRAM_SEND_URL,
    instagramToken: process.env.INSTAGRAM_TOKEN,
    vkmaxSendUrl: process.env.VKMAX_SEND_URL,
    vkmaxToken: process.env.VKMAX_TOKEN,
  },
  quietHours: {
    start: Number(process.env.QUIET_HOURS_START || 22),
    end: Number(process.env.QUIET_HOURS_END || 9),
  },
  rateLimits: {
    mkClientLimit: Number(process.env.MK_CLIENT_LIMIT_COUNT || 1),
    mkClientWindowSeconds: Number(process.env.MK_CLIENT_LIMIT_DAYS || 3) * 24 * 60 * 60,
    mkRespectQuietHours: process.env.MK_RESPECT_QUIET_HOURS !== "0",
    channelRps: {
      telegram: Number(process.env.CHANNEL_RPS_TELEGRAM || 20),
      whatsapp: Number(process.env.CHANNEL_RPS_WHATSAPP || 10),
      instagram: Number(process.env.CHANNEL_RPS_INSTAGRAM || 10),
      vkmax: Number(process.env.CHANNEL_RPS_VKMAX || 20),
    },
  },
  scheduling: {
    slotGridMinutes: Number(process.env.SLOT_GRID_MINUTES || 15),
    slotBufferMinutes: Number(process.env.SLOT_BUFFER_MINUTES || 0),
    offpeakMorningEndHour: Number(process.env.OFFPEAK_MORNING_END_HOUR || 11),
    offpeakEveningStartHour: Number(process.env.OFFPEAK_EVENING_START_HOUR || 19),
    suggestHorizonDays: Number(process.env.SLOT_SUGGEST_HORIZON_DAYS || 3),
    suggestLimit: Number(process.env.SLOT_SUGGEST_LIMIT || 10),
  },
  contacts: {
    allowSynthetic: process.env.ALLOW_SYNTHETIC_CONTACT === "1",
    syntheticDomain: process.env.SYNTHETIC_CONTACT_DOMAIN || "salonhelp.local",
  },
  validation: {
    strictInboundSchema: process.env.STRICT_INBOUND_SCHEMA === "1",
  },
  mocks: {
    senders: process.env.MOCK_SENDERS === "1",
  },
  stt: {
    provider: process.env.STT_PROVIDER || "openai",
    apiBase: process.env.STT_API_BASE || "",
    apiKey: process.env.STT_API_KEY || "",
    endpoint: process.env.STT_ENDPOINT || "",
    model: process.env.STT_MODEL || "whisper-1",
    language: process.env.STT_LANGUAGE || "",
    mock: process.env.MOCK_STT === "1",
  },
  ocr: {
    provider: process.env.OCR_PROVIDER || "http",
    apiBase: process.env.OCR_API_BASE || "",
    apiKey: process.env.OCR_API_KEY || "",
    endpoint: process.env.OCR_ENDPOINT || "",
    mock: process.env.MOCK_OCR === "1",
  },
  inventory: {
    storagePath: process.env.INVENTORY_STORAGE_PATH || "",
    maxSizeMb: Number(process.env.INVENTORY_MAX_SIZE_MB || 20),
  },
  feedback: {
    storagePath: process.env.FEEDBACK_STORAGE_PATH || "",
  },
  voice: {
    storagePath: process.env.VOICE_STORAGE_PATH || "",
    maxSizeMb: Number(process.env.VOICE_MAX_SIZE_MB || 20),
  },
};
