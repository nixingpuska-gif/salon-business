/**
 * Booking Confirmation Email Template
 */

export const bookingConfirmationEmailRu = `
<h2>Запись подтверждена!</h2>
<p>Здравствуйте, <span class="highlight">{{clientName}}</span>!</p>
<p>Ваша запись успешно создана.</p>

<div class="info-box">
  <p><strong>Дата:</strong> {{appointmentDate}}</p>
  <p><strong>Время:</strong> {{appointmentTime}}</p>
  <p><strong>Услуга:</strong> {{serviceName}}</p>
  <p><strong>Мастер:</strong> {{staffName}}</p>
  <p><strong>Стоимость:</strong> {{price}} {{currency}}</p>
</div>

<p style="text-align: center;">
  <a href="{{confirmUrl}}" class="btn">Подтвердить</a>
  <a href="{{rescheduleUrl}}" class="btn btn-secondary">Перенести</a>
  <a href="{{cancelUrl}}" class="btn btn-danger">Отменить</a>
</p>

<p>Ждем вас!</p>
`;

export const bookingConfirmationEmailEn = `
<h2>Booking Confirmed!</h2>
<p>Hello, <span class="highlight">{{clientName}}</span>!</p>
<p>Your appointment has been successfully created.</p>

<div class="info-box">
  <p><strong>Date:</strong> {{appointmentDate}}</p>
  <p><strong>Time:</strong> {{appointmentTime}}</p>
  <p><strong>Service:</strong> {{serviceName}}</p>
  <p><strong>Specialist:</strong> {{staffName}}</p>
  <p><strong>Price:</strong> {{price}} {{currency}}</p>
</div>

<p style="text-align: center;">
  <a href="{{confirmUrl}}" class="btn">Confirm</a>
  <a href="{{rescheduleUrl}}" class="btn btn-secondary">Reschedule</a>
  <a href="{{cancelUrl}}" class="btn btn-danger">Cancel</a>
</p>

<p>See you soon!</p>
`;

export default {
  ru: bookingConfirmationEmailRu,
  en: bookingConfirmationEmailEn,
};
