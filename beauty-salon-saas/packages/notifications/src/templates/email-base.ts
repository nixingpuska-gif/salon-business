/**
 * Email Templates for Beauty Salon SaaS
 * HTML templates with Handlebars syntax for Novu
 */

/**
 * Base email layout wrapper
 */
export const baseEmailLayout = `
<!DOCTYPE html>
<html lang="{{locale}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .content { padding: 30px; color: #333333; line-height: 1.6; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666666; }
    .btn { display: inline-block; padding: 12px 30px; background: #667eea; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
    .btn-secondary { background: #6c757d; }
    .btn-danger { background: #dc3545; }
    .info-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
    .highlight { color: #667eea; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{salonName}}</h1>
    </div>
    <div class="content">
      {{{body}}}
    </div>
    <div class="footer">
      <p>{{salonName}}</p>
      {{#if salonAddress}}<p>{{salonAddress}}</p>{{/if}}
      {{#if salonPhone}}<p>Tel: {{salonPhone}}</p>{{/if}}
      <p style="margin-top: 15px; font-size: 11px;">
        {{#if locale_ru}}
          Вы получили это письмо, потому что записаны в наш салон.
        {{else}}
          You received this email because you have an appointment with us.
        {{/if}}
      </p>
    </div>
  </div>
</body>
</html>
`;

export default baseEmailLayout;
