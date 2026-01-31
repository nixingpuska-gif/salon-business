/**
 * Novu Client Configuration
 * Based on ADR-007: Notification Infrastructure (Novu)
 */

import { Novu } from '@novu/node';

// Environment validation
const NOVU_API_KEY = process.env.NOVU_API_KEY;
const NOVU_BACKEND_URL = process.env.NOVU_BACKEND_URL || 'http://localhost:3001';

if (!NOVU_API_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('NOVU_API_KEY environment variable is required in production');
}

/**
 * Novu client singleton
 * Self-hosted instance URL is configurable via NOVU_BACKEND_URL
 */
export const novu = new Novu(NOVU_API_KEY || 'development-key', {
  backendUrl: NOVU_BACKEND_URL,
});

/**
 * Configuration for Novu
 */
export const novuConfig = {
  apiKey: NOVU_API_KEY,
  backendUrl: NOVU_BACKEND_URL,
  webUrl: process.env.NOVU_WEB_URL || 'http://localhost:3002',
  isProduction: process.env.NODE_ENV === 'production',
} as const;

/**
 * Application URL for generating links in notifications
 */
export const appConfig = {
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  webhookSecret: process.env.NOVU_WEBHOOK_SECRET || 'webhook-secret',
} as const;
