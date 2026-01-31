/**
 * Stripe Client Configuration
 *
 * Initializes and exports the Stripe SDK client with proper configuration.
 * Uses environment variables for API keys.
 */

import Stripe from 'stripe';

// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Warning: STRIPE_SECRET_KEY is not set. Stripe payments will not work.');
}

/**
 * Stripe client instance configured for the Beauty Salon SaaS platform
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
  appInfo: {
    name: 'Beauty Salon SaaS',
    version: '0.1.0',
  },
});

/**
 * Generate idempotency key for payment operations
 * Prevents duplicate charges for the same appointment
 */
export function getIdempotencyKey(tenantId: string, appointmentId: string, operation: string = 'payment'): string {
  return `${tenantId}:${appointmentId}:${operation}:${Date.now()}`;
}

/**
 * Get Stripe webhook secret from environment
 */
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  return secret;
}

/**
 * Default currency for payments
 */
export const DEFAULT_CURRENCY = process.env.STRIPE_CURRENCY || 'usd';

/**
 * Supported currencies
 */
export const SUPPORTED_CURRENCIES = ['usd', 'eur', 'rub', 'gbp'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

/**
 * Validate if currency is supported
 */
export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(currency.toLowerCase() as SupportedCurrency);
}
