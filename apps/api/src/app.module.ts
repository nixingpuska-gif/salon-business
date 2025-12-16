import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

// Auth
import { AuthModule } from './auth/auth.module';
import { UserEntity } from './auth/entities/user.entity';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

// Tenants
import { TenantsModule } from './tenants/tenants.module';
import { TenantEntity } from './tenants/entities/tenant.entity';

// Branches
import { BranchesModule } from './branches/branches.module';
import { BranchEntity } from './branches/entities/branch.entity';

// Employees
import { EmployeesModule } from './employees/employees.module';
import { EmployeeEntity } from './employees/entities/employee.entity';

// Services
import { ServicesModule } from './services/services.module';
import { ServiceEntity, ServiceCategoryEntity } from './services/entities/service.entity';

// Clients
import { ClientsModule } from './clients/clients.module';
import { ClientEntity } from './clients/entities/client.entity';

// Booking
import { BookingModule } from './booking/booking.module';
import { AppointmentEntity } from './booking/entities/appointment.entity';

// Payments
import { PaymentsModule } from './payments/payments.module';
import { PaymentEntity, PaymentSettingsEntity } from './payments/entities/payment.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'postgres'),
        database: configService.get('DATABASE_NAME', 'salon_platform'),
        entities: [
          UserEntity,
          TenantEntity,
          BranchEntity,
          EmployeeEntity,
          ServiceEntity,
          ServiceCategoryEntity,
          ClientEntity,
          AppointmentEntity,
          PaymentEntity,
          PaymentSettingsEntity,
        ],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    TenantsModule,
    BranchesModule,
    EmployeesModule,
    ServicesModule,
    ClientsModule,
    BookingModule,
    PaymentsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
