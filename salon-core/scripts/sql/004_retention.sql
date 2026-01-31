-- Retention cleanup (run via cron or scheduler)
-- Adjust interval as needed.

delete from message_log
where created_at < now() - interval '30 days';

delete from job_log
where created_at < now() - interval '30 days';

-- Optional: run vacuum/analyze after large deletions.
-- vacuum (analyze) message_log;
-- vacuum (analyze) job_log;
