import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { masters } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const mastersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const result = await db
      .select()
      .from(masters)
      .where(eq(masters.tenantId, tenantId))
      .orderBy(desc(masters.createdAt));
    return result;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        phone: z.string().max(50).optional(),
        email: z.string().email().max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const insertResult = await db
        .insert(masters)
        .values({
          tenantId,
          name: input.name,
          phone: input.phone,
          email: input.email,
        });
      const insertId = Number(insertResult[0].insertId);
      const [result] = await db
        .select()
        .from(masters)
        .where(eq(masters.id, insertId))
        .limit(1);
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(255).optional(),
        phone: z.string().max(50).optional(),
        email: z.string().email().max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const { id, ...updateData } = input;

      const [existing] = await db
        .select()
        .from(masters)
        .where(eq(masters.id, id))
        .limit(1);

      if (!existing || existing.tenantId !== tenantId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Master not found" });
      }

      await db
        .update(masters)
        .set(updateData)
        .where(eq(masters.id, id));

      const [updated] = await db
        .select()
        .from(masters)
        .where(eq(masters.id, id))
        .limit(1);

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      await db
        .delete(masters)
        .where(eq(masters.id, input.id));
      return { success: true };
    }),
});
