import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { appointments, clients, services, masters, notificationTemplates } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, count, desc, inArray } from "drizzle-orm";
import { env } from "../_core/env";
import OpenAI from "openai";
import { TRPCError } from "@trpc/server";
import { getNotificationSettings } from "../db/notificationSettings";
import { getTemplateConversionStats } from "../notifications/conversionService";

const openai = env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    })
  : null;

const BUSINESS_ASSISTANT_SYSTEM_PROMPT = `
Ты — ИИ-ассистент владельца сервиса по записям (салон красоты, барбершоп, студия услуг и т.п.).

ТВОЯ РОЛЬ:
- Помогать предпринимателю понимать цифры бизнеса.
- Объяснять сложное простым языком.
- Предлагать конкретные действия, а не абстрактные советы.
- Отвечать коротко и структурированно.

ДОСТУПНЫЕ ДАННЫЕ (контекст, который я тебе передам):
- Период анализа (обычно последние 30 дней).
- Общая выручка, количество записей, новые клиенты, retention.
- Топ услуг по выручке и количеству.
- Эффективность мастеров: сколько записей, выручка, загрузка.
- Активность клиентов: кто ходит часто, кто пришёл 1 раз и пропал.

ФОРМАТ ОТВЕТА:
ВСЕГДА отвечай в следующей структуре (даже если вопрос простой):

1) Краткий вывод (1–3 предложения)
   - Очень коротко, человеческим языком, без воды.

2) Цифры по данным
   - Приводи только те метрики, которые реально есть в контексте.
   - Если данных мало, честно скажи об этом.
   - Примеры:
     - "Выручка за период: 320 000 ₽"
     - "Записей: 124, новых клиентов: 18"
     - "Топ услуга: маникюр — 40% выручки"

3) Идеи и следующие шаги (2–4 пункта)
   - Предлагай конкретные гипотезы/действия:
     - поднять/снизить цену,
     - продвинуть конкретную услугу,
     - усилить конкретного мастера,
     - вернуть "одноразовых" клиентов.
   - Пиши так, чтобы владелец мог сразу что-то сделать.

ЕСЛИ ДАННЫХ НЕ ХВАТАЕТ:
- Не выдумывай цифры.
- Скажи, каких данных не хватает, и что нужно донастроить в системе.

СТИЛЬ:
- Без канцелярита.
- Дружелюбно, но профессионально.
- На "ты".
- Без смайликов, кроме редких случаев, когда это уместно.

Если вопрос не про бизнес-метрики (например, про маркетинг, воронки, идеи акций) — отвечай как консультант по развитию салона, опираясь на общий контекст бизнеса.
`.trim();

