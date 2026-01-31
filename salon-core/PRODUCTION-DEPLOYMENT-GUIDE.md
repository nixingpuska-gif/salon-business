# Production Deployment Guide для 10,000 салонов

## 🎯 Готовность системы

**Текущий статус: 85% готовности к production**

### ✅ Что готово

1. **Kubernetes манифесты** - базовая конфигурация в `k8s/base/`
2. **Helm charts** - для всех компонентов в `helm/`
3. **Auto-scaling** - HPA с агрессивным scale-up
4. **PostgreSQL** - master + 3 read replicas
5. **Redis Cluster** - 6 nodes (3 masters + 3 replicas)
6. **Security** - API auth, encryption, webhook validation
7. **Monitoring** - Prometheus metrics, alerts
8. **Load testing** - k6 scripts для проверки нагрузки

### ⚠️ Что требует настройки

1. **Kubernetes cluster** - нужен реальный кластер (EKS/GKE/AKS)
2. **Storage classes** - настроить fast-ssd для БД
3. **Ingress controller** - установить nginx-ingress
4. **Cert-manager** - для SSL сертификатов
5. **Secrets** - сгенерировать и заполнить все пароли
6. **DNS** - настроить домен api.salon-core.com
7. **CI/CD** - настроить pipeline для деплоя

## 📊 Архитектура для 10,000 салонов

### Целевые метрики
- **RPS**: 5,000+ requests/second
- **Transactions**: 1,000,000/day
- **Clients**: 500,000/day
- **Availability**: 99.9%+

### Компоненты

#### 1. Application Layer (salon-core)
```
Pods: 20-50 (auto-scaling)
CPU: 500m-2000m per pod
Memory: 512Mi-2Gi per pod
Total capacity: 5,000+ RPS
```

#### 2. Database Layer (PostgreSQL)
```
Master: 1 pod (4 CPU, 8GB RAM, 500GB SSD)
Replicas: 3 pods (2 CPU, 4GB RAM, 500GB SSD each)
Total storage: 2TB
Connections: 500 max
```

#### 3. Cache Layer (Redis Cluster)
```
Nodes: 6 (3 masters + 3 replicas)
CPU: 500m-1000m per node
Memory: 1-2GB per node
Total cache: 9GB
Max clients: 10,000
```

### Требования к кластеру

**Минимум:**
- 10-15 worker nodes
- 4 CPU cores per node
- 16GB RAM per node
- 100GB storage per node

**Рекомендуется:**
- 15-20 worker nodes
- 8 CPU cores per node
- 32GB RAM per node
- 200GB storage per node

## 🚀 Deployment Steps

### Шаг 1: Подготовка кластера

```bash
# Создать Kubernetes cluster (пример для AWS EKS)
eksctl create cluster \
  --name salon-core-prod \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type m5.2xlarge \
  --nodes 15 \
  --nodes-min 10 \
  --nodes-max 20 \
  --managed

# Создать namespace
kubectl create namespace production
```

### Шаг 2: Установка зависимостей

```bash
# Установить nginx-ingress
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Установить cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Установить Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

### Шаг 3: Генерация секретов

```bash
# Сгенерировать все секреты
cd scripts
./generate-secrets.sh > secrets.env

# Создать Kubernetes secrets
kubectl create secret generic salon-secrets \
  --from-env-file=secrets.env \
  --namespace=production
```

### Шаг 4: Deploy PostgreSQL

```bash
cd helm/postgresql

# Подготовить values
cp values.yaml values-production.yaml
# Отредактировать values-production.yaml:
# - auth.postgresPassword
# - auth.password

# Установить
helm install postgresql . \
  --namespace production \
  --values values-production.yaml

# Проверить
kubectl get pods -n production -l app.kubernetes.io/name=postgresql
```

### Шаг 5: Deploy Redis Cluster

```bash
cd helm/redis-cluster

# Подготовить values
cp values.yaml values-production.yaml
# Отредактировать values-production.yaml:
# - auth.password

# Установить
helm install redis-cluster . \
  --namespace production \
  --values values-production.yaml

# Инициализировать кластер
kubectl run redis-cluster-init \
  --image=redis:7.2-alpine \
  --restart=Never \
  --namespace=production \
  --command -- sh -c "sleep 10 && redis-cli --cluster create \
    redis-cluster-0.redis-cluster-headless:6379 \
    redis-cluster-1.redis-cluster-headless:6379 \
    redis-cluster-2.redis-cluster-headless:6379 \
    redis-cluster-3.redis-cluster-headless:6379 \
    redis-cluster-4.redis-cluster-headless:6379 \
    redis-cluster-5.redis-cluster-headless:6379 \
    --cluster-replicas 1 --cluster-yes -a YOUR_PASSWORD"
