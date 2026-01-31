/**
 * Booking Cancelled Email Template
 */

export const bookingCancelledEmailRu = `
<h2>Запись отменена</h2>
<p>Здравствуйте, <span class="highlight">{{clientName}}</span>!</p>
<p>Ваша запись была отменена.</p>

<div class="info-box">
  <p><strong>Дата:</strong> {{appointmentDate}}</p>
  <p><strong>Время:</strong> {{appointmentTime}}</p>
  <p><strong>Услуга:</strong> {{serviceName}}</p>
  <p><strong>Мастер:</strong> {{staffName}}</p>
  {{#if cancellationReason}}
  <p><strong>Причина:</strong> {{cancellationReason}}</p>
  {{/if}}
</div>

<p style="text-align: center;">
  <a href="{{rebookUrl}}" class="btn">Записаться снова</a>
</p>
`;

export const bookingCancelledEmailEn = `
<h2>Booking Cancelled</h2>
<p>Hello, <span class="highlight">{{clientName}}</span>!</p>
<p>Your appointment has been cancelled.</p>

<div class="info-box">
  <p><strong>Date:</strong> {{appointmentDate}}</p>
  <p><strong>Time:</strong> {{appointmentTime}}</p>
  <p><strong>Service:</strong> {{serviceName}}</p>
  <p><strong>Specialist:</strong> {{staffName}}</p>
  {{#if cancellationReason}}
  <p><strong>Reason:</strong> {{cancellationReason}}</p>
  {{/if}}
</div>

<p style="text-align: center;">
  <a href="{{rebookUrl}}" class="btn">Book Again</a>
</p>
`;

export default { ru: bookingCancelledEmailRu, en: bookingCancelledEmailEn };
