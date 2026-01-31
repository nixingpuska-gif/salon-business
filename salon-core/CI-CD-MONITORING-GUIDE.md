# CI/CD и Monitoring Setup Guide

## 🚀 CI/CD Pipeline

### Созданные Workflows

**1. Build Pipeline** (`.github/workflows/build.yml`)
- Автоматический build Docker образов
- Push в GitHub Container Registry (ghcr.io)
- Кэширование слоев для быстрого build
- Триггеры: push в main/develop, tags, pull requests

**2. Deploy Pipeline** (`.github/workflows/deploy.yml`)
- Автоматический deploy в Kubernetes
- Smoke tests после deployment
- Автоматический rollback при ошибках
- Manual trigger с выбором environment и image tag

### Настройка CI/CD

#### 1. Настроить GitHub Secrets

```bash
# В GitHub Settings → Secrets and variables → Actions добавить:

# KUBECONFIG - base64 encoded kubeconfig
cat ~/.kube/config | base64 | pbcopy

# Добавить в GitHub Secrets как KUBECONFIG
```

#### 2. Настроить Container Registry

GitHub Container Registry включен по умолчанию. Для использования другого registry:

```yaml
# В .github/workflows/build.yml изменить:
env:
  REGISTRY: your-registry.com
  IMAGE_NAME: ${{ github.repository }}
```

#### 3. Первый Deploy

```bash
# 1. Push код в main branch
git push origin main

# 2. Build автоматически запустится
# 3. После успешного build, deploy запустится автоматически

# Или manual deploy:
# GitHub → Actions → Deploy to Kubernetes → Run workflow
```

### Использование

**Автоматический deploy:**
```bash
# Push в main → автоматический build и deploy
git commit -m "feat: new feature"
git push origin main
```

**Manual deploy конкретной версии:**
```bash
# GitHub Actions → Deploy to Kubernetes
# Выбрать:
# - Environment: production/staging
# - Image tag: v1.0.0 или main или SHA
```

**Rollback:**
```bash
# Через Helm
helm rollback salon-core -n production

# Или через GitHub Actions
# Deploy предыдущую версию image
```

## 📊 Monitoring Dashboards

### Созданные Dashboards

**1. Application Metrics** (`monitoring/grafana-dashboards/salon-core-app.json`)
- Request Rate (RPS)
- Response Time (p50, p95, p99)
- Error Rate
- CPU/Memory usage
- Active pods
- Database connections
- Redis hit rate

**2. PostgreSQL Metrics** (`monitoring/grafana-dashboards/postgresql.json`)
- Database connections
- Transactions per second
- Replication lag
- Cache hit ratio
- Query duration
- Deadlocks
- Database size
- Locks by type

**3. Redis Cluster Metrics** (`monitoring/grafana-dashboards/redis-cluster.json`)
- Operations per second
- Hit rate
- Memory usage by node
- Connected clients
- Cluster state
- Evicted keys
- Network I/O
- Keys by node

**4. Business Metrics** (`monitoring/grafana-dashboards/business-metrics.json`)
- Bookings per hour
- Active salons/clients
- Revenue (24h)
- Conversion rate
- Top salons
- Bookings by status
- Average booking value
- New clients

### Импорт Dashboards в Grafana

#### Метод 1: Через UI

```bash
# 1. Открыть Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# 2. Открыть http://localhost:3000
# Login: admin / admin

# 3. Dashboards → Import → Upload JSON file
# Загрузить каждый dashboard из monitoring/grafana-dashboards/
```

#### Метод 2: Автоматический через ConfigMap

```bash
# Создать ConfigMap с dashboards
kubectl create configmap grafana-dashboards \
  --from-file=monitoring/grafana-dashboards/ \
  -n monitoring

# Добавить в Grafana deployment:
# volumes:
#   - name: dashboards
#     configMap:
#       name: grafana-dashboards
```

#### Метод 3: Через Grafana Provisioning

Создать файл `monitoring/grafana-provisioning.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-provider
  namespace: monitoring
data:
  dashboards.yaml: |
    apiVersion: 1
    providers:
    - name: 'default'
      orgId: 1
      folder: 'Salon Core'
      type: file
      options:
        path: /var/lib/grafana/dashboards
```

Применить:
```bash
kubectl apply -f monitoring/grafana-provisioning.yaml
```

### Настройка Alerts

Dashboards уже содержат alerts для:
- High Error Rate (>1%)
- High Replication Lag (>10s)

Для активации alerts:

```bash
# 1. Настроить notification channel в Grafana
# Alerting → Notification channels → New channel

# 2. Выбрать тип: Slack, Email, PagerDuty, etc.

# 3. Привязать к dashboards
# Dashboard → Alert → Notifications → Add notification channel
```

## 🔍 Мониторинг в Production

### Доступ к Grafana

```bash
# Port forward
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Открыть http://localhost:3000
# Login: admin / admin
```

### Доступ к Prometheus

```bash
# Port forward
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090

# Открыть http://localhost:9090
```

### Ключевые метрики для мониторинга

**SLIs (Service Level Indicators):**
- Availability: >99.9%
- Latency (p95): <500ms
- Error Rate: <0.1%
- Throughput: >5000 RPS

**Alerts:**
- Error rate >1% → Critical
- Latency p95 >1s → Warning
- Replication lag >10s → Warning
- Service down → Critical

## 📈 Next Steps

### 1. Добавить Application Metrics

В `src/app.ts` добавить Prometheus metrics:

```typescript
import promClient from 'prom-client';

// Create metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

### 2. Добавить Business Metrics

```typescript
const bookingsCreated = new promClient.Counter({
  name: 'bookings_created_total',
  help: 'Total number of bookings created'
});

const revenueTotal = new promClient.Counter({
  name: 'revenue_total',
  help: 'Total revenue in USD'
});
```

### 3. Настроить Log Aggregation

```bash
# Установить Loki
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --set promtail.enabled=true

# Logs будут доступны в Grafana
```

### 4. Добавить Distributed Tracing

```bash
# Установить Jaeger
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/crds/jaegertracing.io_jaegers_crd.yaml
```

## 🎯 Troubleshooting

### CI/CD Issues

**Build fails:**
```bash
# Проверить logs
gh run view --log

# Локальный build
docker build -t salon-core:test .
```

**Deploy fails:**
```bash
# Проверить pods
kubectl get pods -n production

# Проверить logs
kubectl logs -n production -l app=salon-core --tail=100

# Rollback
helm rollback salon-core -n production
```

### Monitoring Issues

**Dashboards не показывают данные:**
```bash
# Проверить Prometheus targets
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
# Открыть http://localhost:9090/targets

# Проверить metrics endpoint
kubectl port-forward -n production svc/salon-core 3000:80
curl http://localhost:3000/metrics
```

**Alerts не работают:**
```bash
# Проверить Alertmanager
kubectl get pods -n monitoring | grep alertmanager

# Проверить конфигурацию
kubectl get configmap -n monitoring prometheus-kube-prometheus-prometheus -o yaml
```
