import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { owners } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { env } from "../_core/env";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("[Auth] Login attempt for email:", input.email);
        const email = input.email.toLowerCase().trim();

        console.log("[Auth] Checking database connection...");
        let [owner] = await db
          .select()
          .from(owners)
          .where(eq(owners.email, email))
          .limit(1);
        console.log("[Auth] Owner found:", owner ? "yes" : "no");

        if (!owner) {
          console.log("[Auth] Creating new owner...");
          let existingOwners;
          try {
            existingOwners = await db.select().from(owners).limit(1);
            console.log("[Auth] Existing owners count:", existingOwners.length);
          } catch (dbError) {
            console.error("[Auth] Error querying existing owners:", dbError);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Ошибка подключения к базе данных. Проверь DATABASE_URL и убедись, что MySQL запущен.",
            });
          }
          
          const newTenantId = existingOwners.length > 0 ? existingOwners[0]!.tenantId : 1;
          console.log("[Auth] Using tenantId:", newTenantId);

          let insertResult;
          try {
            insertResult = await db
              .insert(owners)
              .values({
                tenantId: newTenantId,
                email,
              });
            console.log("[Auth] Owner inserted, ID:", insertResult[0].insertId);
          } catch (insertError) {
            console.error("[Auth] Error inserting owner:", insertError);
            if (insertError instanceof Error) {
              if (insertError.message.includes("Table") && insertError.message.includes("doesn't exist")) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Таблица owners не существует. Запусти: pnpm db:push",
                });
              }
              if (insertError.message.includes("Duplicate entry")) {
                // Попробуем получить существующего владельца
                const [existing] = await db
                  .select()
                  .from(owners)
                  .where(eq(owners.email, email))
                  .limit(1);
                if (existing) {
                  owner = existing;
                  console.log("[Auth] Found existing owner after duplicate error");
                } else {
                  throw insertError;
                }
              } else {
                throw insertError;
              }
            } else {
              throw insertError;
            }
          }

          if (insertResult && insertResult[0] && insertResult[0].insertId) {
            const insertId = Number(insertResult[0].insertId);
            console.log("[Auth] Fetching new owner with ID:", insertId);
            const [newOwner] = await db
              .select()
              .from(owners)
              .where(eq(owners.id, insertId))
              .limit(1);

            if (!newOwner) {
              console.error("[Auth] Failed to create owner after insert");
              throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Не удалось создать аккаунт. Попробуй ещё раз." });
            }

            owner = newOwner;
            console.log("[Auth] New owner created successfully");
          }
        }

        if (!owner) {
          console.error("[Auth] Owner is null after all operations");
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Не удалось получить данные пользователя" });
        }

        console.log("[Auth] Creating JWT token for owner:", owner.id);
        const payload = {
          id: owner.id,
          tenantId: owner.tenantId,
          email: owner.email,
        };

        if (!env.JWT_SECRET) {
          console.error("[Auth] JWT_SECRET is not set");
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Ошибка конфигурации сервера: JWT_SECRET не установлен" });
        }

        let token;
        try {
          token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: "30d" });
          console.log("[Auth] JWT token created successfully");
        } catch (jwtError) {
          console.error("[Auth] Error creating JWT:", jwtError);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Ошибка при создании токена авторизации" });
        }

        ctx.res.cookie("auth_token", token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 30 * 24 * 60 * 60 * 1000,
          path: "/",
        });

        return {
          id: owner.id,
          email: owner.email,
          tenantId: owner.tenantId,
        };
      } catch (error) {
        console.error("[Auth] Login error:", error);
        
        // Более понятные сообщения об ошибках
        if (error instanceof Error) {
          if (error.message.includes("ECONNREFUSED") || error.message.includes("connect")) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Не удалось подключиться к базе данных. Проверь DATABASE_URL в .env",
            });
          }
          if (error.message.includes("Table") && error.message.includes("doesn't exist")) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Таблицы в БД не созданы. Запусти: pnpm db:push",
            });
          }
        }
        
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Ошибка при входе. Проверь логи сервера.",
        });
      }
    }),

  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }

    return {
      id: ctx.user.id,
      email: ctx.user.email,
      tenantId: ctx.user.tenantId,
    };
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie("auth_token", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return { success: true };
  }),

  // Утилита для создания тестового аккаунта (только в dev)
  createTestAccount: publicProcedure
    .input(
      z.object({
        email: z.string().email().default("admin@test.com"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (process.env.NODE_ENV === "production") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not available in production" });
      }

      const email = input.email.toLowerCase().trim();

      let [owner] = await db
        .select()
        .from(owners)
        .where(eq(owners.email, email))
        .limit(1);

      if (owner) {
        return {
          success: true,
          message: `Аккаунт ${email} уже существует`,
          owner: {
            id: owner.id,
            email: owner.email,
            tenantId: owner.tenantId,
          },
        };
      }

      const existingOwners = await db.select().from(owners).limit(1);
      const newTenantId = existingOwners.length > 0 ? existingOwners[0]!.tenantId : 1;

      const insertResult = await db
        .insert(owners)
        .values({
          tenantId: newTenantId,
          email,
        });

      const insertId = Number(insertResult[0].insertId);
      const [newOwner] = await db
        .select()
        .from(owners)
        .where(eq(owners.id, insertId))
        .limit(1);

      if (!newOwner) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create owner" });
      }

      return {
        success: true,
        message: `Тестовый аккаунт ${email} создан!`,
        owner: {
          id: newOwner.id,
          email: newOwner.email,
          tenantId: newOwner.tenantId,
        },
      };
    }),
});
