import { mysqlTable, serial, varchar, text, int, datetime, index, unique } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  avatar: text("avatar"),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  createdAt: datetime("created_at").notNull().default(new Date()),
});

export const owners = mysqlTable("owners", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: datetime("created_at").notNull().default(new Date()),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  emailIdx: index("email_idx").on(table.email),
}));

export const services = mysqlTable("services", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  durationMinutes: int("duration_minutes").notNull(),
  price: int("price"),
  description: text("description"),
  createdAt: datetime("created_at").notNull().default(new Date()),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
}));

export const masters = mysqlTable("masters", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  createdAt: datetime("created_at").notNull().default(new Date()),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
}));

export const clients = mysqlTable("clients", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  chatId: varchar("chat_id", { length: 255 }),
  whatsappPhone: varchar("whatsapp_phone", { length: 50 }),
  preferredChannel: varchar("preferred_channel", { length: 50 }).default("auto"),
  telegramChatId: varchar("telegram_chat_id", { length: 64 }),
  telegramUserId: varchar("telegram_user_id", { length: 64 }),
  telegramUsername: varchar("telegram_username", { length: 255 }),
  createdAt: datetime("created_at").notNull().default(new Date()),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  phoneIdx: index("phone_idx").on(table.phone),
  telegramChatIdIdx: index("clients_telegram_chat_id_idx").on(table.telegramChatId),
  telegramUserIdIdx: index("clients_telegram_user_id_idx").on(table.telegramUserId),
}));

export const appointments = mysqlTable("appointments", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").notNull(),
  clientId: int("client_id").notNull(),
  serviceId: int("service_id").notNull(),
  masterId: int("master_id").notNull(),
  startTime: datetime("start_time").notNull(),
  endTime: datetime("end_time").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("scheduled"),
  googleEventId: varchar("google_event_id", { length: 255 }),
  createdAt: datetime("created_at").notNull().default(new Date()),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  clientIdx: index("client_idx").on(table.clientId),
  startTimeIdx: index("start_time_idx").on(table.startTime),
}));

export const externalCalendarConnections = mysqlTable("externalCalendarConnections", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: datetime("expires_at"),
  calendarId: varchar("calendar_id", { length: 255 }),
  isActive: int("is_active").notNull().default(1),
  createdAt: datetime("created_at").notNull().default(new Date()),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
}));

export const notificationSettings = mysqlTable("notificationSettings", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").notNull(),
  reminderEnabled: int("reminder_enabled").notNull().default(1),
  reminder24hEnabled: int("reminder_24h_enabled").notNull().default(1),
  reminder1hEnabled: int("reminder_1h_enabled").notNull().default(1),
  telegramBookingRemindersEnabled: int("telegram_booking_reminders_enabled").notNull().default(1),
  testTelegramChatId: varchar("test_telegram_chat_id", { length: 64 }),
  aiTone: varchar("ai_tone", { length: 32 }).default("luxury"),
  businessDescription: text("business_description"),
  createdAt: datetime("created_at").notNull().default(new Date()),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
}));

export const notificationLogs = mysqlTable("notificationLogs", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").notNull(),
  appointmentId: int("appointment_id"),
  clientId: int("client_id").notNull(),
  channel: varchar("channel", { length: 50 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  errorMessage: text("error_message"),
  messageText: text("message_text"),
  sentAt: datetime("sent_at").notNull(),
  deliveredAt: datetime("delivered_at"),
  meta: text("meta"),
  templateId: int("template_id"),
  templateVariantKey: varchar("template_variant_key", { length: 16 }),
  isTest: int("is_test").notNull().default(0),
  createdAt: datetime("created_at").notNull().default(new Date()),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  appointmentIdx: index("appointment_idx").on(table.appointmentId),
  clientIdx: index("client_idx").on(table.clientId),
  statusIdx: index("status_idx").on(table.status),
  channelIdx: index("channel_idx").on(table.channel),
  sentAtIdx: index("sent_at_idx").on(table.sentAt),
  tenantCreatedIdx: index("tenant_created_idx").on(table.tenantId, table.createdAt),
  templateIdx: index("template_idx").on(table.templateId),
}));

export const notificationTemplates = mysqlTable("notificationTemplates", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").notNull(),
  channel: varchar("channel", { length: 50 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  variantKey: varchar("variant_key", { length: 16 }).notNull().default("A"),
  title: varchar("title", { length: 100 }).notNull(),
  body: text("body").notNull(),
  isDefault: int("is_default").notNull().default(0),
  trafficShare: int("traffic_share").notNull().default(100),
  isActive: int("is_active").notNull().default(1),
  createdAt: datetime("created_at").notNull().default(new Date()),
  updatedAt: datetime("updated_at").notNull().default(new Date()),
}, (table) => ({
  uniqueTemplate: unique("unique_template").on(table.tenantId, table.channel, table.type, table.variantKey),
  tenantIdx: index("notification_templates_tenant_idx").on(table.tenantId),
}));

export const whatsappSettings = mysqlTable("whatsappSettings", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").notNull(),
  twilioAccountSid: varchar("twilio_account_sid", { length: 255 }),
  twilioAuthToken: text("twilio_auth_token"),
  whatsappNumber: varchar("whatsapp_number", { length: 50 }),
  isEnabled: int("is_enabled").notNull().default(0),
  createdAt: datetime("created_at").notNull().default(new Date()),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
}));

export const contentChannels = mysqlTable("contentChannels", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  isActive: int("is_active").notNull().default(1),
  createdAt: datetime("created_at").notNull().default(new Date()),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
}));

export const mediaAssets = mysqlTable("mediaAssets", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").notNull(),
  storageKey: varchar("storage_key", { length: 500 }).notNull(),
  fileUrl: text("file_url").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  uploadedBy: int("uploaded_by").notNull(),
  createdAt: datetime("created_at").notNull().default(new Date()),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
}));

export const contentPosts = mysqlTable("contentPosts", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").notNull(),
  title: varchar("title", { length: 500 }),
  bodyText: text("body_text").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  scheduledAt: datetime("scheduled_at"),
  publishedAt: datetime("published_at"),
  mainMediaId: int("main_media_id"),
  createdAt: datetime("created_at").notNull().default(new Date()),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  statusIdx: index("status_idx").on(table.status),
  scheduledAtIdx: index("scheduled_at_idx").on(table.scheduledAt),
}));

export const contentPostChannels = mysqlTable("contentPostChannels", {
  id: serial("id").primaryKey(),
  contentPostId: int("content_post_id").notNull(),
  contentChannelId: int("content_channel_id").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  externalPostId: varchar("external_post_id", { length: 255 }),
  publishedAt: datetime("published_at"),
  errorMessage: text("error_message"),
}, (table) => ({
  postIdx: index("post_idx").on(table.contentPostId),
  channelIdx: index("channel_idx").on(table.contentChannelId),
}));
