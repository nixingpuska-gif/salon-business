# Kubernetes Deployment для 10,000 салонов

## Архитектура

- **Pods**: 20-50 (auto-scaling)
- **CPU**: 500m-2000m per pod
- **Memory**: 512Mi-2Gi per pod
- **Capacity**: 5,000+ RPS
- **Availability**: 99.9%+

## Быстрый старт

### 1. Подготовка секретов

```bash
# Сгенерировать секреты
openssl rand -hex 32  # ADMIN_API_TOKEN
openssl rand -hex 32  # ENCRYPTION_SECRET

# Создать secrets из template
cp k8s/base/secrets.yaml.template k8s/base/secrets.yaml
# Заполнить реальные значения в secrets.yaml

# Применить secrets
kubectl apply -f k8s/base/secrets.yaml
```

### 2. Деплой приложения

```bash
# Применить все манифесты
kubectl apply -f k8s/base/

# Проверить статус
kubectl get pods -n production
kubectl get hpa -n production
```

### 3. Проверка работоспособности

```bash
# Проверить pods
kubectl get pods -n production -l app=salon-core

# Проверить logs
kubectl logs -n production -l app=salon-core --tail=50

# Проверить metrics
kubectl top pods -n production -l app=salon-core
```

## Масштабирование

### Автоматическое (HPA)
- Min: 20 pods
- Max: 50 pods
- Target CPU: 70%
- Target Memory: 80%

### Ручное
```bash
kubectl scale deployment salon-core -n production --replicas=30
```

## Мониторинг

```bash
# Проверить HPA
kubectl get hpa -n production

# Проверить events
kubectl get events -n production --sort-by='.lastTimestamp'

# Проверить resource usage
kubectl top nodes
kubectl top pods -n production
```

## Требования к кластеру

### Минимальная конфигурация:
- **Nodes**: 10-15 worker nodes
- **CPU**: 4 cores per node
- **Memory**: 16GB per node
- **Storage**: 100GB per node

### Рекомендуемая конфигурация:
- **Nodes**: 15-20 worker nodes
- **CPU**: 8 cores per node
- **Memory**: 32GB per node
- **Storage**: 200GB per node

## Следующие шаги

1. Setup PostgreSQL (managed service recommended)
2. Setup Redis Cluster
3. Configure Ingress Controller
4. Setup monitoring (Prometheus + Grafana)
5. Configure CI/CD pipeline
