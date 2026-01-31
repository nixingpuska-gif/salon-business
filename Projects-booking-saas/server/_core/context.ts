import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { verifyJWT } from "./oauth";
import { db } from "../db";
import { owners } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export async function createContext({ req, res }: CreateExpressContextOptions) {
  const token = req.cookies?.auth_token || req.headers.authorization?.replace("Bearer ", "");
  let user = null;
  let tenantId = null;

  if (token) {
    try {
      const payload = await verifyJWT(token);
      const userId = typeof payload.id === "number" ? payload.id : parseInt(String(payload.id), 10);

      if (userId && !isNaN(userId)) {
        const [owner] = await db
          .select()
          .from(owners)
          .where(eq(owners.id, userId))
          .limit(1);

        if (owner) {
          user = {
            id: owner.id,
            tenantId: owner.tenantId,
            email: owner.email,
          };
          tenantId = owner.tenantId;
        }
      }
    } catch (err) {
      console.error("JWT verification failed:", err);
    }
  }

  return { user, tenantId, req, res };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

