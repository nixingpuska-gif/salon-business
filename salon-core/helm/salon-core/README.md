# Salon Core Helm Chart

Helm chart для деплоя salon-core в Kubernetes для 10,000+ салонов.

## Установка

### 1. Подготовка values

```bash
# Скопировать values.yaml
cp values.yaml values-production.yaml

# Отредактировать values-production.yaml:
# - Заполнить secrets.*
# - Настроить ingress.hosts
# - Настроить image.repository
```

### 2. Установка chart

```bash
# Добавить namespace
kubectl create namespace production

# Установить chart
helm install salon-core . \
  --namespace production \
  --values values-production.yaml

# Или upgrade существующего релиза
helm upgrade --install salon-core . \
  --namespace production \
  --values values-production.yaml
```

### 3. Проверка

```bash
# Проверить pods
kubectl get pods -n production -l app=salon-core

# Проверить HPA
kubectl get hpa -n production

# Проверить logs
kubectl logs -n production -l app=salon-core --tail=50
```

## Конфигурация

### Основные параметры

| Параметр | Описание | Значение по умолчанию |
|----------|----------|----------------------|
| `replicaCount` | Начальное количество реплик | `20` |
| `image.repository` | Docker registry | `your-registry/salon-core` |
| `image.tag` | Версия образа | `latest` |
| `resources.requests.cpu` | CPU request | `500m` |
| `resources.limits.cpu` | CPU limit | `2000m` |
| `resources.requests.memory` | Memory request | `512Mi` |
| `resources.limits.memory` | Memory limit | `2Gi` |

### Auto-scaling

| Параметр | Описание | Значение по умолчанию |
|----------|----------|----------------------|
| `autoscaling.enabled` | Включить HPA | `true` |
| `autoscaling.minReplicas` | Минимум реплик | `20` |
| `autoscaling.maxReplicas` | Максимум реплик | `50` |
| `autoscaling.targetCPUUtilizationPercentage` | Целевая CPU утилизация | `70` |
| `autoscaling.targetMemoryUtilizationPercentage` | Целевая Memory утилизация | `80` |

### Secrets

Все секреты должны быть заполнены в `values-production.yaml`:

```yaml
secrets:
  adminApiToken: "your-token-here"
  databaseUrl: "postgresql://user:pass@host:5432/db"
  redisUrl: "redis://host:6379"
  encryptionSecret: "your-encryption-secret"
  telegramWebhookSecret: "your-telegram-secret"
  whatsappWebhookSecret: "your-whatsapp-secret"
  calcomWebhookSecret: "your-calcom-secret"
```

### Ingress

```yaml
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: api.your-domain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: salon-core-tls
      hosts:
        - api.your-domain.com
```

## Мониторинг

Chart автоматически добавляет аннотации для Prometheus:

```yaml
podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "3000"
  prometheus.io/path: "/metrics"
```

## Обновление

```bash
# Обновить образ
helm upgrade salon-core . \
  --namespace production \
  --values values-production.yaml \
  --set image.tag=v1.2.3

# Изменить количество реплик
helm upgrade salon-core . \
  --namespace production \
  --values values-production.yaml \
  --set autoscaling.minReplicas=30 \
  --set autoscaling.maxReplicas=100
```

## Откат

```bash
# Посмотреть историю
helm history salon-core -n production

# Откатить на предыдущую версию
helm rollback salon-core -n production

# Откатить на конкретную ревизию
helm rollback salon-core 3 -n production
```

## Удаление

```bash
helm uninstall salon-core -n production
```