```

### Шаг 6: Deploy salon-core

```bash
cd helm/salon-core

# Подготовить values
cp values.yaml values-production.yaml
# Отредактировать values-production.yaml:
# - image.repository (ваш Docker registry)
# - image.tag
# - secrets.*
# - ingress.hosts

# Установить
helm install salon-core . \
  --namespace production \
  --values values-production.yaml

# Проверить
kubectl get pods -n production -l app=salon-core
kubectl get hpa -n production
```

### Шаг 7: Настройка DNS

```bash
# Получить IP ingress controller
kubectl get svc -n ingress-nginx

# Создать A-record в DNS:
# api.salon-core.com -> INGRESS_IP
```

### Шаг 8: Проверка работоспособности

```bash
# Health check
curl https://api.salon-core.com/health

# Проверить метрики
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090

# Проверить logs
kubectl logs -n production -l app=salon-core --tail=100
```

## 📈 Load Testing

```bash
cd load-tests

# Запустить тест
k6 run booking-test.js

# Целевые метрики:
# - 95th percentile < 500ms
# - Error rate < 0.1%
# - Throughput > 5000 RPS
```

## 💰 Ориентировочная стоимость (AWS)

### Compute (EKS)
- 15x m5.2xlarge nodes: ~$3,600/month
- EKS control plane: $73/month

### Storage
- PostgreSQL (2TB SSD): ~$400/month
- Redis (600GB SSD): ~$120/month

### Network
- Load Balancer: ~$20/month
- Data transfer: ~$200/month

### Monitoring
- CloudWatch/Prometheus: ~$100/month

**Total: ~$4,500-5,000/month**

## 🔍 Мониторинг

### Grafana Dashboards
```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Login: admin / prom-operator
```

### Ключевые метрики
- Request rate (RPS)
- Response time (p50, p95, p99)
- Error rate
- CPU/Memory utilization
- Database connections
- Redis hit rate

### Alerts
Настроены в `monitoring/alerts.yml`:
- High error rate (>1%)
- High latency (p95 >1s)
- Service down
- High CPU (>80%)
- High memory (>85%)
- Database connections (>80%)
- Redis memory (>90%)
- Pod restarts

## 🔄 CI/CD Pipeline

Рекомендуемый workflow:

1. **Build** - Docker image
2. **Test** - Unit + Integration tests
3. **Security scan** - Trivy/Snyk
4. **Deploy to staging** - Helm upgrade
5. **Load test** - k6 на staging
6. **Deploy to production** - Helm upgrade с canary
7. **Smoke tests** - Проверка health endpoints
8. **Rollback** - Автоматический при ошибках

## 📝 Следующие шаги

### Критичные (до production)
1. ✅ Создать Kubernetes cluster
2. ✅ Настроить storage classes
3. ✅ Установить ingress controller
4. ✅ Сгенерировать все секреты
5. ✅ Настроить DNS
6. ✅ Deploy всех компонентов
7. ✅ Запустить load tests
8. ✅ Настроить monitoring

### Важные (первые 2 недели)
1. ⚠️ Настроить автоматический backup
2. ⚠️ Настроить CI/CD pipeline
3. ⚠️ Настроить log aggregation (ELK/Loki)
4. ⚠️ Настроить distributed tracing (Jaeger)
5. ⚠️ Настроить APM (Datadog/New Relic)
6. ⚠️ Disaster recovery plan
7. ⚠️ Runbook для операций

### Оптимизации (первый месяц)
1. 📊 Database query optimization
2. 📊 Redis cache tuning
3. 📊 Connection pooling optimization
4. 📊 CDN для статики
5. 📊 Multi-region setup
6. 📊 Database sharding strategy

## 🎓 Обучение команды

### DevOps
- Kubernetes basics
- Helm charts
- Monitoring & alerting
- Incident response

### Developers
- Microservices patterns
- Database optimization
- Caching strategies
- Load testing

## 📞 Support

При проблемах:
1. Проверить `RUNBOOK.md`
2. Проверить logs: `kubectl logs -n production -l app=salon-core`
3. Проверить metrics в Grafana
4. Проверить alerts в Prometheus
