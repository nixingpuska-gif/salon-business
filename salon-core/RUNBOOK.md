# PRODUCTION RUNBOOK: salon-core

## Быстрый старт

### Запуск production окружения
```bash
cd C:\Users\Nicita\repos\salon-core
docker-compose -f docker-compose.prod.yml up -d
```

### Проверка статуса
```bash
docker-compose -f docker-compose.prod.yml ps
curl http://localhost/health
```

---

## Мониторинг

### Доступ к системам мониторинга
- **Grafana**: http://localhost:3000 (admin/password)
- **Prometheus**: http://localhost:9090

### Ключевые метрики для отслеживания
- Request rate: > 100 RPS
- P95 latency: < 500ms
- Error rate: < 1%
- CPU usage: < 80%
- Memory usage: < 3GB

---

## Типичные проблемы и решения

### 1. Высокая latency (> 1s)

**Симптомы**: Медленные ответы API

**Диагностика**:
```bash
# Проверить нагрузку на БД
docker exec postgres-master psql -U salon -d salon_core -c "SELECT * FROM pg_stat_activity;"

# Проверить Redis
docker exec redis-master redis-cli INFO stats
```

**Решение**:
- Добавить индексы в БД
- Увеличить connection pool
- Масштабировать горизонтально

### 2. Высокий error rate (> 5%)

**Симптомы**: Много 5xx ошибок

**Диагностика**:
```bash
# Проверить логи
docker-compose -f docker-compose.prod.yml logs --tail=100 salon-core-1

# Проверить алерты
curl http://localhost:9090/api/v1/alerts
```

**Решение**:
- Проверить подключение к БД
- Проверить Redis connectivity
- Перезапустить проблемный инстанс

### 3. Сервис не отвечает

**Симптомы**: Health check fails

**Диагностика**:
```bash
# Проверить статус контейнеров
docker ps -a

# Проверить логи
docker logs salon-core-1 --tail=50
```

**Решение**:
```bash
# Перезапустить сервис
docker-compose -f docker-compose.prod.yml restart salon-core-1

# Если не помогло - пересоздать
docker-compose -f docker-compose.prod.yml up -d --force-recreate salon-core-1
```

---

## Операции

### Деплой новой версии

```bash
# 1. Создать backup
./scripts/backup/backup-postgres.sh

# 2. Обновить код
git pull origin main

# 3. Пересобрать образы
docker-compose -f docker-compose.prod.yml build

# 4. Rolling update (по одному инстансу)
docker-compose -f docker-compose.prod.yml up -d --no-deps --build salon-core-1
# Подождать 2 минуты, проверить health
docker-compose -f docker-compose.prod.yml up -d --no-deps --build salon-core-2
```

### Откат к предыдущей версии

```bash
# 1. Откатить код
git revert HEAD

# 2. Пересобрать и перезапустить
docker-compose -f docker-compose.prod.yml up -d --build
```

### Масштабирование

```bash
# Добавить третий инстанс
docker-compose -f docker-compose.prod.yml up -d --scale salon-core=3

# Обновить nginx upstream (добавить salon-core-3)
```

---

## Backup & Restore

### Создание backup
```bash
./scripts/backup/backup-postgres.sh
```

### Восстановление из backup
```bash
# Остановить приложение
docker-compose -f docker-compose.prod.yml stop salon-core-1 salon-core-2

# Восстановить БД
gunzip -c /backups/postgres/salon_core_20240127.sql.gz | \
  docker exec -i postgres-master psql -U salon -d salon_core

# Запустить приложение
docker-compose -f docker-compose.prod.yml start salon-core-1 salon-core-2
```

---

## Контакты для эскалации

- **DevOps Lead**: [имя] - [контакт]
- **Backend Lead**: [имя] - [контакт]
- **On-call**: [rotation schedule]
