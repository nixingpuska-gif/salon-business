import { db } from "../db";
import { whatsappSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export async function getWhatsAppSettings(tenantId: number) {
  const [row] = await db
    .select()
    .from(whatsappSettings)
    .where(eq(whatsappSettings.tenantId, tenantId))
    .limit(1);

  return row ?? null;
}
