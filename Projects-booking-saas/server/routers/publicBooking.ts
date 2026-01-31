import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import {
  appointments,
  clients,
  services,
  masters,
  owners,
} from "../../drizzle/schema";
import { eq, and, gte, lte, lt, gt, ne, inArray, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { env } from "../_core/env";

async function hasAppointmentConflict(params: {
  tenantId: number;
  masterId: number;
  startTime: Date;
  endTime: Date;
  excludeId?: number;
}): Promise<boolean> {
  const conditions = [
    eq(appointments.tenantId, params.tenantId),
    eq(appointments.masterId, params.masterId),
    lt(appointments.startTime, params.endTime),
    gt(appointments.endTime, params.startTime),
    eq(appointments.status, "scheduled"),
  ];

  if (params.excludeId) {
    conditions.push(ne(appointments.id, params.excludeId));
  }

  const conflicts = await db
    .select()
    .from(appointments)
    .where(and(...conditions))
    .limit(1);

  return conflicts.length > 0;
}

async function getTenantIdBySlug(
  slug: string | undefined
): Promise<number | null> {
  if (!slug) {
    return null;
  }
  const [owner] = await db
    .select()
    .from(owners)
    .where(eq(owners.email, slug))
    .limit(1);
  return owner ? owner.tenantId : null;
}

async function resolveTenantId(input: {
  tenantSlug?: string;
  tenantId?: number;
}): Promise<number> {
  if (input.tenantId) {
    return input.tenantId;
  }
  if (input.tenantSlug) {
    const tenantId = await getTenantIdBySlug(input.tenantSlug);
    if (!tenantId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
    }
    return tenantId;
  }
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "tenantId or tenantSlug is required",
  });
}

function generateTimeSlots(
  startHour: number,
  endHour: number,
  durationMinutes: number,
  existingAppointments: Array<{ startTime: Date; endTime: Date }>,
  date: Date
): Array<{ startTime: Date; endTime: Date }> {
  const slots: Array<{ startTime: Date; endTime: Date }> = [];
  const slotStart = new Date(date);
  slotStart.setHours(startHour, 0, 0, 0);
  const slotEnd = new Date(date);
  slotEnd.setHours(endHour, 0, 0, 0);

  while (slotStart < slotEnd) {
    const slotEndTime = new Date(slotStart);
    slotEndTime.setMinutes(slotEndTime.getMinutes() + durationMinutes);

    if (slotEndTime <= slotEnd) {
      const hasConflict = existingAppointments.some(
        (apt) =>
          (slotStart >= apt.startTime && slotStart < apt.endTime) ||
          (slotEndTime > apt.startTime && slotEndTime <= apt.endTime) ||
          (slotStart <= apt.startTime && slotEndTime >= apt.endTime)
      );

      if (!hasConflict) {
        slots.push({
          startTime: new Date(slotStart),
          endTime: new Date(slotEndTime),
        });
      }
    }

    slotStart.setMinutes(slotStart.getMinutes() + durationMinutes);
  }

  return slots;
}

