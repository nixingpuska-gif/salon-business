import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
// Request type from express
import { Public } from '../auth/guards/jwt-auth.guard';
import {
  PaymentsService,
  CreatePaymentDto,
  UpdatePaymentSettingsDto,
} from './payments.service';
import { PaymentTransactionStatus } from './entities/payment.entity';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ============ PAYMENT OPERATIONS ============

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new payment' })
  @ApiResponse({ status: 201, description: 'Payment created' })
  async createPayment(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.createPayment(dto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by ID' })
  async findById(@Param('id') id: string) {
    return this.paymentsService.findById(id);
  }

  @Get('appointment/:appointmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments for appointment' })
  async findByAppointment(@Param('appointmentId') appointmentId: string) {
    return this.paymentsService.findByAppointment(appointmentId);
  }

  @Get('client/:clientId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments for client' })
  @ApiQuery({ name: 'tenantId', required: true })
  async findByClient(
    @Param('clientId') clientId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.paymentsService.findByClient(tenantId, clientId);
  }

  @Get('tenant/:tenantId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments for tenant' })
  @ApiQuery({ name: 'status', required: false, enum: PaymentTransactionStatus })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findByTenant(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: PaymentTransactionStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.findByTenant(tenantId, {
      status,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Put(':id/mark-paid')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark payment as paid (for cash/card on site)' })
  async markAsPaid(@Param('id') id: string) {
    return this.paymentsService.markAsPaid(id);
  }

  @Post(':id/refund')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund payment' })
  async refund(
    @Param('id') id: string,
    @Body('amount') amount?: number,
  ) {
    return this.paymentsService.refund(id, amount);
  }

  // ============ WEBHOOKS ============

  @Post('webhooks/stripe')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async stripeWebhook(
    @Body() payload: any,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.paymentsService.handleStripeWebhook(payload, signature);
    return { received: true };
  }

  @Post('webhooks/yukassa')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'YuKassa webhook endpoint' })
  async yukassaWebhook(@Body() payload: any) {
    await this.paymentsService.handleYuKassaWebhook(payload);
    return { received: true };
  }

  // ============ SETTINGS ============

  @Get('settings/:tenantId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment settings' })
  @ApiQuery({ name: 'branchId', required: false })
  async getSettings(
    @Param('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.paymentsService.getSettings(tenantId, branchId);
  }

  @Put('settings/:tenantId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update payment settings' })
  @ApiQuery({ name: 'branchId', required: false })
  async updateSettings(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdatePaymentSettingsDto,
    @Query('branchId') branchId?: string,
  ) {
    return this.paymentsService.updateSettings(tenantId, dto, branchId);
  }

  // ============ STATISTICS ============

  @Get('statistics/:tenantId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment statistics' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async getStatistics(
    @Param('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.paymentsService.getStatistics(
      tenantId,
      new Date(from),
      new Date(to),
    );
  }
}
