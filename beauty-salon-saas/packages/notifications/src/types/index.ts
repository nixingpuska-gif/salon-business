/**
 * Notification Types for Beauty Salon SaaS
 * Based on ADR-007: Notification Infrastructure (Novu)
 */

/**
 * Workflow IDs для Novu - определяют тип уведомления
 */
export const WORKFLOWS = {
  // Booking notifications
  BOOKING_CONFIRMATION: 'booking-confirmation',
  BOOKING_REMINDER_24H: 'booking-reminder-24h',
  BOOKING_REMINDER_1H: 'booking-reminder-1h',
  BOOKING_CANCELLED: 'booking-cancelled',
  BOOKING_RESCHEDULED: 'booking-rescheduled',

  // Payment notifications
  PAYMENT_SUCCESS: 'payment-success',
  PAYMENT_FAILED: 'payment-failed',
  PAYMENT_REFUNDED: 'payment-refunded',

  // Marketing notifications
  REVIEW_REQUEST: 'review-request',
  WINBACK_STAGE_1: 'winback-campaign-stage-1',
  WINBACK_STAGE_2: 'winback-campaign-stage-2',
  PROMO_NOTIFICATION: 'promo-notification',
} as const;

export type WorkflowId = typeof WORKFLOWS[keyof typeof WORKFLOWS];

/**
 * Channel types поддерживаемые системой
 */
export type NotificationChannel =
  | 'email'
  | 'sms'
  | 'telegram'
  | 'whatsapp'
  | 'push'
  | 'in_app';

/**
 * Приоритет уведомлений
 * TX (transactional) = 1 (highest)
 * MK (marketing) = 10 (lowest)
 */
export type NotificationPriority = 'tx' | 'mk';

/**
 * Статус доставки уведомления
 */
export type DeliveryStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced';

/**
 * Subscriber - получатель уведомлений (обычно Client)
 */
export interface NotificationSubscriber {
  subscriberId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  locale?: 'ru' | 'en';
  channels?: {
    telegram_id?: string;
    whatsapp_id?: string;
    instagram_id?: string;
    vk_id?: string;
  };
}

/**
 * Base payload для всех уведомлений
 */
export interface BaseNotificationPayload {
  tenantId: string;
  salonName: string;
  salonPhone?: string;
  salonAddress?: string;
  locale?: 'ru' | 'en';
}

/**
 * Payload для booking confirmation
 */
export interface BookingConfirmationPayload extends BaseNotificationPayload {
  clientName: string;
  appointmentId: string;
  appointmentDate: string; // ISO 8601
  appointmentTime: string; // HH:mm
  serviceName: string;
  staffName: string;
  price: string;
  currency: string;
  confirmUrl: string;
  rescheduleUrl: string;
  cancelUrl: string;
}

/**
 * Payload для booking reminder
 */
export interface BookingReminderPayload extends BaseNotificationPayload {
  clientName: string;
  appointmentId: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
  staffName: string;
  reminderType: '24h' | '1h';
  confirmUrl: string;
  rescheduleUrl: string;
}

/**
 * Payload для booking cancelled
 */
export interface BookingCancelledPayload extends BaseNotificationPayload {
  clientName: string;
  appointmentId: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
  staffName: string;
  cancellationReason?: string;
  cancelledBy: 'client' | 'salon' | 'system';
  rebookUrl: string;
}

/**
 * Payload для payment success
 */
export interface PaymentSuccessPayload extends BaseNotificationPayload {
  clientName: string;
  appointmentId?: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  transactionId: string;
  receiptUrl?: string;
  serviceName?: string;
}

/**
 * Payload для payment failed
 */
export interface PaymentFailedPayload extends BaseNotificationPayload {
  clientName: string;
  appointmentId?: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  errorCode?: string;
  errorMessage?: string;
  retryUrl: string;
}

/**
 * Union type всех payload types
 */
export type NotificationPayload =
  | BookingConfirmationPayload
  | BookingReminderPayload
  | BookingCancelledPayload
  | PaymentSuccessPayload
  | PaymentFailedPayload;

/**
 * Trigger request для отправки уведомления
 */
export interface TriggerNotificationRequest {
  workflowId: WorkflowId;
  subscriber: NotificationSubscriber;
  payload: NotificationPayload;
  priority?: NotificationPriority;
  idempotencyKey?: string;
  overrides?: {
    channels?: NotificationChannel[];
  };
}

/**
 * Response от Novu trigger
 */
export interface TriggerNotificationResponse {
  transactionId: string;
  acknowledged: boolean;
  status: 'triggered' | 'error';
  error?: string;
}

/**
 * Notification activity/status
 */
export interface NotificationActivity {
  transactionId: string;
  status: DeliveryStatus;
  channels: Array<{
    type: NotificationChannel;
    status: DeliveryStatus;
    sentAt?: string;
    deliveredAt?: string;
    error?: string;
  }>;
}

/**
 * Webhook event от Novu
 */
export interface NovuWebhookEvent {
  type:
    | 'notification.sent'
    | 'notification.delivered'
    | 'notification.failed'
    | 'notification.bounced';
  transactionId: string;
  workflowId: string;
  subscriberId: string;
  channel: NotificationChannel;
  payload: Record<string, unknown>;
  error?: string;
  timestamp: string;
}

/**
 * Notification log entry для БД
 */
export interface NotificationLogEntry {
  id: string;
  tenantId: string;
  clientId: string;
  workflowId: WorkflowId;
  transactionId: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
  priority: NotificationPriority;
  payload: Record<string, unknown>;
  error?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}
