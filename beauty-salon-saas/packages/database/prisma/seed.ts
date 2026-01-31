// Seed database with sample data
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function seed() {
  console.log('рџЊ± Seeding database...\n');

  try {
    // Create sample tenant (RLS requires tenant context + service role bypass)
    console.log('Creating sample tenant...');
    const tenantId = randomUUID();
    await prisma.$executeRaw`SELECT set_config('app.role', 'service_role', false)`;
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}::text, false)`;
    const tenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Beauty Studio Sample',
        subdomain: 'sample-studio',
        timezone: 'Europe/Moscow',
        currency: 'RUB',
        language: 'ru',
        settings: {
          theme: 'light',
          notifications: true,
        },
      },
    });
    console.log(`вњ… Tenant created: ${tenant.name} (${tenant.id})\n`);

    // Keep tenant context for subsequent inserts
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}::text, false)`;

    // Create sample staff
    console.log('Creating sample staff...');
    const owner = await prisma.staff.create({
      data: {
        tenantId: tenant.id,
        name: 'РђРЅРЅР° РРІР°РЅРѕРІР°',
        email: 'owner@sample-studio.com',
        phone: '+79001234567',
        role: 'owner',
        skills: {
          specialization: ['РЎС‚СЂРёР¶РєРё', 'РћРєСЂР°С€РёРІР°РЅРёРµ', 'РЈРєР»Р°РґРєРё'],
          experience_years: 10,
        },
      },
    });

    const master1 = await prisma.staff.create({
      data: {
        tenantId: tenant.id,
        name: 'РњР°СЂРёСЏ РџРµС‚СЂРѕРІР°',
        email: 'maria@sample-studio.com',
        phone: '+79001234568',
        role: 'staff',
        skills: {
          specialization: ['РњР°РЅРёРєСЋСЂ', 'РџРµРґРёРєСЋСЂ', 'РќР°СЂР°С‰РёРІР°РЅРёРµ'],
          experience_years: 5,
        },
      },
    });

    const master2 = await prisma.staff.create({
      data: {
        tenantId: tenant.id,
        name: 'Р•Р»РµРЅР° РЎРёРґРѕСЂРѕРІР°',
        email: 'elena@sample-studio.com',
        phone: '+79001234569',
        role: 'staff',
        skills: {
          specialization: ['Р‘СЂРѕРІРё', 'Р РµСЃРЅРёС†С‹', 'РњР°РєРёСЏР¶'],
          experience_years: 3,
        },
      },
    });

    console.log(`вњ… Staff created: 3 members\n`);

    // Create sample services
    console.log('Creating sample services...');
    const haircut = await prisma.service.create({
      data: {
        tenantId: tenant.id,
        name: 'Р–РµРЅСЃРєР°СЏ СЃС‚СЂРёР¶РєР°',
        description: 'РЎС‚СЂРёР¶РєР° Р»СЋР±РѕР№ СЃР»РѕР¶РЅРѕСЃС‚Рё',
        baseDurationMinutes: 60,
        price: 2500,
        currency: 'RUB',
        category: 'РџР°СЂРёРєРјР°С…РµСЂСЃРєРёРµ СѓСЃР»СѓРіРё',
      },
    });

    const coloring = await prisma.service.create({
      data: {
        tenantId: tenant.id,
        name: 'РћРєСЂР°С€РёРІР°РЅРёРµ РІРѕР»РѕСЃ',
        description: 'РџРѕР»РЅРѕРµ РёР»Рё С‡Р°СЃС‚РёС‡РЅРѕРµ РѕРєСЂР°С€РёРІР°РЅРёРµ',
        baseDurationMinutes: 120,
        price: 5000,
        currency: 'RUB',
        category: 'РџР°СЂРёРєРјР°С…РµСЂСЃРєРёРµ СѓСЃР»СѓРіРё',
      },
    });

    const manicure = await prisma.service.create({
      data: {
        tenantId: tenant.id,
        name: 'РњР°РЅРёРєСЋСЂ',
        description: 'РљР»Р°СЃСЃРёС‡РµСЃРєРёР№ РјР°РЅРёРєСЋСЂ СЃ РїРѕРєСЂС‹С‚РёРµРј',
        baseDurationMinutes: 90,
        price: 1500,
        currency: 'RUB',
        category: 'РќРѕРіС‚РµРІРѕР№ СЃРµСЂРІРёСЃ',
      },
    });

    const brows = await prisma.service.create({
      data: {
        tenantId: tenant.id,
        name: 'РћС„РѕСЂРјР»РµРЅРёРµ Р±СЂРѕРІРµР№',
        description: 'РљРѕСЂСЂРµРєС†РёСЏ Рё РѕРєСЂР°С€РёРІР°РЅРёРµ Р±СЂРѕРІРµР№',
        baseDurationMinutes: 45,
        price: 800,
        currency: 'RUB',
        category: 'Р‘СЂРѕРІРё Рё СЂРµСЃРЅРёС†С‹',
      },
    });

    console.log(`вњ… Services created: 4 services\n`);

    // Create duration overrides
    console.log('Creating duration overrides...');
    await prisma.serviceDurationOverride.create({
      data: {
        tenantId: tenant.id,
        serviceId: haircut.id,
        staffId: owner.id,
        durationMinutes: 50, // Owner is faster
      },
    });

    await prisma.serviceDurationOverride.create({
      data: {
        tenantId: tenant.id,
        serviceId: manicure.id,
        staffId: master1.id,
        durationMinutes: 80, // Maria is faster at manicure
      },
    });

    console.log(`вњ… Duration overrides created\n`);

    // Create sample clients
    console.log('Creating sample clients...');
    const client1 = await prisma.client.create({
      data: {
        tenantId: tenant.id,
        phone: '+79101234567',
        name: 'РћР»СЊРіР° РЎРјРёСЂРЅРѕРІР°',
        email: 'olga@example.com',
        channels: {
          telegram_id: '123456789',
        },
        vip: true,
        tags: ['РџРѕСЃС‚РѕСЏРЅРЅС‹Р№ РєР»РёРµРЅС‚', 'VIP'],
      },
    });

    const client2 = await prisma.client.create({
      data: {
        tenantId: tenant.id,
        phone: '+79101234568',
        name: 'РўР°С‚СЊСЏРЅР° РљСѓР·РЅРµС†РѕРІР°',
        channels: {
          whatsapp_id: '79101234568',
        },
        tags: ['РќРѕРІС‹Р№ РєР»РёРµРЅС‚'],
      },
    });

    const client3 = await prisma.client.create({
      data: {
        tenantId: tenant.id,
        phone: '+79101234569',
        name: 'РќР°С‚Р°Р»СЊСЏ Р’РѕР»РєРѕРІР°',
        email: 'natalia@example.com',
        channels: {
          telegram_id: '987654321',
        },
        bonusBalance: 500,
        tags: ['РџРѕСЃС‚РѕСЏРЅРЅС‹Р№ РєР»РёРµРЅС‚'],
      },
    });

    console.log(`вњ… Clients created: 3 clients\n`);

    // Create sample appointments
    console.log('Creating sample appointments...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        clientId: client1.id,
        staffId: owner.id,
        serviceId: haircut.id,
        startAt: tomorrow,
        endAt: new Date(tomorrow.getTime() + 50 * 60000), // 50 min (override)
        status: 'confirmed',
        price: 2500,
        paid: 2500,
      },
    });

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(14, 0, 0, 0);

    await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        clientId: client2.id,
        staffId: master1.id,
        serviceId: manicure.id,
        startAt: nextWeek,
        endAt: new Date(nextWeek.getTime() + 80 * 60000), // 80 min (override)
        status: 'planned',
        price: 1500,
      },
    });

    await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        clientId: client3.id,
        staffId: master2.id,
        serviceId: brows.id,
        startAt: new Date(nextWeek.getTime() + 2 * 60 * 60000), // 2 hours later
        endAt: new Date(nextWeek.getTime() + 2 * 60 * 60000 + 45 * 60000),
        status: 'planned',
        price: 800,
      },
    });

    console.log(`вњ… Appointments created: 3 appointments\n`);

    console.log('рџЋ‰ Seeding completed successfully!\n');
    console.log('рџ“ќ Summary:');
    console.log(`   Tenant: ${tenant.name}`);
    console.log(`   Staff: 3`);
    console.log(`   Services: 4`);
    console.log(`   Clients: 3`);
    console.log(`   Appointments: 3\n`);
  } catch (error) {
    console.error('вќЊ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
