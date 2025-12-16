import { DataSource } from 'typeorm';
import { UserEntity } from './src/auth/entities/user.entity';
import * as bcrypt from 'bcrypt';

async function test() {
  const ds = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'salon_platform',
    logging: true,
    entities: [UserEntity],
  });
  await ds.initialize();
  
  const userRepo = ds.getRepository(UserEntity);
  const tenantId = '370bbc13-1d21-448a-9f2e-3c43ee91aa04';
  const email = 'admin@beautysalon.ru';
  const password = 'admin123';
  
  console.log('=== Testing Login Flow ===');
  console.log('TenantId:', tenantId);
  console.log('Email:', email);
  
  const user = await userRepo
    .createQueryBuilder('u')
    .addSelect('u.passwordHash')
    .where('u.tenantId = :tenantId', { tenantId })
    .andWhere('u.email = :email', { email })
    .getOne();
    
  console.log('\n=== User Found ===');
  console.log('User:', user ? 'YES' : 'NO');
  
  if (user) {
    console.log('User ID:', user.id);
    console.log('User Email:', user.email);
    console.log('User Status:', user.status);
    console.log('Password Hash:', user.passwordHash);
    
    const isValid = await bcrypt.compare(password, user.passwordHash || '');
    console.log('\n=== Password Check ===');
    console.log('Password valid:', isValid);
  }
  
  await ds.destroy();
}
test().catch(console.error);
