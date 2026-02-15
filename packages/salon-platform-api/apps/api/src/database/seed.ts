import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'salon_platform',
});

async function seed() {
  await dataSource.initialize();
  console.log('Database connected');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // IDs
    const tenantId = uuid();
    const branchId = uuid();
    const ownerId = uuid();
    const employee1Id = uuid();
    const employee2Id = uuid();
    const service1Id = uuid();
    const service2Id = uuid();
    const service3Id = uuid();
    const categoryId = uuid();
    const client1Id = uuid();
    const client2Id = uuid();

    // Create Tenant
    await queryRunner.query(`
      INSERT INTO tenants (id, name, slug, status, plan, locale, currency, timezone, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `, [tenantId, 'Beauty Salon Demo', 'beauty-salon-demo', 'ACTIVE', 'PROFESSIONAL', 'ru', 'RUB', 'Europe/Moscow']);
    console.log('✓ Tenant created');

    // Create Branch
    await queryRunner.query(`
      INSERT INTO branches (id, tenant_id, name, slug, status, address, city, country, phone, timezone, is_main, working_hours, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    `, [
      branchId, tenantId, 'Главный филиал', 'main', 'ACTIVE',
      'ул. Пушкина, д. 10', 'Москва', 'Россия', '+7 (495) 123-45-67',
      'Europe/Moscow', true,
      JSON.stringify({
        monday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        saturday: { isOpen: true, openTime: '10:00', closeTime: '20:00' },
        sunday: { isOpen: false },
      }),
    ]);
    console.log('✓ Branch created');

    // Create Owner User
    const passwordHash = await bcrypt.hash('admin123', 10);
    await queryRunner.query(`
      INSERT INTO users (id, tenant_id, name, email, phone, password_hash, role, status, locale, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    `, [ownerId, tenantId, 'Администратор', 'admin@beautysalon.ru', '+79001234567', passwordHash, 'OWNER', 'ACTIVE', 'ru']);
    console.log('✓ Owner user created');

    // Update tenant owner
    await queryRunner.query(`UPDATE tenants SET owner_id = $1 WHERE id = $2`, [ownerId, tenantId]);

    // Create Service Category
    await queryRunner.query(`
      INSERT INTO service_categories (id, tenant_id, branch_id, name, description, sort_order, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    `, [categoryId, tenantId, branchId, 'Парикмахерские услуги', 'Стрижки, укладки, окрашивание', 0, true]);
    console.log('✓ Service category created');

    // Create Services
    const services = [
      [service1Id, 'Женская стрижка', 'Стрижка любой сложности', 2500, 60],
      [service2Id, 'Мужская стрижка', 'Классическая мужская стрижка', 1500, 30],
      [service3Id, 'Окрашивание', 'Окрашивание волос любой сложности', 5000, 120],
    ];

    for (const [id, name, desc, price, duration] of services) {
      await queryRunner.query(`
        INSERT INTO services (id, tenant_id, branch_id, name, description, category_id, status, price, currency, duration_minutes, is_online_booking_enabled, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      `, [id, tenantId, branchId, name, desc, categoryId, 'ACTIVE', price, 'RUB', duration, true]);
    }
    console.log('✓ Services created');

    // Create Employees
    const workingHours = JSON.stringify({
      monday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
      tuesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
      wednesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
      thursday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
      friday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
      saturday: { isWorking: true, startTime: '10:00', endTime: '16:00' },
      sunday: { isWorking: false },
    });

    await queryRunner.query(`
      INSERT INTO employees (id, tenant_id, branch_id, name, email, phone, position, status, service_ids, working_hours, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    `, [employee1Id, tenantId, branchId, 'Анна Иванова', 'anna@beautysalon.ru', '+79001111111', 'Стилист', 'ACTIVE', [service1Id, service3Id], workingHours]);

    await queryRunner.query(`
      INSERT INTO employees (id, tenant_id, branch_id, name, email, phone, position, status, service_ids, working_hours, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    `, [employee2Id, tenantId, branchId, 'Михаил Петров', 'mikhail@beautysalon.ru', '+79002222222', 'Барбер', 'ACTIVE', [service2Id], workingHours]);
    console.log('✓ Employees created');

    // Create Clients
    await queryRunner.query(`
      INSERT INTO clients (id, tenant_id, name, email, phone, status, source, marketing_consent, sms_consent, email_consent, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    `, [client1Id, tenantId, 'Елена Смирнова', 'elena@example.com', '+79003333333', 'ACTIVE', 'ONLINE_BOOKING', true, true, true]);

    await queryRunner.query(`
      INSERT INTO clients (id, tenant_id, name, email, phone, status, source, marketing_consent, sms_consent, email_consent, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    `, [client2Id, tenantId, 'Дмитрий Козлов', 'dmitry@example.com', '+79004444444', 'ACTIVE', 'TELEGRAM', true, true, true]);
    console.log('✓ Clients created');

    // Create sample appointment
    const appointmentId = uuid();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const endTime = new Date(tomorrow.getTime() + 60 * 60 * 1000);

    await queryRunner.query(`
      INSERT INTO appointments (id, tenant_id, branch_id, client_id, employee_id, service_id, start_time, end_time, duration_minutes, status, source, price, currency, payment_status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
    `, [appointmentId, tenantId, branchId, client1Id, employee1Id, service1Id, tomorrow, endTime, 60, 'CONFIRMED', 'ONLINE', 2500, 'RUB', 'PENDING']);
    console.log('✓ Sample appointment created');

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    SEED COMPLETED                         ║
╠═══════════════════════════════════════════════════════════╣
║  Tenant ID:     ${tenantId}  ║
║  Branch ID:     ${branchId}  ║
║  Owner Email:   admin@beautysalon.ru                      ║
║  Owner Pass:    admin123                                  ║
╚═══════════════════════════════════════════════════════════╝
    `);

  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seed().catch(console.error);
