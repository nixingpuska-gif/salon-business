/**
 * Payment Failed Email Template
 */

export const paymentFailedEmailRu = `
<h2>Ошибка оплаты</h2>
<p>Здравствуйте, <span class="highlight">{{clientName}}</span>!</p>
<p>К сожалению, ваш платеж не был обработан.</p>

<div class="info-box">
  <p><strong>Сумма:</strong> {{amount}} {{currency}}</p>
  <p><strong>Способ оплаты:</strong> {{paymentMethod}}</p>
  {{#if errorMessage}}
  <p><strong>Ошибка:</strong> {{errorMessage}}</p>
  {{/if}}
</div>

<p style="text-align: center;">
  <a href="{{retryUrl}}" class="btn">Повторить оплату</a>
</p>

<p>Если у вас возникли вопросы, свяжитесь с нами по телефону {{salonPhone}}.</p>
`;

export const paymentFailedEmailEn = `
<h2>Payment Failed</h2>
<p>Hello, <span class="highlight">{{clientName}}</span>!</p>
<p>Unfortunately, your payment could not be processed.</p>

<div class="info-box">
  <p><strong>Amount:</strong> {{amount}} {{currency}}</p>
  <p><strong>Payment method:</strong> {{paymentMethod}}</p>
  {{#if errorMessage}}
  <p><strong>Error:</strong> {{errorMessage}}</p>
  {{/if}}
</div>

<p style="text-align: center;">
  <a href="{{retryUrl}}" class="btn">Retry Payment</a>
</p>

<p>If you have any questions, please contact us at {{salonPhone}}.</p>
`;

export default { ru: paymentFailedEmailRu, en: paymentFailedEmailEn };
