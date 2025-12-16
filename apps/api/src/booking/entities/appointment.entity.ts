import { Entity, Column, Index } from 'typeorm';
import { BranchBaseEntity } from '../../database/entities/base.entity';

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum AppointmentSource {
  ONLINE = 'ONLINE',
  TELEGRAM = 'TELEGRAM',
  WHATSAPP = 'WHATSAPP',
  INSTAGRAM = 'INSTAGRAM',
  PHONE = 'PHONE',
  WALK_IN = 'WALK_IN',
  ADMIN = 'ADMIN',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  DEPOSIT_PAID = 'DEPOSIT_PAID',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

@Entity('appointments')
@Index(['tenantId', 'branchId', 'startTime'])
@Index(['tenantId', 'employeeId', 'startTime'])
@Index(['tenantId', 'clientId'])
@Index(['tenantId', 'status'])
export class AppointmentEntity extends BranchBaseEntity {
  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @Column({ name: 'service_id', type: 'uuid' })
  serviceId: string;

  @Column({ name: 'start_time', type: 'timestamp with time zone' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp with time zone' })
  endTime: Date;

  @Column({ type: 'int', name: 'duration_minutes' })
  durationMinutes: number;

  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.PENDING })
  status: AppointmentStatus;

  @Column({ type: 'enum', enum: AppointmentSource, default: AppointmentSource.ONLINE })
  source: AppointmentSource;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ length: 10, default: 'RUB' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING, name: 'payment_status' })
  paymentStatus: PaymentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'deposit_amount' })
  depositAmount: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'paid_amount' })
  paidAmount: number | null;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'client_notes', type: 'text', nullable: true })
  clientNotes: string | null;

  @Column({ name: 'internal_notes', type: 'text', nullable: true })
  internalNotes: string | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelledBy: string | null;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'reminder_sent_at', type: 'timestamp', nullable: true })
  reminderSentAt: Date | null;

  @Column({ name: 'confirmation_sent_at', type: 'timestamp', nullable: true })
  confirmationSentAt: Date | null;

  @Column({ name: 'google_event_id', type: 'varchar', length: 255, nullable: true })
  googleEventId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
