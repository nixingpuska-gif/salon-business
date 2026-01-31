import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { appointments, services } from "../../drizzle/schema";
import { eq, and, gte, lte, lt, gt, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

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

export const appointmentsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          date: z.string().optional(),
          from: z.string().optional(),
          to: z.string().optional(),
          masterId: z.number().int().positive().optional(),
          status: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      let conditions = [eq(appointments.tenantId, tenantId)];

      if (input?.date) {
        const dateStart = new Date(input.date);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(input.date);
        dateEnd.setHours(23, 59, 59, 999);
        conditions.push(gte(appointments.startTime, dateStart));
        conditions.push(lte(appointments.startTime, dateEnd));
      }

      if (input?.from) {
        conditions.push(gte(appointments.startTime, new Date(input.from)));
      }

      if (input?.to) {
        conditions.push(lte(appointments.startTime, new Date(input.to)));
      }

      if (input?.masterId) {
        conditions.push(eq(appointments.masterId, input.masterId));
      }

      if (input?.status) {
        conditions.push(eq(appointments.status, input.status));
      }

      const result = await db
        .select()
        .from(appointments)
        .where(and(...conditions))
        .orderBy(appointments.startTime);

      return result;
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.number().int().positive(),
        serviceId: z.number().int().positive(),
        masterId: z.number().int().positive(),
        startTime: z.string().datetime(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;

      const [service] = await db
        .select()
        .from(services)
        .where(eq(services.id, input.serviceId))
        .limit(1);

      if (!service || service.tenantId !== tenantId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });
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
          message: "У мастера уже есть запись в это время",
        });
      }

      const insertResult = await db
        .insert(appointments)
        .values({
          tenantId,
          clientId: input.clientId,
          serviceId: input.serviceId,
          masterId: input.masterId,
          startTime,
          endTime,
          status: input.status || "scheduled",
        });

      const insertId = Number(insertResult[0].insertId);
      const [result] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, insertId))
        .limit(1);

      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        clientId: z.number().int().positive().optional(),
        serviceId: z.number().int().positive().optional(),
        masterId: z.number().int().positive().optional(),
        startTime: z.string().datetime().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const { id, ...updateData } = input;

      const [existing] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, id))
        .limit(1);

      if (!existing || existing.tenantId !== tenantId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" });
      }

      const finalUpdateData: any = { ...updateData };

      if (updateData.startTime || updateData.serviceId) {
        const serviceId = updateData.serviceId || existing.serviceId;
        const [service] = await db
          .select()
          .from(services)
          .where(eq(services.id, serviceId))
          .limit(1);

        if (!service) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });
        }

        const startTime = updateData.startTime
          ? new Date(updateData.startTime)
          : existing.startTime;
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + service.durationMinutes);

        finalUpdateData.startTime = startTime;
        finalUpdateData.endTime = endTime;
      }

      const masterId = updateData.masterId || existing.masterId;
      const finalStartTime = finalUpdateData.startTime || existing.startTime;
      const finalEndTime = finalUpdateData.endTime || existing.endTime;

      const hasConflict = await hasAppointmentConflict({
        tenantId,
        masterId,
        startTime: finalStartTime,
        endTime: finalEndTime,
        excludeId: id,
      });

      if (hasConflict) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "У мастера уже есть запись в это время",
        });
      }

      await db
        .update(appointments)
        .set(finalUpdateData)
        .where(eq(appointments.id, id));

      const [updated] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, id))
        .limit(1);

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      await db
        .delete(appointments)
        .where(and(eq(appointments.id, input.id), eq(appointments.tenantId, tenantId)));
      return { success: true };
    }),
});
