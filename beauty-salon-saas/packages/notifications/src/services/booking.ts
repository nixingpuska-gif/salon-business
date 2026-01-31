/**
 * Booking Notification Service
 */

import { NotificationServiceBase, WORKFLOWS } from './base.js';
import type {
  NotificationSubscriber,
  TriggerNotificationResponse,
  BookingConfirmationPayload,
  BookingReminderPayload,
  BookingCancelledPayload,
} from '../types/index.js';

export class BookingNotificationService extends NotificationServiceBase {
  /**
   * Send booking confirmation (email + sms)
   */
  async sendBookingConfirmation(
    subscriber: NotificationSubscriber,
    data: Omit<BookingConfirmationPayload, 'confirmUrl' | 'rescheduleUrl' | 'cancelUrl'>
  ): Promise<TriggerNotificationResponse> {
    const urls = this.generateUrls(data.appointmentId);

    return this.trigger(
      WORKFLOWS.BOOKING_CONFIRMATION,
      subscriber,
      { ...data, ...urls },
      'tx',
      `booking-confirm-${data.appointmentId}`
    );
  }

  /**
   * Send booking reminder 24h before (sms)
   */
  async sendReminder24h(
    subscriber: NotificationSubscriber,
    data: Omit<BookingReminderPayload, 'reminderType' | 'confirmUrl' | 'rescheduleUrl'>
  ): Promise<TriggerNotificationResponse> {
    const urls = this.generateUrls(data.appointmentId);

    return this.trigger(
      WORKFLOWS.BOOKING_REMINDER_24H,
      subscriber,
      { ...data, ...urls, reminderType: '24h' },
      'tx',
      `reminder-24h-${data.appointmentId}`
    );
  }

  /**
   * Send booking reminder 1h before (sms)
   */
  async sendReminder1h(
    subscriber: NotificationSubscriber,
    data: Omit<BookingReminderPayload, 'reminderType' | 'confirmUrl' | 'rescheduleUrl'>
  ): Promise<TriggerNotificationResponse> {
    const urls = this.generateUrls(data.appointmentId);

    return this.trigger(
      WORKFLOWS.BOOKING_REMINDER_1H,
      subscriber,
      { ...data, ...urls, reminderType: '1h' },
      'tx',
      `reminder-1h-${data.appointmentId}`
    );
  }

  /**
   * Send booking cancelled notification (email + sms)
   */
  async sendBookingCancelled(
    subscriber: NotificationSubscriber,
    data: Omit<BookingCancelledPayload, 'rebookUrl'>
  ): Promise<TriggerNotificationResponse> {
    const urls = this.generateUrls(data.appointmentId);

    return this.trigger(
      WORKFLOWS.BOOKING_CANCELLED,
      subscriber,
      { ...data, rebookUrl: urls.rebookUrl },
      'tx',
      `booking-cancel-${data.appointmentId}`
    );
  }
}