export const publicBookingRouter = router({
  getConfig: publicProcedure
    .input(
      z.object({
        tenantSlug: z.string().optional(),
        tenantId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      const tenantId = await resolveTenantId(input);

      const [owner] = await db
        .select()
        .from(owners)
        .where(eq(owners.tenantId, tenantId))
        .limit(1);

      return {
        businessName: owner?.email
          ? `Салон ${owner.email.split("@")[0]}`
          : "Салон красоты",
        timezone: "Europe/Moscow",
        workingDays: [1, 2, 3, 4, 5, 6, 0],
        workingHours: {
          start: 10,
          end: 20,
        },
      };
    }),

  listServices: publicProcedure
    .input(
      z.object({
        tenantSlug: z.string().optional(),
        tenantId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      const tenantId = await resolveTenantId(input);

      const result = await db
        .select({
          id: services.id,
          name: services.name,
          durationMinutes: services.durationMinutes,
          price: services.price,
          description: services.description,
        })
        .from(services)
        .where(eq(services.tenantId, tenantId));

      return result;
    }),

  listMasters: publicProcedure
    .input(
      z.object({
        tenantSlug: z.string().optional(),
        tenantId: z.number().int().positive().optional(),
        serviceId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      const tenantId = await resolveTenantId(input);

      const result = await db
        .select({
          id: masters.id,
          name: masters.name,
        })
        .from(masters)
        .where(eq(masters.tenantId, tenantId));

      return result;
    }),

  getAvailableSlots: publicProcedure
    .input(
      z.object({
        tenantSlug: z.string().optional(),
        tenantId: z.number().int().positive().optional(),
        serviceId: z.number().int().positive(),
        masterId: z.number().int().positive().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .query(async ({ input }) => {
      const tenantId = await resolveTenantId(input);

      const [service] = await db
        .select()
        .from(services)
        .where(
          and(eq(services.id, input.serviceId), eq(services.tenantId, tenantId))
        )
        .limit(1);

      if (!service) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service not found",
        });
      }

      const targetDate = new Date(input.date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const mastersList = input.masterId
        ? await db
            .select()
            .from(masters)
            .where(
              and(
                eq(masters.id, input.masterId),
                eq(masters.tenantId, tenantId)
              )
            )
        : await db.select().from(masters).where(eq(masters.tenantId, tenantId));

      if (mastersList.length === 0) {
        return [];
      }

      const slots: Array<{
        startTime: string;
        endTime: string;
        masterId: number;
      }> = [];

      for (const master of mastersList) {
        const existingAppointments = await db
          .select({
            startTime: appointments.startTime,
            endTime: appointments.endTime,
          })
          .from(appointments)
          .where(
            and(
              eq(appointments.tenantId, tenantId),
              eq(appointments.masterId, master.id),
              gte(appointments.startTime, targetDate),
              lt(appointments.startTime, nextDay),
              eq(appointments.status, "scheduled")
            )
          );

        const timeSlots = generateTimeSlots(
          10,
          20,
          service.durationMinutes,
          existingAppointments.map((apt) => ({
            startTime: apt.startTime,
            endTime: apt.endTime,
          })),
          targetDate
        );

        for (const slot of timeSlots) {
          slots.push({
            startTime: slot.startTime.toISOString(),
            endTime: slot.endTime.toISOString(),
            masterId: master.id,
          });
        }
      }

      return slots.sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    }),

  createBooking: publicProcedure
    .input(
      z.object({
        tenantSlug: z.string().optional(),
        tenantId: z.number().int().positive().optional(),
        client: z.object({
          name: z.string().min(1).max(255),
          phone: z.string().max(50).optional(),
          whatsappPhone: z.string().max(50).optional(),
        }),
        serviceId: z.number().int().positive(),
        masterId: z.number().int().positive(),
        startTime: z.string().datetime(),
        telegramChatId: z.string().max(64).optional(),
        telegramUserId: z.string().max(64).optional(),
        telegramUsername: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const tenantId = await resolveTenantId(input);

      const [service] = await db
        .select()
        .from(services)
        .where(
          and(eq(services.id, input.serviceId), eq(services.tenantId, tenantId))
        )
        .limit(1);

      if (!service) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service not found",
        });
      }

      const [master] = await db
        .select()
        .from(masters)
        .where(
          and(eq(masters.id, input.masterId), eq(masters.tenantId, tenantId))
        )
        .limit(1);

      if (!master) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Master not found" });
      }

      const startTime = new Date(input.startTime);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + service.durationMinutes);

      const hasConflict = await hasAppointmentConflict({
        tenantId,
        masterId: input.masterId,
        startTime,
        endTime,
      });

      if (hasConflict) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Этот слот уже занят. Пожалуйста, выберите другое время.",
        });
      }

      let client = null;

      if (input.client.phone || input.client.whatsappPhone) {
        const searchPhone = input.client.phone || input.client.whatsappPhone;
        const [existingClient] = await db
          .select()
          .from(clients)
          .where(
            and(eq(clients.tenantId, tenantId), eq(clients.phone, searchPhone!))
          )
          .limit(1);

        if (existingClient) {
          client = existingClient;
        }
      }

      if (!client && input.telegramChatId) {
        const [existingClient] = await db
          .select()
          .from(clients)
          .where(
            and(
              eq(clients.tenantId, tenantId),
              eq(clients.telegramChatId, input.telegramChatId)
            )
          )
          .limit(1);

        if (existingClient) {
          client = existingClient;
        }
      }

      if (client) {
        const updateData: any = {
          name: input.client.name,
        };

        if (input.client.phone) {
          updateData.phone = input.client.phone;
        }
        if (input.client.whatsappPhone) {
          updateData.whatsappPhone = input.client.whatsappPhone;
        }
        if (input.telegramChatId && !client.telegramChatId) {
          updateData.telegramChatId = input.telegramChatId;
        }
        if (input.telegramUserId && !client.telegramUserId) {
          updateData.telegramUserId = input.telegramUserId;
        }
        if (input.telegramUsername && !client.telegramUsername) {
          updateData.telegramUsername = input.telegramUsername;
        }

        await db
          .update(clients)
          .set(updateData)
          .where(eq(clients.id, client.id));
      }

      if (!client) {
        const insertResult = await db.insert(clients).values({
          tenantId,
          name: input.client.name,
          phone: input.client.phone,
          whatsappPhone: input.client.whatsappPhone,
          telegramChatId: input.telegramChatId,
          telegramUserId: input.telegramUserId,
          telegramUsername: input.telegramUsername,
        });

        const insertId = Number(insertResult[0].insertId);
        const [newClient] = await db
          .select()
          .from(clients)
          .where(eq(clients.id, insertId))
          .limit(1);

        if (!newClient) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create client",
          });
        }

        client = newClient;
      } else {
        const [updatedClient] = await db
          .select()
          .from(clients)
          .where(eq(clients.id, client.id))
          .limit(1);
        if (updatedClient) {
          client = updatedClient;
        }
      }

      const insertResult = await db.insert(appointments).values({
        tenantId,
        clientId: client.id,
        serviceId: input.serviceId,
        masterId: input.masterId,
        startTime,
        endTime,
        status: "scheduled",
      });

      const insertId = Number(insertResult[0].insertId);
      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, insertId))
        .limit(1);

      if (!appointment) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create appointment",
        });
      }

      return {
        success: true,
        appointmentId: appointment.id,
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
      };
    }),

  listClientUpcoming: publicProcedure
    .input(
      z.object({
        tenantId: z.number().int().positive().optional(),
        tenantSlug: z.string().optional(),
        telegramChatId: z.string().optional(),
        telegramUserId: z.string().optional(),
        phone: z.string().optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      if (!input.telegramChatId && !input.telegramUserId && !input.phone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "At least one client identifier (telegramChatId, telegramUserId, or phone) is required",
        });
      }

      const tenantId = input.tenantId || env.BOOKING_TENANT_ID;
      if (!tenantId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "tenantId is required",
        });
      }

      let client = null;

      if (input.telegramChatId) {
        const [foundClient] = await db
          .select()
          .from(clients)
          .where(
            and(
              eq(clients.tenantId, tenantId),
              eq(clients.telegramChatId, input.telegramChatId)
            )
          )
          .limit(1);
        if (foundClient) {
          client = foundClient;
        }
      }

      if (!client && input.telegramUserId) {
        const [foundClient] = await db
          .select()
          .from(clients)
          .where(
            and(
              eq(clients.tenantId, tenantId),
              eq(clients.telegramUserId, input.telegramUserId)
            )
          )
          .limit(1);
        if (foundClient) {
          client = foundClient;
        }
      }

      if (!client && input.phone) {
        const [foundClient] = await db
          .select()
          .from(clients)
          .where(
            and(eq(clients.tenantId, tenantId), eq(clients.phone, input.phone))
          )
          .limit(1);
        if (foundClient) {
          client = foundClient;
        }
      }

      if (!client) {
        return [];
      }

      const now = new Date();
      const fromDate = input.from ? new Date(input.from) : now;
      const toDate = input.to
        ? new Date(input.to)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const clientAppointments = await db
        .select({
          id: appointments.id,
          startTime: appointments.startTime,
          endTime: appointments.endTime,
          status: appointments.status,
          serviceId: appointments.serviceId,
          masterId: appointments.masterId,
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            eq(appointments.clientId, client.id),
            gte(appointments.startTime, fromDate),
            lte(appointments.startTime, toDate),
            eq(appointments.status, "scheduled")
          )
        )
        .orderBy(asc(appointments.startTime))
        .limit(input.limit);

      if (clientAppointments.length === 0) {
        return [];
      }

      const serviceIds = [
        ...new Set(clientAppointments.map((apt) => apt.serviceId)),
      ];
      const masterIds = [
        ...new Set(clientAppointments.map((apt) => apt.masterId)),
      ];

      const servicesList = await db
        .select()
        .from(services)
        .where(
          and(eq(services.tenantId, tenantId), inArray(services.id, serviceIds))
        );

      const mastersList = await db
        .select()
        .from(masters)
        .where(
          and(eq(masters.tenantId, tenantId), inArray(masters.id, masterIds))
        );

      return clientAppointments.map((apt) => {
        const service = servicesList.find((s) => s.id === apt.serviceId);
        const master = mastersList.find((m) => m.id === apt.masterId);

        return {
          id: apt.id,
          startTime: (apt.startTime as Date).toISOString(),
          endTime: (apt.endTime as Date).toISOString(),
          status: apt.status,
          service: service
            ? {
                id: service.id,
                name: service.name,
                price: service.price ? Number(service.price) : null,
                durationMinutes: service.durationMinutes,
              }
            : null,
          master: master
            ? {
                id: master.id,
                name: master.name,
              }
            : null,
        };
      });
    }),

  cancelBooking: publicProcedure
    .input(
      z.object({
        tenantId: z.number().int().positive().optional(),
        appointmentId: z.number().int().positive(),
        telegramChatId: z.string().optional(),
        telegramUserId: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!input.telegramChatId && !input.telegramUserId && !input.phone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "At least one client identifier (telegramChatId, telegramUserId, or phone) is required",
        });
      }

      const tenantId = input.tenantId || env.BOOKING_TENANT_ID;
      if (!tenantId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "tenantId is required",
        });
      }

      let client = null;

      if (input.telegramChatId) {
        const [foundClient] = await db
          .select()
          .from(clients)
          .where(
            and(
              eq(clients.tenantId, tenantId),
              eq(clients.telegramChatId, input.telegramChatId)
            )
          )
          .limit(1);
        if (foundClient) {
          client = foundClient;
        }
      }

      if (!client && input.telegramUserId) {
        const [foundClient] = await db
          .select()
          .from(clients)
          .where(
            and(
              eq(clients.tenantId, tenantId),
              eq(clients.telegramUserId, input.telegramUserId)
            )
          )
          .limit(1);
        if (foundClient) {
          client = foundClient;
        }
      }

      if (!client && input.phone) {
        const [foundClient] = await db
          .select()
          .from(clients)
          .where(
            and(eq(clients.tenantId, tenantId), eq(clients.phone, input.phone))
          )
          .limit(1);
        if (foundClient) {
          client = foundClient;
        }
      }

      if (!client) {
        return {
          success: false,
          reason: "client_not_found" as const,
        };
      }

      const [appointment] = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.id, input.appointmentId),
            eq(appointments.tenantId, tenantId),
            eq(appointments.clientId, client.id)
          )
        )
        .limit(1);

      if (!appointment) {
        return {
          success: false,
          reason: "appointment_not_found" as const,
        };
      }

      if (appointment.status === "cancelled") {
        return {
          success: true,
          alreadyCancelled: true,
        };
      }

      const now = new Date();
      const startTime = appointment.startTime as Date;
      if (startTime < now) {
        return {
          success: false,
          reason: "past_appointment" as const,
        };
      }

      await db
        .update(appointments)
        .set({ status: "cancelled" })
        .where(eq(appointments.id, input.appointmentId));

      return {
        success: true,
      };
    }),
});
