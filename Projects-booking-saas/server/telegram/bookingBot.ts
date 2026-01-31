import { Telegraf, Context as TelegrafContext } from "telegraf";
import type { AppRouter } from "../routers";
import type { BookingStep, BookingContext, SessionState, SessionsMap } from "./types";
import { env } from "../_core/env";

const sessions: SessionsMap = new Map();

let bookingBotInstance: Telegraf | null = null;

export async function sendBookingTelegramMessage(
  chatId: string | number,
  text: string,
  extra?: any
): Promise<void> {
  if (!bookingBotInstance) {
    console.warn("[TelegramBookingBot][Reminder] Bot instance not available");
    return;
  }

  try {
    await bookingBotInstance.telegram.sendMessage(chatId, text, extra);
    console.log("[TelegramBookingBot][Reminder] Message sent", { chatId });
  } catch (error) {
    console.error("[TelegramBookingBot][Reminder] Error sending message", {
      error,
      chatId,
    });
  }
}

function getSession(chatId: number): SessionState {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { step: "idle", data: {} });
  }
  return sessions.get(chatId)!;
}

function setSession(chatId: number, state: SessionState): void {
  sessions.set(chatId, state);
}

function resetSession(chatId: number): void {
  sessions.set(chatId, { step: "idle", data: {} });
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return phone.slice(0, 2) + "***" + phone.slice(-4);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNextDays(count: number): Array<{ label: string; dateISO: string }> {
  const days: Array<{ label: string; dateISO: string }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const labels = ["Сегодня", "Завтра"];
  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const label = i < labels.length ? labels[i] : `+${i} дн.`;
    days.push({
      label,
      dateISO: date.toISOString().split("T")[0],
    });
  }
  return days;
}

