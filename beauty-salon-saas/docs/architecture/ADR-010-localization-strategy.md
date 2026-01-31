# ADR-010: Localization Strategy (i18next)

**Статус**: ✅ Утверждено
**Дата**: 2026-01-22
**Автор**: Architect Agent
**Теги**: localization, i18n, internationalization, open-source

---

## Контекст

Платформа должна поддерживать multiple языки:
- **Russian (RU)** - primary language
- **English (EN)** - secondary language
- Future: Additional languages as needed

**Требования**:
- Frontend (Next.js, React Native) localization
- Backend (email templates, notifications) localization
- Dynamic language switching
- Locale-specific formatting (dates, currency, numbers)
- Translation management
- Type-safe translations (TypeScript)

**Функции**: F-003 (RU/EN Localization)

---

## Решение

**Использовать i18next** - industry-standard internationalization framework.

**GitHub**: https://github.com/i18next/i18next
**Stars**: 7,500+
**License**: MIT

**Ecosystem**:
- `react-i18next` - React bindings
- `next-i18next` - Next.js integration
- `i18next-http-backend` - Dynamic loading
- `i18next-browser-languagedetector` - Auto-detect

---

## Обоснование

### Почему i18next?

#### ✅ Преимущества:

1. **Framework Agnostic**:
   - Works with Next.js, React Native, Node.js
   - Shared translations across platforms

2. **Type-Safe**:
   - Full TypeScript support
   - Auto-completion для translation keys
   - Compile-time checks

3. **Features**:
   - Nested translations
   - Pluralization
   - Interpolation (variables)
   - Formatting (dates, numbers, currency)
   - Namespace support

4. **Performance**:
   - Lazy loading
   - Caching
   - Small bundle size

5. **Developer Experience**:
   - Simple API (`t('key')`)
   - Hot reload в development
   - Good documentation

#### 📊 Metrics:
- **Open-source reuse**: 100%
- **Custom code**: 0% (just configuration)
- **Time savings**: 2 недели → 2 часа

---

## Альтернативы

### Вариант 1: react-intl (FormatJS)
**Статус**: ❌ Отклонён

**Минусы**:
- ❌ More complex API
- ❌ Larger bundle size
- ❌ Less flexible

**Вердикт**: i18next проще и легче.

---

### Вариант 2: Custom Solution
**Статус**: ❌ Отклонён

**Минусы**:
- ❌ 2+ недели разработки
- ❌ Нет pluralization, formatting
- ❌ Нет TypeScript support

**Вердикт**: Reinventing the wheel.

---

## Реализация

### 1. Installation

```bash
# Frontend (Next.js)
npm install i18next react-i18next next-i18next

# Backend (Node.js)
npm install i18next i18next-fs-backend
```

### 2. Configuration (Next.js)

```typescript
// packages/localization/src/i18n.config.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import Backend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'ru',
    supportedLngs: ['ru', 'en'],
    defaultNS: 'common',
    ns: ['common', 'dashboard', 'appointments', 'notifications'],

    interpolation: {
      escapeValue: false, // React already escapes
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator'],
      caches: ['cookie', 'localStorage'],
    },
  })

export default i18n
```

### 3. Translation Files

```json
// public/locales/ru/common.json
{
  "app": {
    "name": "Салон Красоты SaaS",
    "tagline": "Управляйте салоном легко"
  },
  "navigation": {
    "dashboard": "Дашборд",
    "appointments": "Записи",
    "clients": "Клиенты",
    "staff": "Мастера",
    "analytics": "Аналитика",
    "settings": "Настройки"
  },
  "common": {
    "save": "Сохранить",
    "cancel": "Отменить",
    "delete": "Удалить",
    "edit": "Редактировать",
    "search": "Поиск",
    "loading": "Загрузка...",
    "error": "Ошибка",
    "success": "Успешно"
  },
  "date": {
    "today": "Сегодня",
    "tomorrow": "Завтра",
    "yesterday": "Вчера",
    "format": "DD.MM.YYYY"
  }
}
```

