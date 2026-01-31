# PostgreSQL Helm Chart

Helm chart для PostgreSQL с master-replica конфигурацией для 10,000+ салонов.

## Архитектура

- **1 Master** (pod-0) - для write операций
- **3 Read Replicas** (pod-1, pod-2, pod-3) - для read операций
- **Streaming Replication** - автоматическая репликация данных
- **Persistent Storage** - 500GB SSD на каждый pod

## Установка

### 1. Подготовка values

```bash
cp values.yaml values-production.yaml

# Отредактировать values-production.yaml:
# - Заполнить auth.postgresPassword
# - Заполнить auth.password
# - Настроить storageClass
```

### 2. Установка chart

```bash
helm install postgresql . \
  --namespace production \
  --values values-production.yaml
```

### 3. Проверка

```bash
# Проверить pods
kubectl get pods -n production -l app.kubernetes.io/name=postgresql

# Проверить services
kubectl get svc -n production | grep postgresql

# Проверить PVC
kubectl get pvc -n production
```

## Подключение

### Master (write operations)

```bash
# Connection string
postgresql://salon:PASSWORD@postgresql-master.production.svc.cluster.local:5432/salon_core
```

### Read Replicas (read operations)

```bash
# Connection string
postgresql://salon:PASSWORD@postgresql-read.production.svc.cluster.local:5432/salon_core
```

## Конфигурация

### Основные параметры

| Параметр | Описание | Значение |
|----------|----------|----------|
| `replication.replicas` | Количество read replicas | `3` |
| `primary.resources.requests.cpu` | CPU для master | `2000m` |
| `primary.resources.requests.memory` | Memory для master | `4Gi` |
| `primary.persistence.size` | Размер диска | `500Gi` |

### Performance Tuning

Chart настроен для высокой нагрузки:

```
max_connections = 500
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 4MB
```

## Мониторинг

Включен postgres_exporter для Prometheus:

```yaml
metrics:
  enabled: true
```

Метрики доступны на порту 9187.

## Backup

Автоматический backup настроен через CronJob:

```yaml
backup:
  enabled: true
  schedule: "0 2 * * *"  # Ежедневно в 2:00
  retention: 30  # Хранить 30 дней
```

## Масштабирование

### Добавить read replicas

```bash
helm upgrade postgresql . \
  --namespace production \
  --values values-production.yaml \
  --set replication.replicas=5
```

### Увеличить ресурсы

```bash
helm upgrade postgresql . \
  --namespace production \
  --values values-production.yaml \
  --set primary.resources.requests.cpu=4000m \
  --set primary.resources.requests.memory=8Gi
```

## Failover

При падении master:
1. Вручную промотировать одну из реплик
2. Обновить connection strings в приложении

Для автоматического failover рекомендуется использовать:
- **Patroni** - для автоматического failover
- **PgBouncer** - для connection pooling

## Troubleshooting

### Проверить репликацию

```bash
# Подключиться к master
kubectl exec -it postgresql-0 -n production -- psql -U salon -d salon_core

# Проверить статус репликации
SELECT * FROM pg_stat_replication;
```

### Проверить lag реплик

```bash
# На master
SELECT client_addr, state, sync_state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes
FROM pg_stat_replication;
```

### Пересоздать реплику

```bash
# Удалить pod реплики
kubectl delete pod postgresql-1 -n production

# StatefulSet автоматически пересоздаст pod
```
