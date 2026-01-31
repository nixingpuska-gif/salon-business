# DEPLOYMENT CHECKLIST

## Pre-Deployment

### Code & Configuration
- [ ] Все тесты проходят (`npm test`)
- [ ] Load testing выполнен и прошёл успешно
- [ ] Code review завершён
- [ ] Changelog обновлён
- [ ] Версия обновлена в package.json

### Security
- [ ] Секреты не захардкожены в коде
- [ ] `.env` файл не в git
- [ ] `ADMIN_API_TOKEN` сгенерирован и сохранён
- [ ] `ENCRYPTION_SECRET` сгенерирован (для erxes-integrations)
- [ ] SSL сертификаты настроены

### Infrastructure
- [ ] PostgreSQL настроен и доступен
- [ ] Redis настроен и доступен
- [ ] MongoDB настроен (для erxes-integrations)
- [ ] Backup скрипты настроены в cron
- [ ] Мониторинг (Prometheus + Grafana) запущен

### Environment Variables
- [ ] `STRICT_WEBHOOK_SIGNATURE=1`
- [ ] `STRICT_TENANT_CONFIG=1`
- [ ] `ALLOWED_ORIGINS` настроен
- [ ] Database URLs корректны
- [ ] API keys для внешних сервисов настроены

---

## Deployment

### Step 1: Backup
- [ ] Создан backup PostgreSQL
- [ ] Создан backup MongoDB
- [ ] Backup загружен в S3/облако

### Step 2: Deploy
- [ ] Код обновлён (`git pull`)
- [ ] Зависимости установлены (`npm install`)
- [ ] Образы пересобраны (`docker-compose build`)
- [ ] Rolling update выполнен

### Step 3: Verification
- [ ] Health check проходит (`curl /health`)
- [ ] API endpoints отвечают
- [ ] Логи не содержат ошибок
- [ ] Метрики в норме (Grafana)

---

## Post-Deployment

### Monitoring (первые 30 минут)
- [ ] Error rate < 1%
- [ ] P95 latency < 500ms
- [ ] CPU usage < 80%
- [ ] Memory usage стабильна
- [ ] Нет критических алертов

### Smoke Tests
- [ ] Создание бронирования работает
- [ ] Создание контакта работает
- [ ] Webhook обработка работает
- [ ] Queue processing работает

### Documentation
- [ ] Deployment notes добавлены
- [ ] Known issues задокументированы
- [ ] Runbook обновлён (если нужно)

---

## Rollback Plan

Если что-то пошло не так:

1. **Немедленно**:
   ```bash
   git revert HEAD
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

2. **Восстановить БД** (если были миграции):
   ```bash
   ./scripts/restore-backup.sh /backups/postgres/latest.sql.gz
   ```

3. **Уведомить команду** о rollback

---

## Sign-off

- [ ] DevOps Lead: _____________ Date: _______
- [ ] Backend Lead: _____________ Date: _______
- [ ] QA Lead: _____________ Date: _______