```json
// public/locales/en/common.json
{
  "app": {
    "name": "Beauty Salon SaaS",
    "tagline": "Manage your salon easily"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "appointments": "Appointments",
    "clients": "Clients",
    "staff": "Staff",
    "analytics": "Analytics",
    "settings": "Settings"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  },
  "date": {
    "today": "Today",
    "tomorrow": "Tomorrow",
    "yesterday": "Yesterday",
    "format": "MM/DD/YYYY"
  }
}
```

```json
// public/locales/ru/appointments.json
{
  "title": "Записи",
  "create": "Создать запись",
  "status": {
    "planned": "Запланирована",
    "confirmed": "Подтверждена",
    "completed": "Завершена",
    "cancelled": "Отменена",
    "no_show": "Не пришёл"
  },
  "form": {
    "client": "Клиент",
    "service": "Услуга",
    "staff": "Мастер",
    "date": "Дата",
    "time": "Время",
    "duration": "Длительность",
    "price": "Цена",
    "notes": "Примечания"
  },
  "messages": {
    "created": "Запись создана",
    "updated": "Запись обновлена",
    "deleted": "Запись удалена",
    "no_slots": "Нет доступных слотов"
  },
  "stats": {
    "total": "Всего записей",
    "today": "Сегодня",
    "this_week": "На этой неделе",
    "completion_rate": "Процент завершённых"
  }
}
```

### 4. TypeScript Types

```typescript
// packages/localization/src/types.ts
export type Locale = 'ru' | 'en'

export interface TranslationKeys {
  common: {
    app: {
      name: string
      tagline: string
    }
    navigation: {
      dashboard: string
      appointments: string
      clients: string
      staff: string
      analytics: string
      settings: string
    }
    common: {
      save: string
      cancel: string
      delete: string
      edit: string
      search: string
      loading: string
      error: string
      success: string
    }
  }
  appointments: {
    title: string
    create: string
    status: {
      planned: string
      confirmed: string
      completed: string
      cancelled: string
      no_show: string
    }
    // ... more
  }
}

// Type-safe translation function
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: TranslationKeys
  }
}
```

### 5. Usage in Components

```tsx
// apps/admin-panel/components/example.tsx
'use client'

import { useTranslation } from 'react-i18next'

export function AppointmentCard() {
  const { t, i18n } = useTranslation('appointments')

  return (
    <div>
      <h2>{t('title')}</h2>

      {/* With interpolation */}
      <p>{t('messages.created', { date: new Date().toLocaleDateString() })}</p>

      {/* Language switcher */}
      <button onClick={() => i18n.changeLanguage('en')}>EN</button>
      <button onClick={() => i18n.changeLanguage('ru')}>RU</button>

      {/* Current language */}
      <p>Current: {i18n.language}</p>
    </div>
  )
}
```

### 6. Date/Currency Formatting

```typescript
// packages/localization/src/formatters.ts
import { format } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'

const locales = { ru, en: enUS }

export function formatDate(
  date: Date,
  locale: Locale,
  formatStr: string = 'PPP'
): string {
  return format(date, formatStr, { locale: locales[locale] })
}

export function formatCurrency(
  amount: number,
  locale: Locale,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatNumber(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US').format(amount)
}
```

```tsx
// Usage
import { formatDate, formatCurrency } from '@beauty-salon/localization'

const date = formatDate(new Date(), 'ru') // "22 января 2026 г."
const price = formatCurrency(50, 'ru', 'RUB') // "50,00 ₽"
```

### 7. Backend Integration (Notification Templates)

```typescript
// packages/localization/src/backend-i18n.ts
import i18n from 'i18next'
import Backend from 'i18next-fs-backend'
import path from 'path'

i18n.use(Backend).init({
  lng: 'ru',
  fallbackLng: 'ru',
  supportedLngs: ['ru', 'en'],
  backend: {
    loadPath: path.join(__dirname, '../../../public/locales/{{lng}}/{{ns}}.json'),
  },
})

export default i18n
```

