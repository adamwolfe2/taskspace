-- Backfill metric_value_today from task count in EOD reports
-- For reports where metric_value_today is NULL, set it to the number of tasks
-- This enables the weekly scorecard to show actual values from summing daily metrics

-- Step 1: Backfill metric_value_today = number of tasks in each report
UPDATE eod_reports
SET metric_value_today = jsonb_array_length(tasks)
WHERE metric_value_today IS NULL
  AND tasks IS NOT NULL
  AND jsonb_typeof(tasks) = 'array'
  AND jsonb_array_length(tasks) > 0;

-- Step 2: Upsert weekly_metric_entries from the backfilled data
-- For each member with an active metric, sum their daily metric values for each week
INSERT INTO weekly_metric_entries (id, team_member_id, metric_id, week_ending, actual_value, created_at, updated_at)
SELECT
  'wme_' || gen_random_uuid()::text,
  om.id as team_member_id,
  tmm.id as metric_id,
  -- Calculate the Friday of each week (week_ending)
  (er.date + (5 - EXTRACT(ISODOW FROM er.date)::int) * INTERVAL '1 day')::date as week_ending,
  SUM(er.metric_value_today) as actual_value,
  NOW(),
  NOW()
FROM eod_reports er
JOIN organization_members om ON om.user_id = er.user_id AND om.organization_id = er.organization_id
JOIN team_member_metrics tmm ON tmm.team_member_id = om.id AND tmm.is_active = true
WHERE er.metric_value_today IS NOT NULL
  AND er.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY om.id, tmm.id, (er.date + (5 - EXTRACT(ISODOW FROM er.date)::int) * INTERVAL '1 day')::date
ON CONFLICT (team_member_id, week_ending)
DO UPDATE SET
  actual_value = EXCLUDED.actual_value,
  updated_at = NOW();
