# Redis Cluster Helm Chart

Helm chart для Redis Cluster с высокой пропускной способностью для 10,000+ салонов.

## Архитектура

- **6 nodes total**: 3 masters + 3 replicas
- **Automatic sharding** - данные распределяются по 3 мастерам
- **High availability** - каждый мастер имеет реплику
- **Persistent storage** - 100GB SSD на каждый node

## Установка

### 1. Подготовка values

```bash
cp values.yaml values-production.yaml

# Отредактировать values-production.yaml:
# - Заполнить auth.password
# - Настроить storageClass
```

### 2. Установка chart

```bash
helm install redis-cluster . \
  --namespace production \
  --values values-production.yaml
```

### 3. Инициализация кластера

```bash
# Запустить init job для создания кластера
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

### 4. Проверка

```bash
# Проверить pods
kubectl get pods -n production -l app.kubernetes.io/name=redis-cluster

# Проверить cluster status
kubectl exec -it redis-cluster-0 -n production -- redis-cli -a PASSWORD cluster info

# Проверить nodes
kubectl exec -it redis-cluster-0 -n production -- redis-cli -a PASSWORD cluster nodes
```

## Подключение

### Connection string

```bash
redis://redis-cluster.production.svc.cluster.local:6379
```

### Node.js пример

```javascript
const Redis = require('ioredis');

const cluster = new Redis.Cluster([
  {
    host: 'redis-cluster.production.svc.cluster.local',
    port: 6379
  }
], {
  redisOptions: {
    password: 'YOUR_PASSWORD'
  }
});
```

## Конфигурация

### Основные параметры

| Параметр | Описание | Значение |
|----------|----------|----------|
| `cluster.nodes` | Количество nodes | `6` |
| `cluster.replicas` | Replicas на master | `1` |
| `resources.requests.cpu` | CPU request | `500m` |
| `resources.requests.memory` | Memory request | `1Gi` |
| `persistence.size` | Размер диска | `100Gi` |

### Performance Tuning

```
maxmemory 1536mb
maxmemory-policy allkeys-lru
maxclients 10000
```

## Мониторинг

Включен redis_exporter для Prometheus:

```yaml
metrics:
  enabled: true
```

Метрики доступны на порту 9121.

## Масштабирование

### Добавить nodes

```bash
# Увеличить количество nodes
helm upgrade redis-cluster . \
  --namespace production \
  --values values-production.yaml \
  --set cluster.nodes=9

# Добавить новые nodes в кластер
kubectl exec -it redis-cluster-0 -n production -- redis-cli -a PASSWORD \
  --cluster add-node NEW_NODE_IP:6379 redis-cluster-0:6379
```

## Troubleshooting

### Проверить cluster health

```bash
kubectl exec -it redis-cluster-0 -n production -- redis-cli -a PASSWORD cluster info
```

### Проверить slot distribution

```bash
kubectl exec -it redis-cluster-0 -n production -- redis-cli -a PASSWORD cluster slots
```

### Rebalance slots

```bash
kubectl exec -it redis-cluster-0 -n production -- redis-cli -a PASSWORD \
  --cluster rebalance redis-cluster-0:6379
```

### Failover test

```bash
# Удалить master pod
kubectl delete pod redis-cluster-0 -n production

# Проверить автоматический failover
kubectl exec -it redis-cluster-1 -n production -- redis-cli -a PASSWORD cluster nodes
```
