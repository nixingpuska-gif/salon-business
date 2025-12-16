import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../database/entities/base.entity';

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
}

export enum TenantPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

@Entity('tenants')
export class TenantEntity extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ type: 'enum', enum: TenantStatus, default: TenantStatus.TRIAL })
  status: TenantStatus;

  @Column({ type: 'enum', enum: TenantPlan, default: TenantPlan.FREE })
  plan: TenantPlan;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo: string | null;

  @Column({ length: 10, default: 'ru' })
  locale: string;

  @Column({ length: 10, default: 'RUB' })
  currency: string;

  @Column({ length: 50, default: 'Europe/Moscow' })
  timezone: string;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any> | null;

  @Column({ name: 'trial_ends_at', type: 'timestamp', nullable: true })
  trialEndsAt: Date | null;

  @Column({ name: 'subscription_ends_at', type: 'timestamp', nullable: true })
  subscriptionEndsAt: Date | null;
}
