import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentEntity } from './entities/appointment.entity';
import { EmployeeEntity } from '../employees/entities/employee.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import { ClientEntity } from '../clients/entities/client.entity';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppointmentEntity,
      EmployeeEntity,
      ServiceEntity,
      ClientEntity,
    ]),
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
