# OKRs: Best-on-Market Salon Platform
Date: 2026-01-26

## Objective O1: Replace 90% of admin routine with automation
Key Results:
- KR1: >= 90% of booking-related actions are completed without human intervention.
- KR2: <= 10% of client conversations require manual admin reply.
- KR3: >= 95% of reminders and confirmations are delivered automatically.
- KR4: Admin operational time per booking reduced by >= 70% (MVP), >= 90% (target).

## Objective O2: Full owner transparency and accountability
Key Results:
- KR1: Owner can answer revenue/usage/staff questions with drill-down in <2 minutes.
- KR2: KPI dashboard covers revenue, cancellations, no-shows, utilization, repeat visits.
- KR3: Inventory variance is visible with root-cause tags within 24 hours.
- KR4: Post-service feedback coverage >= 80% of completed services.

## Objective O3: Best-in-class scheduling efficiency
Key Results:
- KR1: All offered slots are grid-aligned; no arbitrary times in production.
- KR2: Capacity packing improves daily throughput by >= 10% vs baseline schedule.
- KR3: Off-peak shaping shifts >= 15% of bookings into off-peak windows.

## Objective O4: Reliability at scale
Key Results:
- KR1: 99.9% availability for core booking and messaging paths.
- KR2: End-to-end booking success rate >= 99%.
- KR3: Queue dead-letter rate < 0.5% of total jobs.
- KR4: No data loss during upgrades (proven by upgrade test).

## Objective O5: Compliance and trust
Key Results:
- KR1: 152-FZ compliance checklist completed and signed off.
- KR2: Data localization confirmed for RU users (primary storage in RU).
- KR3: PII masking enabled in logs by default; token rotation runbooks validated.

## Metrics & Instrumentation (must exist)
- Booking success rate (%)
- Admin intervention rate (%)
- Reminder delivery success rate (%)
- Queue dead-letter rate (%)
- Average time to resolve booking intent (sec)
- Utilization (%) by salon and staff
- Cancellations / no-shows (%)
- Repeat visit rate (%)
- Inventory variance (absolute + %)
- Feedback completion rate (%)
