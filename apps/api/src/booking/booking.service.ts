import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AppointmentEntity, AppointmentStatus, AppointmentSource, PaymentStatus } from './entities/appointment.entity';
import { EmployeeEntity } from '../employees/entities/employee.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import { ClientEntity } from '../clients/entities/client.entity';

export interface CreateAppointmentDto {
  tenantId: string;
  branchId: string;
  clientId: string;
  employeeId: string;
  serviceId: string;
  startTime: Date;
  notes?: string;
  source?: AppointmentSource;
}

export interface AvailableSlotsQuery {
  tenantId: string;
  branchId: string;
  employeeId: string;
  serviceId: string;
  date: Date;
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
}

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(AppointmentEntity)
    private readonly appointmentRepo: Repository<AppointmentEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepo: Repository<EmployeeEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepo: Repository<ServiceEntity>,
    @InjectRepository(ClientEntity)
    private readonly clientRepo: Repository<ClientEntity>,
  ) {}

  async createAppointment(dto: CreateAppointmentDto): Promise<AppointmentEntity> {
    // Validate service
    const service = await this.serviceRepo.findOne({
      where: { id: dto.serviceId, tenantId: dto.tenantId },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Validate employee
    const employee = await this.employeeRepo.findOne({
      where: { id: dto.employeeId, tenantId: dto.tenantId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if employee provides this service
    if (!employee.serviceIds.includes(dto.serviceId)) {
      throw new BadRequestException('Employee does not provide this service');
    }

    // Validate client
    const client = await this.clientRepo.findOne({
      where: { id: dto.clientId, tenantId: dto.tenantId },
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Calculate end time
    const startTime = new Date(dto.startTime);
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

    // Check for conflicts
    const conflict = await this.checkConflict(dto.tenantId, dto.employeeId, startTime, endTime);
    if (conflict) {
      throw new ConflictException('Time slot is not available');
    }

    // Create appointment
    const appointment = this.appointmentRepo.create({
      tenantId: dto.tenantId,
      branchId: dto.branchId,
      clientId: dto.clientId,
      employeeId: dto.employeeId,
      serviceId: dto.serviceId,
      startTime,
      endTime,
      durationMinutes: service.durationMinutes,
      price: service.price,
      currency: service.currency,
      status: AppointmentStatus.PENDING,
      source: dto.source || AppointmentSource.ONLINE,
      notes: dto.notes,
    });

    return this.appointmentRepo.save(appointment);
  }

  async getAvailableSlots(query: AvailableSlotsQuery): Promise<TimeSlot[]> {
    const { tenantId, branchId, employeeId, serviceId, date } = query;

    // Get service duration
    const service = await this.serviceRepo.findOne({
      where: { id: serviceId, tenantId },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Get employee working hours
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, tenantId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Get day of week
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    const daySchedule = employee.workingHours?.[dayOfWeek];

    if (!daySchedule?.isWorking) {
      return [];
    }

    // Parse working hours
    const [startHour, startMin] = daySchedule.startTime.split(':').map(Number);
    const [endHour, endMin] = daySchedule.endTime.split(':').map(Number);

    const workStart = new Date(date);
    workStart.setHours(startHour, startMin, 0, 0);

    const workEnd = new Date(date);
    workEnd.setHours(endHour, endMin, 0, 0);

    // Get existing appointments for the day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const appointments = await this.appointmentRepo.find({
      where: {
        tenantId,
        employeeId,
        startTime: Between(dayStart, dayEnd),
        status: AppointmentStatus.CANCELLED,
      },
    });

    // Generate slots
    const slots: TimeSlot[] = [];
    const slotDuration = service.durationMinutes;
    const bufferBefore = service.bufferBeforeMinutes;
    const bufferAfter = service.bufferAfterMinutes;

    let currentTime = new Date(workStart);

    while (currentTime.getTime() + slotDuration * 60 * 1000 <= workEnd.getTime()) {
      const slotStart = new Date(currentTime);
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60 * 1000);

      // Check if slot conflicts with any appointment
      const isAvailable = !appointments.some(apt => {
        const aptStart = new Date(apt.startTime).getTime() - bufferBefore * 60 * 1000;
        const aptEnd = new Date(apt.endTime).getTime() + bufferAfter * 60 * 1000;
        return slotStart.getTime() < aptEnd && slotEnd.getTime() > aptStart;
      });

      // Check if slot is in the past
      const isPast = slotStart.getTime() < Date.now();

      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        available: isAvailable && !isPast,
      });

      // Move to next slot (30 min intervals)
      currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
    }

    return slots;
  }

  async confirmAppointment(id: string, tenantId: string): Promise<AppointmentEntity> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id, tenantId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    appointment.status = AppointmentStatus.CONFIRMED;
    appointment.confirmedAt = new Date();

    return this.appointmentRepo.save(appointment);
  }

  async cancelAppointment(id: string, tenantId: string, reason?: string): Promise<AppointmentEntity> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id, tenantId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = reason || null;

    return this.appointmentRepo.save(appointment);
  }

  async getAppointmentsByClient(tenantId: string, clientId: string): Promise<AppointmentEntity[]> {
    return this.appointmentRepo.find({
      where: { tenantId, clientId },
      order: { startTime: 'DESC' },
    });
  }

  async getAppointmentsByEmployee(tenantId: string, employeeId: string, date?: Date): Promise<AppointmentEntity[]> {
    const where: any = { tenantId, employeeId };

    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      where.startTime = Between(dayStart, dayEnd);
    }

    return this.appointmentRepo.find({
      where,
      order: { startTime: 'ASC' },
    });
  }

  private async checkConflict(
    tenantId: string,
    employeeId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ): Promise<boolean> {
    const query = this.appointmentRepo
      .createQueryBuilder('apt')
      .where('apt.tenantId = :tenantId', { tenantId })
      .andWhere('apt.employeeId = :employeeId', { employeeId })
      .andWhere('apt.status NOT IN (:...excludeStatuses)', {
        excludeStatuses: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
      })
      .andWhere('apt.startTime < :endTime', { endTime })
      .andWhere('apt.endTime > :startTime', { startTime });

    if (excludeId) {
      query.andWhere('apt.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}
