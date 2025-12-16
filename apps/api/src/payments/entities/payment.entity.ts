import { Entity, Column, Index } from 'typeorm';
import { TenantBaseEntity } from '../../database/entities/base.entity';

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  YUKASSA = 'YUKASSA',
  CASH = 'CASH',
  CARD_ON_SITE = 'CARD_ON_SITE',
}

export enum PaymentType {
  DEPOSIT = 'DEPOSIT',
  FULL_PAYMENT = 'FULL_PAYMENT',
  REFUND = 'REFUND',
}

export enum PaymentTransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

@Entity('payments')
@Index(['tenantId', 'appointmentId'])
@Index(['tenantId', 'clientId'])
@Index(['tenantId', 'status'])
@Index(['externalId'], { unique: true, where: '"external_id" IS NOT NULL' })
export class PaymentEntity extends TenantBaseEntity {
  @Column({ name: 'appointment_id', type: 'uuid', nullable: true })
  appointmentId: string | null;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null;

  @Column({ type: 'enum', enum: PaymentProvider })
  provider: PaymentProvider;

  @Column({ type: 'enum', enum: PaymentType })
  type: PaymentType;

  @Column({ type: 'enum', enum: PaymentTransactionStatus, default: PaymentTransactionStatus.PENDING })
  status: PaymentTransactionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 10 })
  currency: string;

  @Column({ name: 'external_id', type: 'varchar', length: 255, nullable: true })
  externalId: string | null;

  @Column({ name: 'payment_url', type: 'varchar', length: 500, nullable: true })
  paymentUrl: string | null;

  @Column({ name: 'receipt_url', type: 'varchar', length: 500, nullable: true })
  receiptUrl: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'refunded_at', type: 'timestamp', nullable: true })
  refundedAt: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'refund_amount' })
  refundAmount: number | null;

  @Column({ type: 'jsonb', nullable: true, name: 'provider_data' })
  providerData: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}

@Entity('payment_settings')
export class PaymentSettingsEntity extends TenantBaseEntity {
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null;

  // Stripe
  @Column({ name: 'stripe_enabled', default: false })
  stripeEnabled: boolean;

  @Column({ name: 'stripe_account_id', type: 'varchar', length: 255, nullable: true })
  stripeAccountId: string | null;

  @Column({ name: 'stripe_public_key', type: 'varchar', length: 255, nullable: true })
  stripePublicKey: string | null;

  // YuKassa
  @Column({ name: 'yukassa_enabled', default: false })
  yukassaEnabled: boolean;

  @Column({ name: 'yukassa_shop_id', type: 'varchar', length: 100, nullable: true })
  yukassaShopId: string | null;

  // General
  @Column({ name: 'require_deposit', default: false })
  requireDeposit: boolean;

  @Column({ name: 'default_deposit_percent', type: 'int', default: 20 })
  defaultDepositPercent: number;

  @Column({ name: 'allow_cash', default: true })
  allowCash: boolean;

  @Column({ name: 'allow_card_on_site', default: true })
  allowCardOnSite: boolean;
}