```typescript
// Usage in Novu templates
import i18n from '@beauty-salon/localization/backend'

export function getNotificationTemplate(locale: Locale, key: string, vars: any) {
  i18n.changeLanguage(locale)
  return i18n.t(key, vars)
}

// Example
const message = getNotificationTemplate(
  'ru',
  'notifications.reminder_24h',
  {
    clientName: 'Иван',
    appointmentTime: formatDate(appointment.startAt, 'ru'),
    serviceName: 'Стрижка',
  }
)
// "Привет, Иван! Напоминаем о вашей записи: 23.01.2026 в 14:00..."
```

---

## Translation Workflow

### 1. Developer adds new feature
```typescript
// Add translation keys
// public/locales/ru/feature.json
{
  "title": "Новая функция",
  "description": "Описание"
}

// public/locales/en/feature.json
{
  "title": "New Feature",
  "description": "Description"
}
```

### 2. Use in component
```tsx
const { t } = useTranslation('feature')
return <h1>{t('title')}</h1>
```

### 3. Missing translations
```typescript
// i18next автоматически показывает ключ если перевод отсутствует
// "feature.title" (вместо пустой строки)
```

---

## Database Schema (Tenant Language Preference)

```prisma
model Tenant {
  // ... existing fields
  language String @default("ru") // 'ru' | 'en'
  timezone String @default("UTC")
  currency String @default("USD")
}

model Staff {
  // ... existing fields
  preferredLanguage String? @map("preferred_language") // Optional override
}

model Client {
  // ... existing fields
  preferredLanguage String? @map("preferred_language")
}
```

### Dynamic Language Loading

```typescript
// Load tenant language preference
export async function getTenantLanguage(tenantId: string): Promise<Locale> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { language: true },
  })

  return (tenant?.language as Locale) || 'ru'
}

// Use in API routes
export async function GET(request: Request) {
  const tenant = await getCurrentTenant(request)
  const language = await getTenantLanguage(tenant.id)

  i18n.changeLanguage(language)

  return Response.json({
    message: i18n.t('api.success'),
  })
}
```

---

## Performance Optimization

### 1. Lazy Loading (Next.js)

```typescript
// Load only needed namespaces
const { t } = useTranslation(['common', 'appointments'])
// Don't load 'clients', 'staff', etc. until needed
```

### 2. Code Splitting

```typescript
// Separate bundle per language
// webpack auto-splits based on dynamic imports
```

### 3. Caching

```typescript
// Browser caches translations (localStorage)
// Backend caches loaded files
```

---

## Testing

```typescript
describe('Localization', () => {
  it('should translate to Russian', () => {
    i18n.changeLanguage('ru')
    expect(i18n.t('common.save')).toBe('Сохранить')
  })

  it('should translate to English', () => {
    i18n.changeLanguage('en')
    expect(i18n.t('common.save')).toBe('Save')
  })

  it('should interpolate variables', () => {
    i18n.changeLanguage('ru')
    expect(
      i18n.t('appointments.messages.created', { date: '23.01.2026' })
    ).toContain('23.01.2026')
  })
})
```

---

## Success Criteria

✅ All UI strings localized (RU/EN)
✅ Type-safe translations (TypeScript)
✅ Dynamic language switching
✅ Notification templates localized
✅ Date/currency formatting per locale
✅ Zero runtime errors for missing keys

---

## Заключение

i18next предоставляет **100% localization solution** из коробки, экономя **2 недели разработки**.

**Вердикт**: ✅ Утверждено. Интеграция в Week 1 (Priority: High, 2 hours).

---

**Следующие шаги**:
1. Setup i18next в Next.js
2. Создать translation files (RU/EN)
3. Wrap app в I18nextProvider
4. Migrate hardcoded strings to t()
