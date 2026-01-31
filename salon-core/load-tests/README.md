# Load Testing для salon-core

## Установка k6

### Windows
```powershell
choco install k6
```

### Linux/Mac
```bash
brew install k6
```

## Запуск тестов

### Базовый тест
```bash
cd C:\Users\Nicita\repos\salon-core\load-tests
k6 run booking-test.js
```

### С переменными окружения
```bash
k6 run -e BASE_URL=http://localhost:8080 -e ADMIN_API_TOKEN=your-token booking-test.js
```

### Сохранение результатов
```bash
k6 run --out json=results.json booking-test.js
```

## Интерпретация результатов

### Целевые метрики для 1000 салонов:

| Метрика | Целевое значение |
|---------|------------------|
| RPS (requests/sec) | > 500 |
| P95 latency | < 500ms |
| P99 latency | < 1000ms |
| Error rate | < 1% |
| Concurrent users | > 200 |

### Пример хорошего результата:
```
http_req_duration..............: avg=245ms  p(95)=450ms  p(99)=850ms
http_req_failed................: 0.23%
http_reqs......................: 15000 (500/s)
vus............................: 200
```

### Пример плохого результата:
```
http_req_duration..............: avg=1.2s   p(95)=2.5s   p(99)=5s
http_req_failed................: 5.67%
http_reqs......................: 3000 (100/s)
vus............................: 200
```

## Что делать если тесты падают

1. **Высокая latency (> 1s)**
   - Проверить индексы в БД
   - Добавить connection pooling
   - Оптимизировать запросы

2. **Высокий error rate (> 1%)**
   - Проверить логи приложения
   - Увеличить timeout
   - Проверить лимиты БД

3. **Низкий RPS (< 300)**
   - Добавить больше инстансов
   - Оптимизировать код
   - Проверить bottlenecks

## Следующие шаги

После успешного прохождения тестов:
1. Запустить на staging окружении
2. Провести stress test (2x нагрузка)
3. Провести soak test (24 часа)
