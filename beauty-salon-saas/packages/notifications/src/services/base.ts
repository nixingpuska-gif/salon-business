/**
 * Notification Service - Core functionality
 * Based on ADR-007: Notification Infrastructure (Novu)
 */

import { novu, appConfig } from '../novu-client.js';
import {
  WORKFLOWS,
  type WorkflowId,
  type NotificationSubscriber,
  type TriggerNotificationResponse,
  type NotificationPriority,
} from '../types/index.js';

/**
 * Base class for notification operations
 */
export class NotificationServiceBase {
  /**
   * Trigger a notification workflow
   */
  protected async trigger(
    workflowId: WorkflowId,
    subscriber: NotificationSubscriber,
    payload: Record<string, unknown>,
    priority: NotificationPriority = 'tx',
    idempotencyKey?: string
  ): Promise<TriggerNotificationResponse> {
    try {
      const result = await novu.trigger(workflowId, {
        to: {
          subscriberId: subscriber.subscriberId,
          email: subscriber.email,
          phone: subscriber.phone,
          firstName: subscriber.firstName,
          lastName: subscriber.lastName,
          locale: subscriber.locale || 'ru',
        },
        payload: {
          ...payload,
          locale_ru: (subscriber.locale || 'ru') === 'ru',
          locale_en: subscriber.locale === 'en',
        },
        overrides: {
          // Priority: 1 for TX, 10 for MK
          // @ts-expect-error - Novu types may not include priority
          priority: priority === 'tx' ? 1 : 10,
        },
        ...(idempotencyKey && { transactionId: idempotencyKey }),
      });

      return {
        transactionId: result.data?.transactionId || '',
        acknowledged: result.data?.acknowledged || false,
        status: 'triggered',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        transactionId: '',
        acknowledged: false,
        status: 'error',
        error: message,
      };
    }
  }

  /**
   * Generate URLs for notification actions
   */
  protected generateUrls(appointmentId: string) {
    const base = appConfig.appUrl;
    return {
      confirmUrl: `${base}/appointments/${appointmentId}/confirm`,
      rescheduleUrl: `${base}/appointments/${appointmentId}/reschedule`,
      cancelUrl: `${base}/appointments/${appointmentId}/cancel`,
      rebookUrl: `${base}/book`,
    };
  }
}

export { WORKFLOWS };
