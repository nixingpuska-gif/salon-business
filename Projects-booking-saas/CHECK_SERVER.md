# Проверка сервера

## Быстрая проверка

1. Открой браузер и перейди на: **http://localhost:3000**
2. Если видишь страницу логина или панель - всё работает! ✅
3. Если видишь "Cannot GET /" - сервер запущен, но ViteExpress не находит клиент

## Что исправлено

1. ✅ Убрана ошибка WhatsApp notifier (теперь не засоряет консоль)
2. ✅ Добавлен явный путь к vite.config.ts в ViteExpress

## Если всё ещё не работает

Перезапусти сервер:

1. Останови текущий процесс (Ctrl+C в терминале где запущен `pnpm dev`)
2. Запусти снова: `pnpm dev`
3. Подожди 10-15 секунд пока Vite соберёт клиент
4. Открой http://localhost:3000

## Логи успешного запуска должны быть:

```
✅ Server running on http://localhost:3000/
✅ Frontend should be available at http://localhost:3000/
[vite-express] Running in development mode
[NotificationService] Reminder worker started
```
