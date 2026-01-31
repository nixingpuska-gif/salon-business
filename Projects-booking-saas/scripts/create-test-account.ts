import { db } from "../server/db.js";
import { owners } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

async function createTestAccount() {
  const testEmail = "admin@test.com";
  
  try {
    // Проверяем, существует ли уже такой аккаунт
    const [existing] = await db
      .select()
      .from(owners)
      .where(eq(owners.email, testEmail))
      .limit(1);

    if (existing) {
      console.log(`✅ Аккаунт ${testEmail} уже существует!`);
      console.log(`   ID: ${existing.id}`);
      console.log(`   Tenant ID: ${existing.tenantId}`);
      return;
    }

    // Создаём новый аккаунт
    const existingOwners = await db.select().from(owners).limit(1);
    const newTenantId = existingOwners.length > 0 ? existingOwners[0]!.tenantId : 1;

    const insertResult = await db
      .insert(owners)
      .values({
        tenantId: newTenantId,
        email: testEmail,
      });

    const insertId = Number(insertResult[0].insertId);
    const [newOwner] = await db
      .select()
      .from(owners)
      .where(eq(owners.id, insertId))
      .limit(1);

    if (newOwner) {
      console.log(`✅ Тестовый аккаунт создан!`);
      console.log(`   Email: ${testEmail}`);
      console.log(`   ID: ${newOwner.id}`);
      console.log(`   Tenant ID: ${newOwner.tenantId}`);
      console.log(`\n📝 Для входа используй email: ${testEmail}`);
    } else {
      console.error("❌ Не удалось создать аккаунт");
    }
  } catch (error) {
    console.error("❌ Ошибка при создании аккаунта:", error);
    process.exit(1);
  }

  process.exit(0);
}

createTestAccount();

