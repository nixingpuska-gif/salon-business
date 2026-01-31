# Demo Script (5–7 minutes)
Date: 2026-01-27

Goal: show the owner that analytics and automation already work in a repeatable flow.

## 0) Setup (before demo)
- Docker Desktop running.
- App up and healthy.
- Use mock mode for safe demo.

## 1) Open with problem (30 sec)
Say:
"Owners don’t see real profits, admins drown in routine, and schedules waste capacity.
We solve this with transparent analytics and automation that replaces up to 90% of admin work."

## 2) Health (30 sec)
Command:
```
http://localhost:8080/health
```
Say:
"Core service is live."

## 3) KPI proof (60 sec)
Command:
```
http://localhost:8080/kpi/summary?tenantId=default&period=day
```
Say:
"We can show cancellations, no-shows, utilization, and repeat visits.
This is the backbone of owner transparency."

## 4) Automation proof (90 sec)
Run:
```
npm run smoke:gitbash
```
Say:
"Inbound → booking → queue → send runs end-to-end without manual steps."

## 5) Scheduling value (60 sec)
Say:
"We enforce grid-aligned slots and pack the day to maximize revenue.
Off-peak slots are promoted to smooth demand."

## 6) Close (30 sec)
Say:
"Next, we switch from mock to real providers and collect real evidence.
The system is ready for live validation."

## Optional: Show proof slice doc
- `docs/BEST_ON_MARKET_PROOF.md`
