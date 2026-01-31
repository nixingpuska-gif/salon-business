// Test Supabase connection
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  console.log('рџ”Њ Testing Supabase connection...\n');

  try {
    // Test basic connection
    const result = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    console.log('вњ… Connected to PostgreSQL');
    console.log(`   Version: ${result[0].version.split(' ')[1]}\n`);

    // List tables
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    console.log('рџ“Љ Database tables:');
    tables.forEach(t => console.log(`   - ${t.tablename}`));
    console.log('');

    // Check RLS status
    const rlsTables = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean }>>`
      SELECT tablename, rowsecurity
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE t.schemaname = 'public'
      AND c.relrowsecurity = true
      ORDER BY t.tablename
    `;
    console.log('рџ”ђ RLS Enabled tables:');
    if (rlsTables.length > 0) {
      rlsTables.forEach(t => console.log(`   вњ“ ${t.tablename}`));
    } else {
      console.log('   вљ пёЏ  No tables have RLS enabled yet (run migrations first)');
    }
    console.log('');

    // Count records
    const tenantCount = await prisma.tenant.count();
    const staffCount = await prisma.staff.count();
    const clientCount = await prisma.client.count();
    const appointmentCount = await prisma.appointment.count();

    console.log('рџ“€ Record counts:');
    console.log(`   Tenants: ${tenantCount}`);
    console.log(`   Staff: ${staffCount}`);
    console.log(`   Clients: ${clientCount}`);
    console.log(`   Appointments: ${appointmentCount}`);
    console.log('');

    console.log('вњ… Connection test passed!\n');
  } catch (error) {
    console.error('вќЊ Connection test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
