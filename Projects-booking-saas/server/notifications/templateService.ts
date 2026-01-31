import { db } from "../db";
import { notificationTemplates } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export interface TemplateVariables {
  clientName?: string;
  serviceName?: string;
  masterName?: string;
  date?: string;
  time?: string;
  businessName?: string;
}

const DEFAULT_TEMPLATES: Record<string, { title: string; body: string }> = {
  "telegram_booking:reminder_24h": {
    title: "Напоминание за 24 часа",
    body: "Напоминание о завтрашней записи\n\n📅 Дата: {date}\n⏰ Время: {time}\n💇 Услуга: {serviceName}\n✂ Мастер: {masterName}\n\nЕсли нужно перенести или отменить запись — напиши /my или /booking.",
  },
  "telegram_booking:reminder_1h": {
    title: "Напоминание за 1 час",
    body: "Напоминание: до записи около часа\n\n📅 Дата: {date}\n⏰ Время: {time}\n💇 Услуга: {serviceName}\n✂ Мастер: {masterName}\n\nЕсли нужно перенести или отменить запись — напиши /my или /booking.",
  },
};

export async function getTemplateForNotification(params: {
  tenantId: number;
  channel: string;
  type: string;
  clientId?: number | null;
}): Promise<{ title: string; body: string; templateId: number | null; variantKey: string }> {
  const { tenantId, channel, type, clientId } = params;

  const customTemplates = await db
    .select()
    .from(notificationTemplates)
    .where(
      and(
        eq(notificationTemplates.tenantId, tenantId),
        eq(notificationTemplates.channel, channel),
        eq(notificationTemplates.type, type),
        eq(notificationTemplates.isActive, 1)
      )
    );

  if (customTemplates.length > 0) {
    const variants = customTemplates.sort((a, b) =>
      (a.variantKey ?? "A").localeCompare(b.variantKey ?? "A")
    );

    let chosen: typeof customTemplates[0];
    if (clientId != null && variants.length > 1) {
      const idx = clientId % variants.length;
      chosen = variants[idx];
    } else {
      chosen = variants[0];
    }

    return {
      title: chosen.title,
      body: chosen.body,
      templateId: chosen.id,
      variantKey: chosen.variantKey ?? "A",
    };
  }

  const defaultTemplates = await db
    .select()
    .from(notificationTemplates)
    .where(
      and(
        eq(notificationTemplates.tenantId, 0),
        eq(notificationTemplates.isDefault, 1),
        eq(notificationTemplates.channel, channel),
        eq(notificationTemplates.type, type),
        eq(notificationTemplates.isActive, 1)
      )
    );

  if (defaultTemplates.length > 0) {
    const variants = defaultTemplates.sort((a, b) =>
      (a.variantKey ?? "A").localeCompare(b.variantKey ?? "A")
    );

    let chosen: typeof defaultTemplates[0];
    if (clientId != null && variants.length > 1) {
      const idx = clientId % variants.length;
      chosen = variants[idx];
    } else {
      chosen = variants[0];
    }

    return {
      title: chosen.title,
      body: chosen.body,
      templateId: chosen.id,
      variantKey: chosen.variantKey ?? "A",
    };
  }

  const fallbackKey = `${channel}:${type}`;
  const fallback = DEFAULT_TEMPLATES[fallbackKey];

  if (fallback) {
    return {
      title: fallback.title,
      body: fallback.body,
      templateId: null,
      variantKey: "A",
    };
  }

  return {
    title: "Уведомление",
    body: "У вас запись на {date} в {time}. Услуга: {serviceName}, Мастер: {masterName}.",
    templateId: null,
    variantKey: "A",
  };
}

export function renderTemplate(body: string, vars: TemplateVariables): string {
  let result = body;

  const replacements: Record<string, string> = {
    clientName: vars.clientName ?? "клиент",
    serviceName: vars.serviceName ?? "услуга",
    masterName: vars.masterName ?? "мастер",
    date: vars.date ?? "",
    time: vars.time ?? "",
    businessName: vars.businessName ?? "ваш салон",
  };

  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    result = result.replace(regex, value);
  }

  return result;
}