async function buildBusinessSnapshot(tenantId: number): Promise<string> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Собираем контекст: overview метрики
  const periodAppointments = await db
    .select()
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        eq(services.tenantId, tenantId),
        gte(appointments.startTime, thirtyDaysAgo),
        lte(appointments.startTime, now),
        eq(appointments.status, "scheduled")
      )
    );

  const totalRevenue = periodAppointments.reduce(
    (acc, apt) => acc + (Number(apt.services.price) || 0),
    0
  );
  const totalAppointments = periodAppointments.length;

  const clientFirstAppointments = await db
    .select({
      clientId: appointments.clientId,
      firstAppointment: sql<string>`MIN(${appointments.startTime})`,
    })
    .from(appointments)
    .where(eq(appointments.tenantId, tenantId))
    .groupBy(appointments.clientId);

  const newClients = clientFirstAppointments.filter(
    (c) => new Date(c.firstAppointment) >= thirtyDaysAgo && new Date(c.firstAppointment) <= now
  ).length;

  // Топ услуги за последние 30 дней
  const topServicesData = await db
    .select({
      serviceId: appointments.serviceId,
      count: count(),
      revenue: sql<number>`COALESCE(SUM(${services.price}), 0)`,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        eq(services.tenantId, tenantId),
        gte(appointments.startTime, thirtyDaysAgo),
        lte(appointments.startTime, now),
        eq(appointments.status, "scheduled")
      )
    )
    .groupBy(appointments.serviceId)
    .orderBy(desc(sql`COALESCE(SUM(${services.price}), 0)`), desc(count()))
    .limit(5);

  const servicesList = await db
    .select()
    .from(services)
    .where(eq(services.tenantId, tenantId));

  const topServices = topServicesData.map((r) => {
    const service = servicesList.find((s) => s.id === r.serviceId);
    return {
      name: service?.name || `Услуга #${r.serviceId}`,
      count: Number(r.count),
      revenue: Number(r.revenue),
    };
  });

  // Мастера с базовой статистикой
  const mastersList = await db
    .select()
    .from(masters)
    .where(eq(masters.tenantId, tenantId));

  const mastersWithStats = await Promise.all(
    mastersList.map(async (master) => {
      const masterAppointments = await db
        .select({
          count: count(),
          revenue: sql<number>`COALESCE(SUM(${services.price}), 0)`,
        })
        .from(appointments)
        .innerJoin(services, eq(appointments.serviceId, services.id))
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            eq(appointments.masterId, master.id),
            gte(appointments.startTime, thirtyDaysAgo),
            lte(appointments.startTime, now),
            eq(appointments.status, "scheduled")
          )
        );

      return {
        name: master.name,
        phone: master.phone,
        appointmentsCount: Number(masterAppointments[0]?.count || 0),
        revenue: Number(masterAppointments[0]?.revenue || 0),
      };
    })
  );

  // Активные клиенты и их активность
  const activeClientsCount = await db
    .select({ clientId: appointments.clientId })
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        gte(appointments.startTime, thirtyDaysAgo)
      )
    )
    .groupBy(appointments.clientId);

  const clientAppointmentCounts = await db
    .select({
      clientId: appointments.clientId,
      count: count(),
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        gte(appointments.startTime, thirtyDaysAgo),
        lte(appointments.startTime, now)
      )
    )
    .groupBy(appointments.clientId);

  const clientsOnce = clientAppointmentCounts.filter((c) => Number(c.count) === 1).length;
  const clientsTwoThree = clientAppointmentCounts.filter(
    (c) => Number(c.count) >= 2 && Number(c.count) <= 3
  ).length;
  const clientsFourPlus = clientAppointmentCounts.filter((c) => Number(c.count) >= 4).length;

  // Retention rate
  const repeatClients = clientAppointmentCounts.filter((c) => Number(c.count) > 1).length;
  const retentionRate =
    clientAppointmentCounts.length > 0
      ? Math.round((repeatClients / clientAppointmentCounts.length) * 100)
      : 0;

  // Формируем snapshot
  if (totalAppointments === 0) {
    return `
Бизнес-отчёт за последние 30 дней:

⚠️ За последние 30 дней записей нет, статистика пустая.

Доступные данные:
- Услуг в системе: ${servicesList.length}
- Мастеров в системе: ${mastersList.length}
- Всего клиентов в системе: ${activeClientsCount.length}

Рекомендация: начните создавать записи, чтобы появилась аналитика.
`.trim();
  }

  const topServicesText =
    topServices.length > 0
      ? topServices
          .map(
            (s, i) =>
              `${i + 1}) ${s.name}: ${s.count} записей, ${s.revenue.toLocaleString("ru-RU")} ₽ (${
                totalRevenue > 0 ? Math.round((s.revenue / totalRevenue) * 100) : 0
              }% выручки)`
          )
          .join("\n")
      : "Нет данных";

  const topMastersText =
    mastersWithStats.length > 0
      ? mastersWithStats
          .filter((m) => m.appointmentsCount > 0)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
          .map(
            (m, i) =>
              `${i + 1}) ${m.name}: ${m.appointmentsCount} записей, ${m.revenue.toLocaleString("ru-RU")} ₽`
          )
          .join("\n") || "Нет активных мастеров за период"
      : "Нет данных";

  return `
Бизнес-отчёт за последние 30 дней:

📊 ОБЩИЕ МЕТРИКИ:
- Выручка: ${totalRevenue.toLocaleString("ru-RU")} ₽
- Записей: ${totalAppointments}
- Новых клиентов: ${newClients}
- Активных клиентов: ${activeClientsCount.length}
- Retention rate: ${retentionRate}%

💼 ТОП УСЛУГ ПО ВЫРУЧКЕ:
${topServicesText}

👨‍💼 ТОП МАСТЕРОВ ПО ВЫРУЧКЕ:
${topMastersText}

👥 АКТИВНОСТЬ КЛИЕНТОВ:
- Ходят 1 раз: ${clientsOnce} клиентов
- Ходят 2–3 раза: ${clientsTwoThree} клиентов
- Ходят 4+ раз: ${clientsFourPlus} клиентов
`.trim();
}

