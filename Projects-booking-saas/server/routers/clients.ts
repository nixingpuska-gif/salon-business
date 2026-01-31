import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { clients } from "../../drizzle/schema";
import { eq, desc, or, like, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const clientsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const conditions = [eq(clients.tenantId, tenantId)];

      if (input?.search) {
        conditions.push(
          or(
            like(clients.name, `%${input.search}%`),
            like(clients.phone, `%${input.search}%`)
          )
        );
      }

      const query = db
        .select()
        .from(clients)
        .where(and(...conditions));

      const result = await query.orderBy(desc(clients.createdAt));
      return result;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        phone: z.string().max(50).optional(),
        chatId: z.string().max(255).optional(),
        whatsappPhone: z.string().max(50).optional(),
        preferredChannel: z.enum(["telegram", "whatsapp", "auto"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const insertResult = await db
        .insert(clients)
        .values({
          tenantId,
          name: input.name,
          phone: input.phone,
          chatId: input.chatId,
          whatsappPhone: input.whatsappPhone,
          preferredChannel: input.preferredChannel,
        });
      const insertId = Number(insertResult[0].insertId);
      const [result] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, insertId))
        .limit(1);
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(255).optional(),
        phone: z.string().max(50).optional(),
        chatId: z.string().max(255).optional(),
        whatsappPhone: z.string().max(50).optional(),
        preferredChannel: z.enum(["telegram", "whatsapp", "auto"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      const { id, ...updateData } = input;

      const [existing] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, id))
        .limit(1);

      if (!existing || existing.tenantId !== tenantId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      await db
        .update(clients)
        .set(updateData)
        .where(eq(clients.id, id));

      const [updated] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, id))
        .limit(1);

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      await db
        .delete(clients)
        .where(eq(clients.id, input.id));
      return { success: true };
    }),
});
