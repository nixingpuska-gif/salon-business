import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { services } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const servicesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const result = await db
      .select()
      .from(services)
      .where(eq(services.tenantId, tenantId))
      .orderBy(desc(services.createdAt));
    return result;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        durationMinutes: z.number().int().positive(),
        price: z.number().int().nonnegative().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const insertResult = await db
        .insert(services)
        .values({
          tenantId,
          name: input.name,
          durationMinutes: input.durationMinutes,
          price: input.price,
          description: input.description,
        });
      const insertId = Number(insertResult[0].insertId);
      const [result] = await db
        .select()
        .from(services)
        .where(eq(services.id, insertId))
        .limit(1);
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(255).optional(),
        durationMinutes: z.number().int().positive().optional(),
        price: z.number().int().nonnegative().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const { id, ...updateData } = input;

      const [existing] = await db
        .select()
        .from(services)
        .where(eq(services.id, id))
        .limit(1);

      if (!existing || existing.tenantId !== tenantId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });
      }

      await db
        .update(services)
        .set(updateData)
        .where(eq(services.id, id));

      const [updated] = await db
        .select()
        .from(services)
        .where(eq(services.id, id))
        .limit(1);

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      await db
        .delete(services)
        .where(eq(services.id, input.id));
      return { success: true };
    }),
});