export async function initTelegramBookingBot(appRouter: AppRouter): Promise<void> {
  if (!env.TELEGRAM_BOOKING_BOT_TOKEN || !env.BOOKING_TENANT_ID) {
    console.log("[TelegramBookingBot] Disabled: no TELEGRAM_BOOKING_BOT_TOKEN or BOOKING_TENANT_ID");
    return;
  }

  const bot = new Telegraf(env.TELEGRAM_BOOKING_BOT_TOKEN);
  bookingBotInstance = bot;
  const tenantId = env.BOOKING_TENANT_ID;

  const internalContext = {
    user: null,
    tenantId: null,
    req: {} as any,
    res: {} as any,
  };

  const caller = (appRouter as any).createCaller(internalContext);

  bot.command("start", async (ctx: TelegrafContext) => {
    const session = getSession(ctx.chat!.id);
    resetSession(ctx.chat!.id);

    await ctx.reply(
      "👋 Привет! Я бот-записи. Помогу записать тебя к мастеру в пару шагов.\n\nНажми «Записаться», чтобы создать новую запись.",
      {
        reply_markup: {
          inline_keyboard: [[{ text: "📅 Записаться", callback_data: "start_booking" }]],
        },
      }
    );
  });

  bot.command("help", async (ctx: TelegrafContext) => {
    await ctx.reply("Я могу записать тебя на услугу. Нажми 'Записаться' или используй команду /new");
  });

  bot.command("new", async (ctx: TelegrafContext) => {
    resetSession(ctx.chat!.id);
    await handleStartBooking(ctx, caller, tenantId);
  });

  bot.command("booking", async (ctx: TelegrafContext) => {
    resetSession(ctx.chat!.id);
    await handleStartBooking(ctx, caller, tenantId);
  });

  bot.command("cancel", async (ctx: TelegrafContext) => {
    resetSession(ctx.chat!.id);
    await ctx.reply("Ок, всё отменил. Если захочешь — начнём заново.", {
      reply_markup: {
        inline_keyboard: [[{ text: "📅 Записаться", callback_data: "start_booking" }]],
      },
    });
  });

  bot.command("my", async (ctx) => {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    console.log("[TelegramBookingBot] /my called", { chatId, userId });

    try {
      const appointments = await caller.publicBooking.listClientUpcoming({
        tenantId,
        telegramChatId: chatId?.toString(),
        telegramUserId: userId?.toString(),
      });

      console.log("[TelegramBookingBot] /my result", {
        chatId,
        userId,
        appointmentsCount: appointments.length,
      });

      if (appointments.length === 0) {
        await ctx.reply(
          "Пока нет активных записей.\n\nМожешь создать новую через /booking.",
          {
            reply_markup: {
              inline_keyboard: [[{ text: "📅 Записаться", callback_data: "start_booking" }]],
            },
          }
        );
        return;
      }

      let message = "Твои ближайшие записи:\n\n";
      const buttons: Array<Array<{ text: string; callback_data: string }>> = [];

      appointments.forEach((apt, index) => {
        const startDate = new Date(apt.startTime);
        const dateStr = startDate.toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
        });
        const timeStr = startDate.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        });

        message += `#${index + 1} — ${dateStr}, ${timeStr}\n`;
        message += `Услуга: ${apt.service?.name || "Не указана"}\n`;
        message += `Мастер: ${apt.master?.name || "Не указан"}\n`;
        message += `Статус: Запланирована\n\n`;

        buttons.push([
          {
            text: `Отменить #${index + 1}`,
            callback_data: `booking:cancel:${apt.id}`,
          },
        ]);
      });

      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: buttons,
        },
      });
    } catch (error) {
      console.error("[TelegramBookingBot] Error in /my handler", {
        error,
        chatId,
        userId,
      });
      await ctx.reply("Что-то пошло не так при загрузке записей. Попробуй ещё раз позже.");
    }
  });

  bot.action("start_booking", async (ctx: TelegrafContext) => {
    await handleStartBooking(ctx, caller, tenantId);
  });

  bot.action(/^service:(\d+)$/, async (ctx) => {
    const match = (ctx as any).match;
    if (!match || !match[1]) return;
    const serviceId = parseInt(match[1], 10);
    await handleServiceSelect(ctx, caller, tenantId, serviceId);
  });

  bot.action(/^master:(\d+)$/, async (ctx) => {
    const match = (ctx as any).match;
    if (!match || !match[1]) return;
    const masterId = parseInt(match[1], 10);
    await handleMasterSelect(ctx, caller, tenantId, masterId);
  });

  bot.action("master:any", async (ctx) => {
    await handleMasterSelect(ctx, caller, tenantId, null);
  });

  bot.action(/^date:(.+)$/, async (ctx) => {
    const match = (ctx as any).match;
    if (!match || !match[1]) return;
    const dateISO = match[1];
    await handleDateSelect(ctx, caller, tenantId, dateISO);
  });

  bot.action(/^slot:(.+)$/, async (ctx) => {
    const match = (ctx as any).match;
    if (!match || !match[1]) return;
    const slotData = match[1];
    await handleSlotSelect(ctx, slotData);
  });

  bot.action(/^confirm:(yes|cancel)$/, async (ctx) => {
    const match = (ctx as any).match;
    if (!match || !match[1]) return;
    if (match[1] === "yes") {
      await handleConfirmBooking(ctx, caller, tenantId);
    } else {
      resetSession(ctx.chat!.id);
      await ctx.reply("Запись отменена. Если захочешь — начнём заново.", {
        reply_markup: {
          inline_keyboard: [[{ text: "📅 Записаться", callback_data: "start_booking" }]],
        },
      });
    }
  });

  bot.on("contact", async (ctx: TelegrafContext) => {
    const session = getSession(ctx.chat!.id);
    if (session.step === "collecting_client" && ctx.message && "contact" in ctx.message) {
      const phone = ctx.message.contact.phone_number;
      session.data.clientPhone = phone.startsWith("+") ? phone : `+${phone}`;
      session.data.clientWhatsapp = session.data.clientPhone;
      setSession(ctx.chat!.id, session);

      if (!session.data.clientName) {
        await ctx.reply("Отлично! Теперь напиши своё имя:");
      } else {
        await handleClientDataComplete(ctx, session);
      }
    }
  });

  bot.on("text", async (ctx) => {
    const session = getSession(ctx.chat!.id);
    const text = (ctx.message && "text" in ctx.message) ? ctx.message.text : "";

    if (session.step === "collecting_client") {
      if (!session.data.clientPhone) {
        if (text.length >= 10 && /[\d+]/.test(text)) {
          session.data.clientPhone = text;
          session.data.clientWhatsapp = text;
          setSession(ctx.chat!.id, session);
          await ctx.reply("Отлично! Теперь напиши своё имя:");
        } else {
          await ctx.reply("Пожалуйста, введи номер телефона в формате +79991234567 или нажми кнопку 'Отправить телефон':", {
            reply_markup: {
              keyboard: [
                [
                  {
                    text: "📱 Отправить телефон",
                    request_contact: true,
                  },
                ],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          });
        }
      } else if (!session.data.clientName) {
        if (text.trim().length >= 2) {
          session.data.clientName = text.trim();
          setSession(ctx.chat!.id, session);
          await handleClientDataComplete(ctx, session);
        } else {
          await ctx.reply("Пожалуйста, введи своё имя (минимум 2 символа):");
        }
      }
    } else if (session.step !== "idle") {
      await ctx.reply("Используй кнопки для выбора или команду /cancel для отмены.");
    }
  });

  async function handleStartBooking(ctx: TelegrafContext, caller: any, tenantId: number) {
    try {
      const chatId = ctx.chat?.id;
      const userId = ctx.from?.id;
      console.log("[TelegramBookingBot] New booking flow started", { chatId, userId });

      const services = await caller.publicBooking.listServices({ tenantId });
      if (services.length === 0) {
        await ctx.reply("К сожалению, сейчас нет доступных услуг. Попробуй позже.");
        return;
      }

      const session = getSession(ctx.chat!.id);
      session.step = "choosing_service";
      setSession(ctx.chat!.id, session);

      const buttons = services.map((service) => [
        {
          text: `${service.name}${service.price ? ` — ${service.price.toLocaleString("ru-RU")} ₽` : ""}`,
          callback_data: `service:${service.id}`,
        },
      ]);

      await ctx.reply("Выбери услугу:", {
        reply_markup: {
          inline_keyboard: [...buttons, [{ text: "❌ Отменить", callback_data: "confirm:cancel" }]],
        },
      });
    } catch (error) {
      console.error("[TelegramBookingBot] Error in booking flow", { error, step: "loading_services", chatId: ctx.chat?.id });
      await ctx.reply("Что-то пошло не так на стороне сервера. Попробуй ещё раз чуть позже.");
    }
  }

  async function handleServiceSelect(
    ctx: TelegrafContext,
    caller: any,
    tenantId: number,
    serviceId: number
  ) {
    try {
      const services = await caller.publicBooking.listServices({ tenantId });
      const service = services.find((s: any) => s.id === serviceId);
      if (!service) {
        await ctx.reply("Услуга не найдена. Начни заново.");
        return;
      }

      const session = getSession(ctx.chat!.id);
      session.step = "choosing_master";
      session.data.serviceId = serviceId;
      session.data.serviceName = service.name;
      setSession(ctx.chat!.id, session);

      console.log("[TelegramBookingBot] Service selected", { chatId: ctx.chat?.id, serviceId, serviceName: service.name });

      const masters = await caller.publicBooking.listMasters({ tenantId });
      const buttons = [[{ text: "Не важно (любой свободный мастер)", callback_data: "master:any" }]];

      if (masters.length > 0) {
        buttons.push(
          ...masters.map((master: any) => [
            {
              text: master.name,
              callback_data: `master:${master.id}`,
            },
          ])
        );
      }

      await ctx.reply("Выбери мастера или нажми 'Не важно':", {
        reply_markup: {
          inline_keyboard: [...buttons, [{ text: "❌ Отменить", callback_data: "confirm:cancel" }]],
        },
      });
    } catch (error) {
      console.error("[TelegramBookingBot] Error in booking flow", { error, step: "selecting_service", chatId: ctx.chat?.id });
      await ctx.reply("Что-то пошло не так на стороне сервера. Попробуй ещё раз чуть позже.");
    }
  }

  async function handleMasterSelect(
    ctx: TelegrafContext,
    caller: any,
    tenantId: number,
    masterId: number | null
  ) {
    try {
      const session = getSession(ctx.chat!.id);
      if (!session.data.serviceId) {
        await ctx.reply("Похоже, мы сбились. Давай начнём запись заново.");
        resetSession(ctx.chat!.id);
        return;
      }

      if (masterId !== null) {
        const masters = await caller.publicBooking.listMasters({ tenantId });
        const master = masters.find((m: any) => m.id === masterId);
        if (!master) {
          await ctx.reply("Мастер не найден. Начни заново.");
          return;
        }
        session.data.masterId = masterId;
        session.data.masterName = master.name;
      } else {
        session.data.masterId = null;
        session.data.masterName = "Любой мастер";
      }

      session.step = "choosing_date";
      setSession(ctx.chat!.id, session);

      console.log("[TelegramBookingBot] Master selected", { chatId: ctx.chat?.id, masterId, masterName: session.data.masterName });

      const days = getNextDays(7);
      const buttons = days.map((day) => [
        {
          text: `${day.label} (${formatDate(new Date(day.dateISO))})`,
          callback_data: `date:${day.dateISO}`,
        },
      ]);

      await ctx.reply("Выбери дату:", {
        reply_markup: {
          inline_keyboard: [...buttons, [{ text: "❌ Отменить", callback_data: "confirm:cancel" }]],
        },
      });
    } catch (error) {
      console.error("[TelegramBookingBot] Error in booking flow", { error, step: "selecting_master", chatId: ctx.chat?.id });
      await ctx.reply("Что-то пошло не так на стороне сервера. Попробуй ещё раз чуть позже.");
    }
  }

  async function handleDateSelect(ctx: TelegrafContext, caller: any, tenantId: number, dateISO: string) {
    try {
      const session = getSession(ctx.chat!.id);
      if (!session.data.serviceId) {
        await ctx.reply("Похоже, мы сбились. Давай начнём запись заново.");
        resetSession(ctx.chat!.id);
        return;
      }

      session.step = "choosing_slot";
      session.data.dateISO = dateISO;
      setSession(ctx.chat!.id, session);

      console.log("[TelegramBookingBot] Date selected", { chatId: ctx.chat?.id, date: dateISO });

      const slots = await caller.publicBooking.getAvailableSlots({
        tenantId,
        serviceId: session.data.serviceId!,
        date: dateISO,
        masterId: session.data.masterId || undefined,
      });

      if (slots.length === 0) {
        await ctx.reply("На эту дату свободного времени нет. Попробуй выбрать другой день.", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "◀️ Выбрать другую дату", callback_data: "back_to_date" }],
              [{ text: "❌ Отменить", callback_data: "confirm:cancel" }],
            ],
          },
        });
        return;
      }

      const buttons: Array<Array<{ text: string; callback_data: string }>> = [];
      const slotsPerRow = 2;
      for (let i = 0; i < slots.length; i += slotsPerRow) {
        const row = slots.slice(i, i + slotsPerRow).map((slot: any, idx: number) => {
          const time = new Date(slot.startTime);
          const timeStr = time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
          return {
            text: timeStr,
            callback_data: `slot:${slot.startTime}|${slot.endTime}|${slot.masterId}`,
          };
        });
        buttons.push(row);
      }

      await ctx.reply("Выбери время:", {
        reply_markup: {
          inline_keyboard: [...buttons, [{ text: "❌ Отменить", callback_data: "confirm:cancel" }]],
        },
      });
    } catch (error) {
      console.error("[TelegramBookingBot] Error in booking flow", { error, step: "loading_slots", chatId: ctx.chat?.id });
      await ctx.reply("Что-то пошло не так на стороне сервера. Попробуй ещё раз чуть позже.");
    }
  }

  bot.action("back_to_date", async (ctx: TelegrafContext) => {
    const session = getSession(ctx.chat!.id);
    session.step = "choosing_date";
    setSession(ctx.chat!.id, session);
    await handleMasterSelect(ctx, caller, tenantId, session.data.masterId ?? null);
  });

  bot.action(/^booking:cancel:(\d+)$/, async (ctx) => {
    const match = (ctx as any).match;
    if (!match || !match[1]) return;

    const appointmentId = parseInt(match[1], 10);
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;

    console.log("[TelegramBookingBot] Cancel requested", {
      chatId,
      userId,
      appointmentId,
    });

    try {
      const result = await caller.publicBooking.cancelBooking({
        tenantId,
        appointmentId,
        telegramChatId: chatId?.toString(),
        telegramUserId: userId?.toString(),
      });

      if (result.success && !result.alreadyCancelled) {
        console.log("[TelegramBookingBot] Booking cancelled", {
          chatId,
          userId,
          appointmentId,
        });

        await ctx.reply(
          "Готово, запись отменена.\n\nЕсли нужно, можем подобрать другое время через /booking.",
          {
            reply_markup: {
              inline_keyboard: [[{ text: "📅 Записаться", callback_data: "start_booking" }]],
            },
          }
        );
      } else if (result.alreadyCancelled) {
        await ctx.reply("Эта запись уже была отменена ранее.");
      } else if (result.reason === "past_appointment") {
        await ctx.reply("Эту запись уже нельзя отменить, она в прошлом.");
      } else if (result.reason === "client_not_found") {
        await ctx.reply("Не получилось найти твой профиль. Попробуй ещё раз позже.");
      } else if (result.reason === "appointment_not_found") {
        await ctx.reply("Не получилось найти эту запись. Возможно, она уже неактуальна.");
      } else {
        await ctx.reply("Не получилось отменить запись. Возможно, она уже неактуальна.");
      }
    } catch (error) {
      console.error("[TelegramBookingBot] Error in cancel handler", {
        error,
        chatId,
        userId,
        appointmentId,
      });
      await ctx.reply("Что-то пошло не так при отмене записи. Попробуй ещё раз позже.");
    }
  });

  async function handleSlotSelect(ctx: TelegrafContext, slotData: string) {
    try {
      const [startTime, endTime, masterIdStr] = slotData.split("|");
      const masterId = parseInt(masterIdStr, 10);

      const session = getSession(ctx.chat!.id);
      if (!session.data.serviceId) {
        await ctx.reply("Похоже, мы сбились. Давай начнём запись заново.");
        resetSession(ctx.chat!.id);
        return;
      }

      session.step = "collecting_client";
      session.data.slotStart = startTime;
      session.data.slotEnd = endTime;
      if (!isNaN(masterId)) {
        session.data.masterId = masterId;
      }
      setSession(ctx.chat!.id, session);

      console.log("[TelegramBookingBot] Slot selected", { chatId: ctx.chat?.id, startTime, masterId });

      await ctx.reply("Отлично! Теперь нужны твои данные для записи.\n\nНапиши номер телефона в формате +79991234567 или нажми кнопку:", {
        reply_markup: {
          keyboard: [
            [
              {
                text: "📱 Отправить телефон",
                request_contact: true,
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
    } catch (error) {
      console.error("[TelegramBookingBot] Error in booking flow", { error, step: "selecting_slot", chatId: ctx.chat?.id });
      await ctx.reply("Что-то пошло не так на стороне сервера. Попробуй ещё раз чуть позже.");
    }
  }

  async function handleClientDataComplete(ctx: TelegrafContext, session: SessionState) {
    session.step = "confirming";
    setSession(ctx.chat!.id, session);

    const dateTime = formatDateTime(session.data.slotStart!);
    const summary = `📋 Подтверждение записи:\n\n` +
      `Услуга: ${session.data.serviceName}\n` +
      `Мастер: ${session.data.masterName}\n` +
      `Дата и время: ${dateTime}\n` +
      `Имя: ${session.data.clientName}\n` +
      `Телефон: ${session.data.clientPhone}`;

    await ctx.reply(summary, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Подтвердить", callback_data: "confirm:yes" }],
          [{ text: "❌ Отменить", callback_data: "confirm:cancel" }],
        ],
      },
    });
  }

  async function handleConfirmBooking(ctx: TelegrafContext, caller: any, tenantId: number) {
    const session = getSession(ctx.chat!.id);
    try {
      if (
        !session.data.serviceId ||
        session.data.masterId === undefined ||
        !session.data.slotStart ||
        !session.data.clientName ||
        !session.data.clientPhone
      ) {
        await ctx.reply("Похоже, мы сбились. Давай начнём запись заново.");
        resetSession(ctx.chat!.id);
        return;
      }

      const chatId = ctx.chat?.id?.toString();
      const userId = ctx.from?.id?.toString();
      const username = ctx.from?.username;

      const result = await caller.publicBooking.createBooking({
        tenantId,
        client: {
          name: session.data.clientName,
          phone: session.data.clientPhone,
          whatsappPhone: session.data.clientWhatsapp || session.data.clientPhone,
        },
        serviceId: session.data.serviceId,
        masterId: session.data.masterId!,
        startTime: session.data.slotStart,
        telegramChatId: chatId,
        telegramUserId: userId,
        telegramUsername: username,
      });

      const dateTime = formatDateTime(result.startTime);
      await ctx.reply(
        `✅ Готово, запись создана!\n\n${session.data.serviceName} к ${session.data.masterName} на ${dateTime}.\n\nЕсли нужно будет перенести или отменить — просто напиши мне сюда, и мы разберёмся.`,
        {
          reply_markup: {
            remove_keyboard: true,
          },
        }
      );

      console.log("[TelegramBookingBot] Booking created", {
        chatId: ctx.chat?.id,
        userId,
        clientId: result.appointmentId,
        appointmentId: result.appointmentId,
        serviceId: session.data.serviceId,
        masterId: session.data.masterId,
        startTime: result.startTime,
      });

      resetSession(ctx.chat!.id);
    } catch (error: any) {
      if (error.code === "CONFLICT") {
        console.warn("[TelegramBookingBot] Slot conflict", {
          chatId: ctx.chat?.id,
          masterId: session.data.masterId,
          startTime: session.data.slotStart,
        });
        await ctx.reply("Этот слот уже занят.\n\nПопробуй выбрать другое время или другого мастера.", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "◀️ Выбрать другое время", callback_data: `date:${session.data.dateISO || ""}` }],
              [{ text: "❌ Отменить", callback_data: "confirm:cancel" }],
            ],
          },
        });
        session.step = "choosing_slot";
        setSession(ctx.chat!.id, session);
      } else {
        console.error("[TelegramBookingBot] Error in booking flow", {
          error,
          step: "creating_booking",
          chatId: ctx.chat?.id,
        });
        await ctx.reply("Что-то пошло не так на стороне сервера. Попробуй ещё раз чуть позже.");
        resetSession(ctx.chat!.id);
      }
    }
  }

  bot.launch().then(() => {
    console.log("[TelegramBookingBot] Bot started");
  }).catch((error) => {
    console.error("[TelegramBookingBot] Failed to start bot:", error);
  });

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

