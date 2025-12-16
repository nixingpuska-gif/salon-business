import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeEntity, EmployeeStatus, EmployeeWorkingHours } from './entities/employee.entity';

export interface CreateEmployeeDto {
  tenantId: string;
  branchId?: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  bio?: string;
  serviceIds?: string[];
  workingHours?: EmployeeWorkingHours;
}

export interface UpdateEmployeeDto {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  position?: string;
  bio?: string;
  status?: EmployeeStatus;
  serviceIds?: string[];
  workingHours?: EmployeeWorkingHours;
  bookingBufferMinutes?: number;
  maxAdvanceBookingDays?: number;
  commissionRate?: number;
  sortOrder?: number;
}

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepo: Repository<EmployeeEntity>,
  ) {}

  async create(dto: CreateEmployeeDto): Promise<EmployeeEntity> {
    const employee = this.employeeRepo.create({
      ...dto,
      status: EmployeeStatus.ACTIVE,
      workingHours: dto.workingHours || this.getDefaultWorkingHours(),
    });
    return this.employeeRepo.save(employee);
  }

  async findById(id: string, tenantId: string): Promise<EmployeeEntity> {
    const employee = await this.employeeRepo.findOne({
      where: { id, tenantId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }

  async findByTenant(tenantId: string, branchId?: string): Promise<EmployeeEntity[]> {
    const where: any = { tenantId, status: EmployeeStatus.ACTIVE };
    if (branchId) {
      where.branchId = branchId;
    }
    return this.employeeRepo.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findByService(tenantId: string, serviceId: string): Promise<EmployeeEntity[]> {
    return this.employeeRepo
      .createQueryBuilder('emp')
      .where('emp.tenantId = :tenantId', { tenantId })
      .andWhere('emp.status = :status', { status: EmployeeStatus.ACTIVE })
      .andWhere(':serviceId = ANY(emp.serviceIds)', { serviceId })
      .orderBy('emp.sortOrder', 'ASC')
      .addOrderBy('emp.name', 'ASC')
      .getMany();
  }

  async update(id: string, tenantId: string, dto: UpdateEmployeeDto): Promise<EmployeeEntity> {
    const employee = await this.findById(id, tenantId);
    Object.assign(employee, dto);
    return this.employeeRepo.save(employee);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const employee = await this.findById(id, tenantId);
    employee.status = EmployeeStatus.INACTIVE;
    await this.employeeRepo.save(employee);
  }

  private getDefaultWorkingHours(): EmployeeWorkingHours {
    const defaultDay = { isWorking: true, startTime: '09:00', endTime: '18:00' };
    return {
      monday: defaultDay,
      tuesday: defaultDay,
      wednesday: defaultDay,
      thursday: defaultDay,
      friday: defaultDay,
      saturday: { isWorking: true, startTime: '10:00', endTime: '16:00' },
      sunday: { isWorking: false },
    };
  }
}
