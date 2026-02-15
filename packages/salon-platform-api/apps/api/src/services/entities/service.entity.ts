import { Entity, Column, Index } from 'typeorm';
import { BranchBaseEntity } from '../../database/entities/base.entity';

export enum ServiceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  HIDDEN = 'HIDDEN',
}

@Entity('services')
@Index(['tenantId', 'categoryId'])
@Index(['tenantId', 'status'])
export class ServiceEntity extends BranchBaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ type: 'enum', enum: ServiceStatus, default: ServiceStatus.ACTIVE })
  status: ServiceStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'price_from' })
  priceFrom: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'price_to' })
  priceTo: number | null;

  @Column({ length: 10, default: 'RUB' })
  currency: string;

  @Column({ type: 'int', name: 'duration_minutes' })
  durationMinutes: number;

  @Column({ type: 'int', default: 0, name: 'buffer_before_minutes' })
  bufferBeforeMinutes: number;

  @Column({ type: 'int', default: 0, name: 'buffer_after_minutes' })
  bufferAfterMinutes: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  image: string | null;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number;

  @Column({ name: 'is_online_booking_enabled', default: true })
  isOnlineBookingEnabled: boolean;

  @Column({ name: 'requires_deposit', default: false })
  requiresDeposit: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'deposit_amount' })
  depositAmount: number | null;

  @Column({ type: 'int', nullable: true, name: 'deposit_percent' })
  depositPercent: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}

@Entity('service_categories')
@Index(['tenantId', 'parentId'])
export class ServiceCategoryEntity extends BranchBaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  image: string | null;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
