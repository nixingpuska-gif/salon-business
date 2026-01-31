/**
 * Payment Notification Service
 */

import { NotificationServiceBase, WORKFLOWS } from './base.js';
import type {
  NotificationSubscriber,
  TriggerNotificationResponse,
  PaymentSuccessPayload,
  PaymentFailedPayload,
} from '../types/index.js';

export class PaymentNotificationService extends NotificationServiceBase {
  /**
   * Send payment success notification (email only)
   */
  async sendPaymentSuccess(
    subscriber: NotificationSubscriber,
    data: PaymentSuccessPayload
  ): Promise<TriggerNotificationResponse> {
    return this.trigger(
      WORKFLOWS.PAYMENT_SUCCESS,
      subscriber,
      data,
      'tx',
      `payment-success-${data.transactionId}`
    );
  }

  /**
   * Send payment failed notification (email + sms)
   */
  async sendPaymentFailed(
    subscriber: NotificationSubscriber,
    data: Omit<PaymentFailedPayload, 'retryUrl'>
  ): Promise<TriggerNotificationResponse> {
    const retryUrl = data.appointmentId
      ? `${process.env.APP_URL}/appointments/${data.appointmentId}/pay`
      : `${process.env.APP_URL}/payments/retry`;

    return this.trigger(
      WORKFLOWS.PAYMENT_FAILED,
      subscriber,
      { ...data, retryUrl },
      'tx',
      `payment-failed-${data.appointmentId || Date.now()}`
    );
  }
}
