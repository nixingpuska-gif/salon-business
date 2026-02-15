import { Entity, Column, Index } from 'typeorm';
import { BranchBaseEntity } from '../../database/entities/base.entity';

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
}

@Entity('employees')
@Index(['tenantId', 'branchId'])
export class EmployeeEntity extends BranchBaseEntity {
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  position: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'enum', enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  status: EmployeeStatus;

  @Column({ type: 'uuid', array: true, name: 'service_ids', default: [] })
  serviceIds: string[];

  @Column({ type: 'jsonb', nullable: true, name: 'working_hours' })
  workingHours: EmployeeWorkingHours | null;

  @Column({ type: 'int', default: 0, name: 'booking_buffer_minutes' })
  bookingBufferMinutes: number;

  @Column({ type: 'int', default: 30, name: 'max_advance_booking_days' })
  maxAdvanceBookingDays: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'commission_rate' })
  commissionRate: number;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}

export interface EmployeeWorkingHours {
  monday?: EmployeeDaySchedule;
  tuesday?: EmployeeDaySchedule;
  wednesday?: EmployeeDaySchedule;
  thursday?: EmployeeDaySchedule;
  friday?: EmployeeDaySchedule;
  saturday?: EmployeeDaySchedule;
  sunday?: EmployeeDaySchedule;
}

export interface EmployeeDaySchedule {
  isWorking: boolean;
  startTime?: string; // HH:MM
  endTime?: string;   // HH:MM
  breaks?: { start: string; end: string }[];
}
