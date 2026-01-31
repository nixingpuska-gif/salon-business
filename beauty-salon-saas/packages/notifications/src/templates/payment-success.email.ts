/**
 * Payment Success Email Template
 */

export const paymentSuccessEmailRu = `
<h2>Оплата прошла успешно!</h2>
<p>Здравствуйте, <span class="highlight">{{clientName}}</span>!</p>
<p>Ваш платеж успешно обработан.</p>

<div class="info-box">
  <p><strong>Сумма:</strong> {{amount}} {{currency}}</p>
  <p><strong>Способ оплаты:</strong> {{paymentMethod}}</p>
  <p><strong>Номер транзакции:</strong> {{transactionId}}</p>
  {{#if serviceName}}
  <p><strong>Услуга:</strong> {{serviceName}}</p>
  {{/if}}
</div>

{{#if receiptUrl}}
<p style="text-align: center;">
  <a href="{{receiptUrl}}" class="btn">Скачать чек</a>
</p>
{{/if}}

<p>Спасибо за оплату!</p>
`;

export const paymentSuccessEmailEn = `
<h2>Payment Successful!</h2>
<p>Hello, <span class="highlight">{{clientName}}</span>!</p>
<p>Your payment has been successfully processed.</p>

<div class="info-box">
  <p><strong>Amount:</strong> {{amount}} {{currency}}</p>
  <p><strong>Payment method:</strong> {{paymentMethod}}</p>
  <p><strong>Transaction ID:</strong> {{transactionId}}</p>
  {{#if serviceName}}
  <p><strong>Service:</strong> {{serviceName}}</p>
  {{/if}}
</div>

{{#if receiptUrl}}
<p style="text-align: center;">
  <a href="{{receiptUrl}}" class="btn">Download Receipt</a>
</p>
{{/if}}

<p>Thank you for your payment!</p>
`;

export default { ru: paymentSuccessEmailRu, en: paymentSuccessEmailEn };