async function buildBusinessDataSummary(tenantId: number): Promise<string> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const periodAppointments = await db
      .select()
      .from(appointments)
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          eq(services.tenantId, tenantId),
          gte(appointments.startTime, thirtyDaysAgo),
          lte(appointments.startTime, now),
          eq(appointments.status, "scheduled")
        )
      );

    const totalRevenue = periodAppointments.reduce(
      (acc, apt) => acc + (Number(apt.services.price) || 0),
      0
    );
    const totalAppointments = periodAppointments.length;

    if (totalAppointments === 0) {
      return "Данных пока мало, бизнес только стартует.";
    }

    const clientFirstAppointments = await db
      .select({
        clientId: appointments.clientId,
        firstAppointment: sql<string>`MIN(${appointments.startTime})`,
      })
      .from(appointments)
      .where(eq(appointments.tenantId, tenantId))
      .groupBy(appointments.clientId);

    const newClients = clientFirstAppointments.filter(
      (c) => new Date(c.firstAppointment) >= thirtyDaysAgo && new Date(c.firstAppointment) <= now
    ).length;

    const topServices = await db
      .select({
        serviceId: services.id,
        name: services.name,
        count: count(),
        revenue: sql<number>`COALESCE(SUM(${services.price}), 0)`,
      })
      .from(appointments)
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          eq(services.tenantId, tenantId),
          gte(appointments.startTime, thirtyDaysAgo),
          lte(appointments.startTime, now),
          eq(appointments.status, "scheduled")
        )
      )
      .groupBy(services.id)
      .orderBy(desc(sql<number>`COALESCE(SUM(${services.price}), 0)`))
      .limit(1);

    const clientAppointmentCounts = await db
      .select({
        clientId: appointments.clientId,
        count: count(),
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          gte(appointments.startTime, thirtyDaysAgo),
          lte(appointments.startTime, now)
        )
      )
      .groupBy(appointments.clientId);

    const clientsOnce = clientAppointmentCounts.filter((c) => Number(c.count) === 1).length;
    const clientsFourPlus = clientAppointmentCounts.filter((c) => Number(c.count) >= 4).length;

    const parts: string[] = [];
    parts.push(
      `Выручка за последние 30 дней: ${totalRevenue.toLocaleString("ru-RU")} ₽, записей: ${totalAppointments}, новых клиентов: ${newClients}.`
    );

    if (topServices.length > 0 && totalRevenue > 0) {
      const topService = topServices[0];
      const servicePercent = Math.round((Number(topService.revenue) / totalRevenue) * 100);
      parts.push(`Топ-услуга по выручке: "${topService.name}" — ${servicePercent}% выручки.`);
    }

    if (clientsOnce > 0 || clientsFourPlus > 0) {
      const parts2: string[] = [];
      if (clientsOnce > 0) {
        parts2.push(`много клиентов с 1 визитом (${clientsOnce})`);
      }
      if (clientsFourPlus > 0) {
        parts2.push(`есть база постоянных (4+ визита: ${clientsFourPlus})`);
      }
      if (parts2.length > 0) {
        parts.push(parts2.join(", ") + ".");
      }
    }

    return parts.join(" ");
  } catch (error) {
    console.error("[Assistant][BuildBusinessDataSummary] Error:", error);
    return "Данных пока мало, бизнес только стартует.";
  }
}

