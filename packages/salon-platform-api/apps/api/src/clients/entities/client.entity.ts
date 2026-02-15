import { Entity, Column, Index } from 'typeorm';
import { TenantBaseEntity } from '../../database/entities/base.entity';

export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}

export enum ClientSource {
  ONLINE_BOOKING = 'ONLINE_BOOKING',
  TELEGRAM = 'TELEGRAM',
  WHATSAPP = 'WHATSAPP',
  INSTAGRAM = 'INSTAGRAM',
  PHONE = 'PHONE',
  WALK_IN = 'WALK_IN',
  REFERRAL = 'REFERRAL',
  IMPORT = 'IMPORT',
}

@Entity('clients')
@Index(['tenantId', 'email'], { where: '"email" IS NOT NULL' })
@Index(['tenantId', 'phone'], { where: '"phone" IS NOT NULL' })
@Index(['tenantId', 'status'])
export class ClientEntity extends TenantBaseEntity {
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

  @Column({ type: 'enum', enum: ClientStatus, default: ClientStatus.ACTIVE })
  status: ClientStatus;

  @Column({ type: 'enum', enum: ClientSource, default: ClientSource.ONLINE_BOOKING })
  source: ClientSource;

  @Column({ type: 'date', nullable: true })
  birthday: Date | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ type: 'int', default: 0, name: 'total_visits' })
  totalVisits: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_spent' })
  totalSpent: number;

  @Column({ type: 'int', default: 0, name: 'no_shows' })
  noShows: number;

  @Column({ type: 'int', default: 0, name: 'cancellations' })
  cancellations: number;

  @Column({ name: 'last_visit_at', type: 'timestamp', nullable: true })
  lastVisitAt: Date | null;

  @Column({ name: 'preferred_employee_id', type: 'uuid', nullable: true })
  preferredEmployeeId: string | null;

  @Column({ name: 'preferred_branch_id', type: 'uuid', nullable: true })
  preferredBranchId: string | null;

  @Column({ type: 'int', default: 0, name: 'loyalty_points' })
  loyaltyPoints: number;

  @Column({ name: 'marketing_consent', default: false })
  marketingConsent: boolean;

  @Column({ name: 'sms_consent', default: true })
  smsConsent: boolean;

  @Column({ name: 'email_consent', default: true })
  emailConsent: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // Telegram integration
  @Column({ name: 'telegram_id', type: 'bigint', nullable: true })
  telegramId: number | null;

  @Column({ name: 'telegram_username', type: 'varchar', length: 100, nullable: true })
  telegramUsername: string | null;
}
