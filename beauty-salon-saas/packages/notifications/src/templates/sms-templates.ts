/**
 * SMS Templates for Beauty Salon SaaS
 * Plain text templates with Handlebars syntax
 */

// Booking Confirmation SMS
export const bookingConfirmationSmsRu =
  `{{salonName}}: Запись на {{appointmentDate}} в {{appointmentTime}}. ` +
  `{{serviceName}}, мастер {{staffName}}. ` +
  `Подтвердить: {{confirmUrl}}`;

export const bookingConfirmationSmsEn =
  `{{salonName}}: Appointment on {{appointmentDate}} at {{appointmentTime}}. ` +
  `{{serviceName}} with {{staffName}}. ` +
  `Confirm: {{confirmUrl}}`;

// Booking Reminder 24h SMS
export const bookingReminder24hSmsRu =
  `{{salonName}}: Напоминаем о записи завтра в {{appointmentTime}}. ` +
  `{{serviceName}}, мастер {{staffName}}. ` +
  `Перенести: {{rescheduleUrl}}`;

export const bookingReminder24hSmsEn =
  `{{salonName}}: Reminder - appointment tomorrow at {{appointmentTime}}. ` +
  `{{serviceName}} with {{staffName}}. ` +
  `Reschedule: {{rescheduleUrl}}`;

// Booking Reminder 1h SMS
export const bookingReminder1hSmsRu =
  `{{salonName}}: Ждем вас через 1 час! ` +
  `{{serviceName}} в {{appointmentTime}}, мастер {{staffName}}.`;

export const bookingReminder1hSmsEn =
  `{{salonName}}: See you in 1 hour! ` +
  `{{serviceName}} at {{appointmentTime}} with {{staffName}}.`;

export default {
  bookingConfirmation: { ru: bookingConfirmationSmsRu, en: bookingConfirmationSmsEn },
  bookingReminder24h: { ru: bookingReminder24hSmsRu, en: bookingReminder24hSmsEn },
  bookingReminder1h: { ru: bookingReminder1hSmsRu, en: bookingReminder1hSmsEn },
};