export const assistantRouter = router({
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1),
        context: z.enum(["owner", "client"]).default("owner"),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!openai) {
        return {
          reply: "ИИ-ассистент ещё не настроен: нет OPENAI_API_KEY в .env. Добавьте ключ в переменные окружения, чтобы использовать ассистента.",
        };
      }

      const tenantId = ctx.user.tenantId;

      // Собираем snapshot бизнеса
      const snapshot = await buildBusinessSnapshot(tenantId);

      // Формируем историю диалога
      const historyMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
        input.history && input.history.length > 0
          ? input.history
              .slice(-10)
              .map((msg) => ({
                role: msg.role === "assistant" ? ("assistant" as const) : ("user" as const),
                content: msg.content,
              }))
          : [];

      // Формируем messages для OpenAI
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: BUSINESS_ASSISTANT_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: snapshot,
        },
        ...historyMessages,
        {
          role: "user",
          content: input.message,
        },
      ];

      try {
        const completion = await openai.chat.completions.create({
          model: env.OPENAI_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 800,
        });

        const reply = completion.choices[0]?.message?.content || "Извините, не удалось получить ответ.";

        return {
          reply,
        };
      } catch (error) {
        console.error("OpenAI API error:", error);
        return {
          reply: "Произошла ошибка при обращении к ИИ-ассистенту. Попробуйте позже или проверьте настройки API.",
        };
      }
    }),

  generateTemplate: protectedProcedure
    .input(
      z.object({
        channel: z.enum(["telegram_booking"]),
        type: z.enum(["reminder_24h", "reminder_1h"]),
        currentTitle: z.string().max(100).nullable().optional(),
        currentBody: z.string().min(1),
        tone: z.enum(["luxury", "friendly", "neutral"]).default("luxury"),
        businessHint: z.string().max(200).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!openai) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "ИИ пока не настроен. Проверь API-ключ в настройках сервера.",
        });
      }

      const tenantId = ctx.user.tenantId;
      const settings = await getNotificationSettings(tenantId);

      const tone = input.tone ?? settings.aiTone ?? "luxury";
      const businessDescription = input.businessHint ?? settings.businessDescription ?? "";
      const businessDataSummary = await buildBusinessDataSummary(tenantId);

      const toneDescriptionMap: Record<string, string> = {
        luxury: "Премиум, аккуратно, без кринжа. Элегантно и профессионально. Стиль должен быть уверенным, спокойным, чуть \"дорогим\".",
        friendly: "Тёплый, дружелюбный стиль, можно чуть проще, ближе к разговорному, но оставаясь профессиональным.",
        neutral: "Нейтральный деловой язык, ровно, без ярко выраженного стиля, без лишних эмоций.",
      };

      const TEMPLATE_GENERATOR_SYSTEM_PROMPT = `
Ты — копирайтер для уведомлений салона красоты / студии услуг.

ТВОЯ ЗАДАЧА:
Создавать тексты напоминаний о записи для Telegram-бота.

КАНАЛ: Telegram-напоминание о записи.

ТИП УВЕДОМЛЕНИЯ:
${input.type === "reminder_24h" ? "Напоминание за 24 часа (за сутки до записи)" : "Напоминание за 1 час (за час до записи)"}

ТОНАЛЬНОСТЬ ОТВЕТА:
${toneDescriptionMap[tone] || toneDescriptionMap.luxury}

Тебе также будет передан описание бизнеса и краткая статистика. Учитывай это при выборе формулировок и аргументов в тексте шаблона. Например:
- Если много постоянных клиентов — можно упомянуть про лояльность.
- Если высокий чек — акцент на премиальность.
- Если топ-услуга выделяется — можно мягко намекнуть на неё.

КРИТИЧЕСКИ ВАЖНО:
1. Сохраняй ВСЕ плейсхолдеры в точном формате: {clientName}, {serviceName}, {masterName}, {date}, {time}, {businessName}
2. НЕ меняй их названия и формат
3. НЕ добавляй новые плейсхолдеры
4. Обязательно используй {date} и {time} хотя бы один раз в каждом варианте
5. Пиши plain text, без Markdown, без списков, без форматирования
6. Текст должен быть читаемым и естественным

ФОРМАТ ОТВЕТА:
Верни ТОЛЬКО валидный JSON без дополнительного текста:
{
  "variants": [
    { "title": "string | null", "body": "string" },
    { "title": "string | null", "body": "string" },
    { "title": "string | null", "body": "string" }
  ]
}

Генерируй 2-3 варианта текста, каждый должен быть уникальным по формулировке, но сохранять все плейсхолдеры.
`.trim();

      const typeDescription =
        input.type === "reminder_24h"
          ? "напоминание за 24 часа (за сутки до записи)"
          : "напоминание за 1 час (за час до записи)";

      const toneDescription =
        tone === "luxury"
          ? "премиум, элегантно и профессионально"
          : tone === "friendly"
          ? "дружелюбно, но профессионально"
          : "нейтральный деловой стиль";

      let userPrompt = `Сгенерируй 2-3 варианта текста для ${typeDescription} через Telegram-бот.\n\n`;
      userPrompt += `Стиль: ${toneDescription}\n\n`;

      if (businessDescription) {
        userPrompt += `[Описание бизнеса]:\n${businessDescription}\n\n`;
      }

      if (businessDataSummary) {
        userPrompt += `[Краткая статистика бизнеса]:\n${businessDataSummary}\n\n`;
      }

      userPrompt += `Текущий текст шаблона (как пример стиля):\n${input.currentBody}\n\n`;
      userPrompt += `Верни JSON с вариантами. Каждый вариант должен содержать плейсхолдеры {date} и {time} обязательно.`;

      try {
        const completion = await openai.chat.completions.create({
          model: env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: TEMPLATE_GENERATOR_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: userPrompt + "\n\nВажно: верни ТОЛЬКО валидный JSON без дополнительного текста до или после.",
            },
          ],
          temperature: 0.8,
          max_tokens: 1000,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ИИ не вернул варианты. Попробуй ещё раз.",
          });
        }

        let parsed: { variants?: Array<{ title?: string | null; body?: string }> };
        try {
          parsed = JSON.parse(content);
        } catch (parseError) {
          console.error("[Assistant][GenerateTemplate] JSON parse error:", parseError, "Content:", content);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Не удалось обработать ответ от ИИ. Попробуй ещё раз.",
          });
        }

        if (!parsed.variants || !Array.isArray(parsed.variants)) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ИИ вернул неверный формат ответа. Попробуй ещё раз.",
          });
        }

        const validVariants = parsed.variants
          .filter((v) => {
            if (!v.body || typeof v.body !== "string" || v.body.trim().length === 0) {
              return false;
            }
            if (!v.body.includes("{date}") || !v.body.includes("{time}")) {
              return false;
            }
            return true;
          })
          .map((v) => ({
            title: v.title && typeof v.title === "string" ? v.title : null,
            body: v.body!.trim(),
          }))
          .slice(0, 3);

        if (validVariants.length === 0) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ИИ не смог предложить варианты с обязательными плейсхолдерами. Попробуй ещё раз.",
          });
        }

        return {
          variants: validVariants,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("[Assistant][GenerateTemplate] OpenAI API error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Не удалось получить варианты от ИИ. Попробуй ещё раз позже.",
        });
      }
    }),

  generateNotificationAdvice: protectedProcedure
    .input(
      z.object({
        channel: z.string(),
        type: z.string(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!openai) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "ИИ пока не настроен. Проверь API-ключ в настройках сервера.",
        });
      }

      const tenantId = ctx.user.tenantId;
      const now = new Date();
      const defaultFrom = new Date(now);
      defaultFrom.setDate(defaultFrom.getDate() - 30);

      const fromDate = input.from ? new Date(input.from) : defaultFrom;
      const toDate = input.to ? new Date(input.to) : now;

      // Получить конверсионную статистику
      const conversionStats = await getTemplateConversionStats({
        tenantId,
        channel: input.channel,
        type: input.type,
        from: fromDate,
        to: toDate,
      });

      // Проверить, есть ли достаточно данных
      const hasEnoughData = conversionStats.some((stat) => stat.uniqueAppointments >= 5);
      if (!hasEnoughData) {
        const totalAppointments = conversionStats.reduce((sum, stat) => sum + stat.uniqueAppointments, 0);
        return {
          advice: `Пока недостаточно данных для анализа. Набери хотя бы 5 записей на вариант. Сейчас в выборке: ${totalAppointments} записей.`,
        };
      }

      // Получить бизнес-снапшот
      const businessSummary = await buildBusinessDataSummary(tenantId);

      // Получить шаблоны для title/bodyPreview
      const templateIds = Array.from(
        new Set(conversionStats.map((s) => s.templateId).filter((id) => id !== null))
      ) as number[];

      const templates =
        templateIds.length > 0
          ? await db
              .select({
                id: notificationTemplates.id,
                title: notificationTemplates.title,
                body: notificationTemplates.body,
              })
              .from(notificationTemplates)
              .where(
                and(
                  eq(notificationTemplates.tenantId, tenantId),
                  inArray(notificationTemplates.id, templateIds)
                )
              )
          : [];

      const templateMap = new Map(templates.map((t) => [t.id, t]));

      // Сформировать описание вариантов для промпта
      const variantsDescription = conversionStats
        .map((stat) => {
          const template = stat.templateId ? templateMap.get(stat.templateId) : null;
          const successRate =
            stat.sentCount + stat.failedCount > 0
              ? Math.round((stat.sentCount / (stat.sentCount + stat.failedCount)) * 100)
              : 0;
          const completionRatePercent = Math.round(stat.completionRate * 100);
          const noShowRatePercent = Math.round(stat.noShowRate * 100);
          const hasLowData = stat.uniqueAppointments < 5;

          return `Вариант ${stat.templateVariantKey || "—"}:
- Заголовок: ${template?.title || "нет"}
- Отправлено: ${stat.sentCount}
- Успешность доставки: ${successRate}%
- Записей в выборке: ${stat.uniqueAppointments}${hasLowData ? " (мало данных)" : ""}
- Завершено: ${stat.completedCount}
- Отменено: ${stat.cancelledCount}
- No-show: ${stat.noShowCount}
- Конверсия в завершение: ${completionRatePercent}%
- No-show rate: ${noShowRatePercent}%`;
        })
        .join("\n\n");

      const NOTIFICATION_ADVISOR_SYSTEM_PROMPT = `
Ты — ИИ-консультант по уведомлениям и маркетингу салона красоты / студии услуг.

ТВОЯ РОЛЬ:
- Анализировать статистику по A/B-вариантам шаблонов уведомлений.
- Объяснять, какой вариант работает лучше по конверсии (приход клиентов).
- Предлагать конкретные действия: что оставить, что отключить, что потестить.

ФОРМАТ ОТВЕТА (ОБЯЗАТЕЛЬНО):
ВСЕГДА отвечай в следующей структуре:

1) Краткий вывод (1–3 предложения)
   - Очень коротко, человеческим языком, без воды.
   - Кто лучше работает, насколько значима разница.

2) Данные по вариантам
   - Вариант A: [краткая характеристика]
   - Вариант B: [краткая характеристика]
   (если есть другие — перечислить)
   - Если у варианта мало данных (< 5 записей), явно укажи это.

3) Идеи и следующие шаги (2–5 пунктов)
   - Конкретные действия:
     * "Оставить вариант X, отключить Y"
     * "Протестировать новый вариант Z"
     * "Увеличить долю трафика для варианта X"
   - Пиши так, чтобы владелец мог сразу что-то сделать.

ЕСЛИ ДАННЫХ НЕ ХВАТАЕТ:
- Не выдумывай цифры.
- Скажи, каких данных не хватает, и что нужно донастроить.

СТИЛЬ:
- Без канцелярита.
- Дружелюбно, но профессионально.
- На "ты".
- Без смайликов, кроме редких случаев, когда это уместно.
`.trim();

      const userPrompt = `[Контекст бизнеса]

${businessSummary}

[Канал и тип уведомления]

Канал: ${input.channel}
Тип: ${input.type === "reminder_24h" ? "Напоминание за 24 часа" : input.type === "reminder_1h" ? "Напоминание за 1 час" : input.type}

[Данные по вариантам]

${variantsDescription}

Проанализируй эти данные и дай рекомендации по шаблонам уведомлений.`;

      try {
        const completion = await openai.chat.completions.create({
          model: env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: NOTIFICATION_ADVISOR_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1500,
        });

        const replyText = completion.choices[0]?.message?.content;
        if (!replyText) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ИИ не вернул рекомендации. Попробуй ещё раз.",
          });
        }

        return {
          advice: replyText,
        };
      } catch (error) {
        console.error("[NotificationAdvisor] OpenAI API error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Произошла ошибка при обращении к ИИ-ассистенту. Попробуйте позже или проверьте настройки API.",
        });
      }
    }),
});

