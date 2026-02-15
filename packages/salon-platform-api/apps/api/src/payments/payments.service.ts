import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { IsString, IsNumber, IsEnum, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  PaymentEntity,
  PaymentSettingsEntity,
  PaymentProvider,
  PaymentType,
  PaymentTransactionStatus,
} from './entities/payment.entity';

// DTOs
export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  tenantId: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  appointmentId?: string;

  @ApiProperty()
  @IsUUID()
  clientId: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiProperty({ enum: PaymentType })
  @IsEnum(PaymentType)
  type: PaymentType;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ default: 'RUB' })
  @IsString()
  currency: string = 'RUB';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  returnUrl?: string;
}

export class UpdatePaymentSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  stripeEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  stripeAccountId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  stripePublicKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  yukassaEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  yukassaShopId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  requireDeposit?: boolean;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  defaultDepositPercent?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  allowCash?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  allowCardOnSite?: boolean;
}

export interface PaymentResult {
  payment: PaymentEntity;
  paymentUrl?: string;
  requiresAction: boolean;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(PaymentSettingsEntity)
    private readonly settingsRepo: Repository<PaymentSettingsEntity>,
    private readonly configService: ConfigService,
  ) {}

  // ============ PAYMENT CREATION ============

  async createPayment(dto: CreatePaymentDto): Promise<PaymentResult> {
    // Validate provider is enabled
    const settings = await this.getSettings(dto.tenantId, dto.branchId);
    
    if (dto.provider === PaymentProvider.STRIPE && !settings?.stripeEnabled) {
      throw new BadRequestException('Stripe payments are not enabled for this tenant');
    }
    if (dto.provider === PaymentProvider.YUKASSA && !settings?.yukassaEnabled) {
      throw new BadRequestException('YuKassa payments are not enabled for this tenant');
    }

    // Create payment record
    const payment = this.paymentRepo.create({
      tenantId: dto.tenantId,
      appointmentId: dto.appointmentId,
      clientId: dto.clientId,
      branchId: dto.branchId,
      provider: dto.provider,
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency,
      description: dto.description,
      status: PaymentTransactionStatus.PENDING,
    });

    await this.paymentRepo.save(payment);

    // Process based on provider
    let result: PaymentResult = { payment, requiresAction: false };

    switch (dto.provider) {
      case PaymentProvider.STRIPE:
        result = await this.processStripePayment(payment, settings, dto.returnUrl);
        break;
      case PaymentProvider.YUKASSA:
        result = await this.processYuKassaPayment(payment, settings, dto.returnUrl);
        break;
      case PaymentProvider.CASH:
      case PaymentProvider.CARD_ON_SITE:
        // No external processing needed
        break;
    }

    return result;
  }

  // ============ STRIPE INTEGRATION ============

  private async processStripePayment(
    payment: PaymentEntity,
    settings: PaymentSettingsEntity,
    returnUrl?: string,
  ): Promise<PaymentResult> {
    const stripeSecretKey = this.configService.get('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      // Demo mode - just mark as pending
      console.log('[Stripe] Demo mode - no secret key configured');
      return { payment, requiresAction: true, paymentUrl: '#stripe-demo' };
    }

    try {
      // Dynamic import to avoid issues if stripe not installed
      const Stripe = require('stripe');
      const stripe = new Stripe(stripeSecretKey);

      // Create Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: payment.currency.toLowerCase(),
              product_data: {
                name: payment.description || 'Salon Service Payment',
              },
              unit_amount: Math.round(Number(payment.amount) * 100), // Stripe uses cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: returnUrl ? `${returnUrl}?payment_id=${payment.id}&status=success` : undefined,
        cancel_url: returnUrl ? `${returnUrl}?payment_id=${payment.id}&status=cancelled` : undefined,
        metadata: {
          payment_id: payment.id,
          tenant_id: payment.tenantId,
          appointment_id: payment.appointmentId || '',
        },
      });

      // Update payment with Stripe data
      payment.externalId = session.id;
      payment.paymentUrl = session.url;
      payment.status = PaymentTransactionStatus.PROCESSING;
      payment.providerData = { sessionId: session.id };
      await this.paymentRepo.save(payment);

      return { payment, paymentUrl: session.url, requiresAction: true };
    } catch (error) {
      console.error('[Stripe] Error creating payment:', error);
      payment.status = PaymentTransactionStatus.FAILED;
      payment.errorMessage = error.message;
      await this.paymentRepo.save(payment);
      throw new BadRequestException(`Stripe payment failed: ${error.message}`);
    }
  }

  // ============ YUKASSA INTEGRATION ============

  private async processYuKassaPayment(
    payment: PaymentEntity,
    settings: PaymentSettingsEntity,
    returnUrl?: string,
  ): Promise<PaymentResult> {
    const yukassaShopId = settings?.yukassaShopId || this.configService.get('YUKASSA_SHOP_ID');
    const yukassaSecretKey = this.configService.get('YUKASSA_SECRET_KEY');

    if (!yukassaShopId || !yukassaSecretKey) {
      // Demo mode
      console.log('[YuKassa] Demo mode - no credentials configured');
      return { payment, requiresAction: true, paymentUrl: '#yukassa-demo' };
    }

    try {
      const response = await fetch('https://api.yookassa.ru/v3/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotence-Key': payment.id,
          'Authorization': `Basic ${Buffer.from(`${yukassaShopId}:${yukassaSecretKey}`).toString('base64')}`,
        },
        body: JSON.stringify({
          amount: {
            value: Number(payment.amount).toFixed(2),
            currency: payment.currency,
          },
          capture: true,
          confirmation: {
            type: 'redirect',
            return_url: returnUrl || this.configService.get('YUKASSA_RETURN_URL', 'https://salon.example.com/payment/callback'),
          },
          description: payment.description || 'Оплата услуг салона',
          metadata: {
            payment_id: payment.id,
            tenant_id: payment.tenantId,
            appointment_id: payment.appointmentId || '',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.description || 'YuKassa API error');
      }

      const data = await response.json();

      // Update payment with YuKassa data
      payment.externalId = data.id;
      payment.paymentUrl = data.confirmation?.confirmation_url;
      payment.status = PaymentTransactionStatus.PROCESSING;
      payment.providerData = { yukassaPaymentId: data.id, status: data.status };
      await this.paymentRepo.save(payment);

      return { payment, paymentUrl: payment.paymentUrl, requiresAction: true };
    } catch (error) {
      console.error('[YuKassa] Error creating payment:', error);
      payment.status = PaymentTransactionStatus.FAILED;
      payment.errorMessage = error.message;
      await this.paymentRepo.save(payment);
      throw new BadRequestException(`YuKassa payment failed: ${error.message}`);
    }
  }

  // ============ WEBHOOKS ============

  async handleStripeWebhook(payload: any, signature: string): Promise<void> {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    
    // In production, verify signature
    // const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    
    const event = payload; // For demo purposes

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleStripeSessionCompleted(event.data.object);
        break;
      case 'checkout.session.expired':
        await this.handleStripeSessionExpired(event.data.object);
        break;
      case 'charge.refunded':
        await this.handleStripeRefund(event.data.object);
        break;
    }
  }

  private async handleStripeSessionCompleted(session: any): Promise<void> {
    const payment = await this.paymentRepo.findOne({
      where: { externalId: session.id },
    });

    if (payment) {
      payment.status = PaymentTransactionStatus.SUCCEEDED;
      payment.paidAt = new Date();
      payment.providerData = { ...payment.providerData, session };
      await this.paymentRepo.save(payment);
    }
  }

  private async handleStripeSessionExpired(session: any): Promise<void> {
    const payment = await this.paymentRepo.findOne({
      where: { externalId: session.id },
    });

    if (payment) {
      payment.status = PaymentTransactionStatus.CANCELLED;
      await this.paymentRepo.save(payment);
    }
  }

  private async handleStripeRefund(charge: any): Promise<void> {
    const payment = await this.paymentRepo.findOne({
      where: { externalId: charge.payment_intent },
    });

    if (payment) {
      payment.status = PaymentTransactionStatus.REFUNDED;
      payment.refundedAt = new Date();
      payment.refundAmount = charge.amount_refunded / 100;
      await this.paymentRepo.save(payment);
    }
  }

  async handleYuKassaWebhook(payload: any): Promise<void> {
    const { event, object } = payload;

    const payment = await this.paymentRepo.findOne({
      where: { externalId: object.id },
    });

    if (!payment) {
      console.warn('[YuKassa] Payment not found for webhook:', object.id);
      return;
    }

    switch (event) {
      case 'payment.succeeded':
        payment.status = PaymentTransactionStatus.SUCCEEDED;
        payment.paidAt = new Date();
        payment.providerData = { ...payment.providerData, ...object };
        break;
      case 'payment.canceled':
        payment.status = PaymentTransactionStatus.CANCELLED;
        break;
      case 'refund.succeeded':
        payment.status = PaymentTransactionStatus.REFUNDED;
        payment.refundedAt = new Date();
        payment.refundAmount = object.amount?.value;
        break;
    }

    await this.paymentRepo.save(payment);
  }

  // ============ QUERIES ============

  async findById(id: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async findByAppointment(appointmentId: string): Promise<PaymentEntity[]> {
    return this.paymentRepo.find({
      where: { appointmentId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByClient(tenantId: string, clientId: string): Promise<PaymentEntity[]> {
    return this.paymentRepo.find({
      where: { tenantId, clientId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByTenant(tenantId: string, options?: {
    status?: PaymentTransactionStatus;
    from?: Date;
    to?: Date;
    limit?: number;
  }): Promise<PaymentEntity[]> {
    const qb = this.paymentRepo.createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId });

    if (options?.status) {
      qb.andWhere('p.status = :status', { status: options.status });
    }
    if (options?.from) {
      qb.andWhere('p.createdAt >= :from', { from: options.from });
    }
    if (options?.to) {
      qb.andWhere('p.createdAt <= :to', { to: options.to });
    }

    qb.orderBy('p.createdAt', 'DESC');

    if (options?.limit) {
      qb.limit(options.limit);
    }

    return qb.getMany();
  }

  // ============ MANUAL OPERATIONS ============

  async markAsPaid(id: string, method: PaymentProvider = PaymentProvider.CASH): Promise<PaymentEntity> {
    const payment = await this.findById(id);
    
    if (payment.status === PaymentTransactionStatus.SUCCEEDED) {
      throw new BadRequestException('Payment already completed');
    }

    payment.status = PaymentTransactionStatus.SUCCEEDED;
    payment.paidAt = new Date();
    payment.provider = method;
    
    return this.paymentRepo.save(payment);
  }

  async refund(id: string, amount?: number): Promise<PaymentEntity> {
    const payment = await this.findById(id);
    
    if (payment.status !== PaymentTransactionStatus.SUCCEEDED) {
      throw new BadRequestException('Can only refund successful payments');
    }

    const refundAmount = amount || Number(payment.amount);
    
    // For Stripe/YuKassa - would need to call their refund APIs
    // For now, just mark as refunded
    
    payment.status = PaymentTransactionStatus.REFUNDED;
    payment.refundedAt = new Date();
    payment.refundAmount = refundAmount;
    
    return this.paymentRepo.save(payment);
  }

  // ============ SETTINGS ============

  async getSettings(tenantId: string, branchId?: string): Promise<PaymentSettingsEntity | null> {
    // First try branch-specific settings
    if (branchId) {
      const branchSettings = await this.settingsRepo.findOne({
        where: { tenantId, branchId },
      });
      if (branchSettings) return branchSettings;
    }

    // Fall back to tenant-level settings
    return this.settingsRepo.findOne({
      where: { tenantId, branchId: null as any },
    });
  }

  async updateSettings(
    tenantId: string,
    dto: UpdatePaymentSettingsDto,
    branchId?: string,
  ): Promise<PaymentSettingsEntity> {
    let settings = await this.getSettings(tenantId, branchId);

    if (!settings) {
      settings = this.settingsRepo.create({
        tenantId,
        branchId: branchId || null,
      });
    }

    Object.assign(settings, dto);
    return this.settingsRepo.save(settings);
  }

  // ============ STATISTICS ============

  async getStatistics(tenantId: string, from: Date, to: Date): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    successfulPayments: number;
    failedPayments: number;
    refundedAmount: number;
    byProvider: Record<string, { count: number; amount: number }>;
  }> {
    const payments = await this.findByTenant(tenantId, { from, to });

    const stats = {
      totalRevenue: 0,
      totalTransactions: payments.length,
      successfulPayments: 0,
      failedPayments: 0,
      refundedAmount: 0,
      byProvider: {} as Record<string, { count: number; amount: number }>,
    };

    for (const payment of payments) {
      if (!stats.byProvider[payment.provider]) {
        stats.byProvider[payment.provider] = { count: 0, amount: 0 };
      }
      stats.byProvider[payment.provider].count++;

      if (payment.status === PaymentTransactionStatus.SUCCEEDED) {
        stats.successfulPayments++;
        stats.totalRevenue += Number(payment.amount);
        stats.byProvider[payment.provider].amount += Number(payment.amount);
      } else if (payment.status === PaymentTransactionStatus.FAILED) {
        stats.failedPayments++;
      } else if (payment.status === PaymentTransactionStatus.REFUNDED) {
        stats.refundedAmount += Number(payment.refundAmount || 0);
      }
    }

    return stats;
  }
}
