# Agent DB Runbook (salon-core)

Цель: агенты поднимают/обновляют БД без участия владельца.

## 1) Предусловия
- Доступ к Postgres.
- В переменной окружения `DATABASE_URL` указана строка подключения.

Пример:
```
DATABASE_URL=postgresql://salon:salon@localhost:5432/salon_core
```

## 2) Применение миграций
Linux/Git Bash:
```
bash scripts/sql/apply_all.sh
```

Windows PowerShell:
```
powershell -ExecutionPolicy Bypass -File scripts/sql/apply_all.ps1
```

Docker (если используется контейнер):
```
docker compose run --rm migrate
```

## 3) Опциональные представления (metrics)
Чтобы включить представления для метрик:
```
RUN_VIEWS=1 bash scripts/sql/apply_all.sh
```
или
```
$env:RUN_VIEWS="1"; powershell -ExecutionPolicy Bypass -File scripts/sql/apply_all.ps1
```

## 4) Проверки после миграций
- Таблицы: `inventory_item`, `inventory_ledger`, `stock_snapshot`, `intake_doc`, `feedback`.
- Поднять флаги:
  - `CORE_DB_WRITE=1`
  - `LOG_TO_DB=1`
  - `METRICS_DB=1` (если нужны KPI из БД)

## 5) Smoke без участия владельца
После миграций агенты должны запустить:
- PowerShell: `scripts/smoke/mvp_no_db_test.ps1`
- Git Bash: `scripts/smoke/mvp_no_db_test.sh`
