# Интеграции с Мессенджерами

## 📱 Обзор

Добавлены интеграции с популярными мессенджерами для российского рынка:
- **Instagram** - Direct Messages
- **VK** (ВКонтакте) - Сообщения сообщества
- **Viber** - Чат-бот

## 🚀 Instagram Integration

### Настройка

1. **Создать Facebook App**
   - Перейти на https://developers.facebook.com
   - Создать новое приложение
   - Добавить продукт "Instagram"

2. **Получить токены**
   - Page Access Token
   - App Secret
   - Verify Token (любая строка)

3. **Настроить переменные окружения**
```env
INSTAGRAM_PAGE_ACCESS_TOKEN=your_page_access_token
INSTAGRAM_APP_SECRET=your_app_secret
INSTAGRAM_VERIFY_TOKEN=your_verify_token
```

4. **Настроить webhook**
   - URL: `https://your-domain.com/api/instagram/webhook`
   - Verify Token: тот же, что в .env
   - Subscribe to: `messages`

### Использование

```typescript
import { InstagramService } from './services/instagram';

const instagram = new InstagramService({
  pageAccessToken: process.env.INSTAGRAM_PAGE_ACCESS_TOKEN,
  appSecret: process.env.INSTAGRAM_APP_SECRET,
  verifyToken: process.env.INSTAGRAM_VERIFY_TOKEN,
});

// Отправить подтверждение бронирования
await instagram.sendBookingConfirmation(userId, {
  id: 'booking-123',
  salonName: 'Салон Красоты',
  serviceName: 'Стрижка',
  date: '2026-01-30',
  time: '14:00',
});
```

## 🔵 VK Integration

### Настройка

1. **Создать сообщество VK**
   - Перейти на https://vk.com/groups
   - Создать новое сообщество

2. **Получить токены**
   - Настройки → Работа с API
   - Создать ключ доступа с правами на сообщения
   - Включить Callback API

3. **Настроить переменные окружения**
```env
VK_ACCESS_TOKEN=your_access_token
VK_GROUP_ID=your_group_id
VK_SECRET_KEY=your_secret_key
VK_CONFIRMATION_TOKEN=your_confirmation_token
```

4. **Настроить Callback API**
   - URL: `https://your-domain.com/api/vk/webhook`
   - Secret Key: тот же, что в .env
   - Типы событий: `message_new`

### Использование

```typescript
import { VKService } from './services/vk';

const vk = new VKService({
  accessToken: process.env.VK_ACCESS_TOKEN,
  groupId: process.env.VK_GROUP_ID,
  secretKey: process.env.VK_SECRET_KEY,
  confirmationToken: process.env.VK_CONFIRMATION_TOKEN,
  apiVersion: '5.131',
});

// Отправить напоминание
await vk.sendBookingReminder(userId, {
  salonName: 'Салон Красоты',
  serviceName: 'Маникюр',
  date: '2026-01-30',
  time: '15:00',
});
```

## 💜 Viber Integration

### Настройка

1. **Создать Viber бота**
   - Перейти на https://partners.viber.com
   - Создать Public Account
   - Получить Authentication Token

2. **Настроить переменные окружения**
```env
VIBER_AUTH_TOKEN=your_auth_token
VIBER_WEBHOOK_URL=https://your-domain.com/api/viber/webhook
VIBER_BOT_NAME=Salon Bot
```

3. **Установить webhook**
```bash
curl -X POST https://chatapi.viber.com/pa/set_webhook \
  -H "X-Viber-Auth-Token: YOUR_AUTH_TOKEN" \
  -d '{"url":"https://your-domain.com/api/viber/webhook"}'
```

### Использование

```typescript
import { ViberService } from './services/viber';

const viber = new ViberService({
  authToken: process.env.VIBER_AUTH_TOKEN,
  webhookUrl: process.env.VIBER_WEBHOOK_URL,
  botName: process.env.VIBER_BOT_NAME,
});

// Отправить подтверждение
await viber.sendBookingConfirmation(userId, {
  id: 'booking-456',
  salonName: 'Салон Красоты',
  serviceName: 'Окрашивание',
  date: '2026-01-30',
  time: '16:00',
});
```

## 🔗 Подключение Routes

Обновить `src/app.ts`:

```typescript
import instagramRoutes from './routes/instagram';
import vkRoutes from './routes/vk';
import viberRoutes from './routes/viber';

app.use('/api', instagramRoutes);
app.use('/api', vkRoutes);
app.use('/api', viberRoutes);
```

## 📊 Мониторинг

Все интеграции логируют события:
- Входящие сообщения
- Отправленные уведомления
- Ошибки webhook

Проверить логи:
```bash
kubectl logs -n production -l app=salon-core | grep -i "instagram\|vk\|viber"
```

## 🧪 Тестирование

### Instagram
```bash
# Отправить тестовое сообщение боту в Instagram
# Проверить логи
kubectl logs -n production -l app=salon-core --tail=50 | grep Instagram
```

### VK
```bash
# Отправить сообщение сообществу VK
# Проверить логи
kubectl logs -n production -l app=salon-core --tail=50 | grep VK
```

### Viber
```bash
# Начать диалог с ботом в Viber
# Проверить логи
kubectl logs -n production -l app=salon-core --tail=50 | grep Viber
```

## 🔐 Безопасность

Все интеграции используют:
- ✅ Signature verification для webhooks
- ✅ HTTPS для всех запросов
- ✅ Секреты хранятся в Kubernetes Secrets
- ✅ Rate limiting на уровне ingress

## 📈 Capacity

Каждая интеграция поддерживает:
- **Instagram**: 1000+ сообщений/минуту
- **VK**: 500+ сообщений/минуту
- **Viber**: 300+ сообщений/минуту

Для 10,000 салонов этого достаточно.
