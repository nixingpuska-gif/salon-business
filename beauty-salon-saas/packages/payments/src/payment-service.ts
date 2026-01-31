/**
 * Payment Service
 *
 * Handles all payment operations including:
 * - Creating payment intents for appointments
 * - Processing successful payments
 * - Handling failed payments
 * - Processing refunds
 * - Managing saved payment methods
 */

import Stripe from 'stripe';
import { stripe, getIdempotencyKey, DEFAULT_CURRENCY, isSupportedCurrency } from './stripe-client';
import { PrismaClient } from '@prisma/client';

// Types for payment operations
export interface CreatePaymentIntentParams {
  tenantId: string;
  appointmentId: string;
  amount: number; // Amount in cents
  currency?: string;
  customerId?: string; // Stripe customer ID for saved cards
  saveCard?: boolean;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

export interface RefundResult {
  refundId: string;
  amount: number;
  status: string;
}

export class PaymentService {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  /**
   * Create a payment intent for an appointment prepayment
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    const {
      tenantId,
      appointmentId,
      amount,
      currency = DEFAULT_CURRENCY,
      customerId,
      saveCard = false,
      metadata = {},
    } = params;

    // Validate currency
    if (!isSupportedCurrency(currency)) {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    // Validate amount
    if (amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    // Get appointment details
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        service: true,
        staff: true,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.tenantId !== tenantId) {
      throw new Error('Appointment does not belong to this tenant');
    }

    // Build payment intent options
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount,
      currency: currency.toLowerCase(),
      metadata: {
        tenant_id: tenantId,
        appointment_id: appointmentId,
        client_id: appointment.clientId,
        service_name: appointment.service.name,
        ...metadata,
      },
      description: `Payment for ${appointment.service.name} - ${appointment.client.name || appointment.client.phone}`,
    };

    // Add customer if provided (for saved cards)
    if (customerId) {
      paymentIntentParams.customer = customerId;
    }

    // Setup for saving card
    if (saveCard && customerId) {
      paymentIntentParams.setup_future_usage = 'off_session';
    }

    // Create payment intent with idempotency key
    const paymentIntent = await stripe.paymentIntents.create(
      paymentIntentParams,
      {
        idempotencyKey: getIdempotencyKey(tenantId, appointmentId),
      }
    );

    // Update appointment with payment intent ID
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        metadata: {
          ...(appointment.metadata as object || {}),
          paymentIntentId: paymentIntent.id,
          paymentStatus: 'pending',
        },
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      amount,
      currency,
    };
  }
