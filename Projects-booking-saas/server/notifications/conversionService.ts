import { db } from "../db";
import { notificationLogs, appointments } from "../../drizzle/schema";
import { eq, and, gte, lte, ne, inArray } from "drizzle-orm";

export interface TemplateConversionStats {
  templateId: number | null;
  templateVariantKey: string | null;
  sentCount: number;
  failedCount: number;
  uniqueClients: number;
  uniqueAppointments: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  completionRate: number; // 0–1
  noShowRate: number; // 0–1
}

export async function getTemplateConversionStats(params: {
  tenantId: number;
  channel: string;
  type: string;
  from?: Date;
  to?: Date;
}): Promise<TemplateConversionStats[]> {
  const { tenantId, channel, type, from, to } = params;

  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const fromDate = from || defaultFrom;
  const toDate = to || now;

  // Шаг 1: Получить логи и агрегировать по (templateId, templateVariantKey)
  const logs = await db
    .select({
      templateId: notificationLogs.templateId,
      templateVariantKey: notificationLogs.templateVariantKey,
      status: notificationLogs.status,
      appointmentId: notificationLogs.appointmentId,
      clientId: notificationLogs.clientId,
    })
    .from(notificationLogs)
    .where(
      and(
        eq(notificationLogs.tenantId, tenantId),
        eq(notificationLogs.channel, channel),
        eq(notificationLogs.type, type),
        gte(notificationLogs.createdAt, fromDate),
        lte(notificationLogs.createdAt, toDate),
        ne(notificationLogs.clientId, 0),
        ne(notificationLogs.appointmentId, 0),
        eq(notificationLogs.isTest, 0)
      )
    );

  // Агрегация по логам
  const logStats = new Map<
    string,
    {
      templateId: number | null;
      templateVariantKey: string | null;
      sentCount: number;
      failedCount: number;
      appointmentIds: Set<number>;
      clientIds: Set<number>;
    }
  >();

  for (const log of logs) {
    const key = `${log.templateId ?? "null"}_${log.templateVariantKey ?? "null"}`;

    if (!logStats.has(key)) {
      logStats.set(key, {
        templateId: log.templateId,
        templateVariantKey: log.templateVariantKey,
        sentCount: 0,
        failedCount: 0,
        appointmentIds: new Set(),
        clientIds: new Set(),
      });
    }

    const stat = logStats.get(key)!;
    if (log.status === "sent") {
      stat.sentCount++;
    } else if (log.status === "failed") {
      stat.failedCount++;
    }

    if (log.appointmentId) {
      stat.appointmentIds.add(log.appointmentId);
    }
    if (log.clientId) {
      stat.clientIds.add(log.clientId);
    }
  }

  // Шаг 2: Для каждой пары (templateId, templateVariantKey) получить статусы appointments
  const result: TemplateConversionStats[] = [];

  for (const [key, logStat] of logStats.entries()) {
    const appointmentIds = Array.from(logStat.appointmentIds);

    if (appointmentIds.length === 0) {
      // Если нет appointmentId, всё равно вернём статистику по логам
      result.push({
        templateId: logStat.templateId,
        templateVariantKey: logStat.templateVariantKey,
        sentCount: logStat.sentCount,
        failedCount: logStat.failedCount,
        uniqueClients: logStat.clientIds.size,
        uniqueAppointments: 0,
        completedCount: 0,
        cancelledCount: 0,
        noShowCount: 0,
        completionRate: 0,
        noShowRate: 0,
      });
      continue;
    }

    // Получить статусы appointments
    const appointmentStatuses = await db
      .select({
        id: appointments.id,
        status: appointments.status,
        clientId: appointments.clientId,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          inArray(appointments.id, appointmentIds)
        )
      );

    // Подсчитать статусы
    let completedCount = 0;
    let cancelledCount = 0;
    let noShowCount = 0;
    const uniqueClientIds = new Set<number>();

    for (const apt of appointmentStatuses) {
      if (apt.status === "completed") {
        completedCount++;
      } else if (apt.status === "cancelled") {
        cancelledCount++;
      } else if (apt.status === "no_show") {
        noShowCount++;
      }
      if (apt.clientId) {
        uniqueClientIds.add(apt.clientId);
      }
    }

    const uniqueAppointments = appointmentStatuses.length;
    const completionRate = uniqueAppointments > 0 ? completedCount / uniqueAppointments : 0;
    const noShowRate = uniqueAppointments > 0 ? noShowCount / uniqueAppointments : 0;

    result.push({
      templateId: logStat.templateId,
      templateVariantKey: logStat.templateVariantKey,
      sentCount: logStat.sentCount,
      failedCount: logStat.failedCount,
      uniqueClients: Math.max(logStat.clientIds.size, uniqueClientIds.size),
      uniqueAppointments,
      completedCount,
      cancelledCount,
      noShowCount,
      completionRate,
      noShowRate,
    });
  }

  return result;
}

