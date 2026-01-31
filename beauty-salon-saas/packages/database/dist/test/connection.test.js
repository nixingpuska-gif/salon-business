"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Test Supabase connection
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function testConnection() {
    console.log('🔌 Testing Supabase connection...\n');
    try {
        // Test basic connection
        const result = await prisma.$queryRaw `SELECT version()`;
        console.log('✅ Connected to PostgreSQL');
        console.log(`   Version: ${result[0].version.split(' ')[1]}\n`);
        // List tables
        const tables = await prisma.$queryRaw `
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
        console.log('📊 Database tables:');
        tables.forEach(t => console.log(`   - ${t.tablename}`));
        console.log('');
        // Check RLS status
        const rlsTables = await prisma.$queryRaw `
      SELECT tablename, rowsecurity
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE t.schemaname = 'public'
      AND c.relrowsecurity = true
      ORDER BY t.tablename
    `;
        console.log('🔐 RLS Enabled tables:');
        if (rlsTables.length > 0) {
            rlsTables.forEach(t => console.log(`   ✓ ${t.tablename}`));
        }
        else {
            console.log('   ⚠️  No tables have RLS enabled yet (run migrations first)');
        }
        console.log('');
        // Count records
        const tenantCount = await prisma.tenant.count();
        const staffCount = await prisma.staff.count();
        const clientCount = await prisma.client.count();
        const appointmentCount = await prisma.appointment.count();
        console.log('📈 Record counts:');
        console.log(`   Tenants: ${tenantCount}`);
        console.log(`   Staff: ${staffCount}`);
        console.log(`   Clients: ${clientCount}`);
        console.log(`   Appointments: ${appointmentCount}`);
        console.log('');
        console.log('✅ Connection test passed!\n');
    }
    catch (error) {
        console.error('❌ Connection test failed:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
testConnection();
//# sourceMappingURL=connection.test.js.map