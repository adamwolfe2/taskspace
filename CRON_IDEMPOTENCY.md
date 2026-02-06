# Cron Job Idempotency Implementation

## Overview

This document describes the idempotency mechanisms implemented to prevent duplicate emails and digests when Vercel retries cron jobs.

## Problem

Vercel's cron system may retry jobs multiple times within the same hour if:
- The job times out
- The job returns a non-200 status code
- Network issues occur
- Vercel's infrastructure experiences issues

Without idempotency, this causes:
- **Duplicate emails** sent to team members
- **Duplicate digests** generated for the same day
- **Rate limit exhaustion** on email provider (Resend)
- **Poor user experience** from spam

## Solution

We implemented a two-tier idempotency system:

### 1. Cron Execution Tracking (`cron_executions` table)

**Purpose**: Prevent a cron job from running multiple times in the same hour for the same organization.

**How it works**:
- Before processing each organization, the cron job attempts to insert a record with:
  - `job_name` (e.g., "daily-digest")
  - `organization_id`
  - `execution_date` (YYYY-MM-DD)
  - `execution_hour` (0-23)
- The table has a UNIQUE constraint on these fields
- If the insert succeeds → process the organization
- If the insert fails (duplicate) → skip the organization (already processed this hour)

**Benefits**:
- Prevents entire job from re-running for an org
- Works at the organization level
- Simple, fast lookup

### 2. Email Delivery Tracking (`email_delivery_log` table)

**Purpose**: Prevent sending duplicate emails to individual team members.

**How it works**:
- Before sending an email to each member, check if already sent today:
  - Query `email_delivery_log` for records matching:
    - `email_type` (e.g., "eod-reminder")
    - `organization_id`
    - `member_id`
    - `delivery_date` (YYYY-MM-DD)
- If record exists → skip this member
- If no record → send email and insert delivery record
- Uses UNIQUE constraint on (`email_type`, `organization_id`, `member_id`, `delivery_date`)

**Benefits**:
- Fine-grained deduplication at the member level
- Even if cron execution tracking fails, emails won't duplicate
- Useful for debugging (see who received what)

### 3. Rate Limiting

Added 100ms delay between emails in `daily-eod-email` job to avoid hitting Resend rate limits.

```typescript
// Rate limiting: add 100ms delay between emails
if (emailsSent < activeMembers.length) {
  await new Promise(resolve => setTimeout(resolve, 100))
}
```

## Files Modified

### Migration
- **`migrations/1738886400000_cron_executions_tracking.sql`**
  - Creates `cron_executions` table
  - Creates `email_delivery_log` table
  - Adds cleanup function for old records (90 days)

### Database Layer
- **`lib/db/index.ts`**
  - Added `db.cronExecutions` namespace with:
    - `recordExecution()` - Track cron job execution
    - `markCompleted()` - Mark execution as done
    - `hasExecuted()` - Check if already ran
  - Added `db.emailDeliveryLog` namespace with:
    - `recordDelivery()` - Track email sent
    - `getDeliveredToday()` - Get all delivered emails for a date
    - `hasDelivered()` - Check if already sent

### Cron Jobs
1. **`app/api/cron/daily-digest/route.ts`**
   - Added execution tracking before processing each org
   - Skips org if already processed this hour
   - Still checks digest table for date-based deduplication

2. **`app/api/cron/eod-reminder/route.ts`**
   - Added execution tracking before processing each org
   - Queries delivered emails before sending reminders
   - Skips members who already received reminder today
   - Tracks each email delivery

3. **`app/api/cron/daily-eod-email/route.ts`**
   - Added execution tracking before processing each org
   - Queries delivered emails before sending
   - Skips members who already received email today
   - Tracks each email delivery
   - Added 100ms rate limiting between sends

## Testing

### Manual Testing

To test idempotency locally:

1. **Trigger a cron job** (use Vercel CLI or call endpoint directly):
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-digest
   ```

2. **Immediately trigger it again**:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-digest
   ```

3. **Verify**:
   - Check logs: should see "Already processed this hour" or "Already sent this hour"
   - Check database: only one execution record per org/hour
   - Check email: only one email per member per day

### Database Queries

```sql
-- Check cron executions
SELECT * FROM cron_executions
WHERE execution_date = CURRENT_DATE
ORDER BY started_at DESC;

-- Check email deliveries
SELECT * FROM email_delivery_log
WHERE delivery_date = CURRENT_DATE
ORDER BY sent_at DESC;

-- Find duplicate executions (should be 0)
SELECT job_name, organization_id, execution_date, execution_hour, COUNT(*)
FROM cron_executions
GROUP BY job_name, organization_id, execution_date, execution_hour
HAVING COUNT(*) > 1;

-- Find duplicate emails (should be 0)
SELECT email_type, organization_id, member_id, delivery_date, COUNT(*)
FROM email_delivery_log
GROUP BY email_type, organization_id, member_id, delivery_date
HAVING COUNT(*) > 1;
```

## Cleanup

Old records are automatically cleaned up:
- Records older than 90 days are deleted
- Use the cleanup function: `SELECT cleanup_old_cron_executions();`
- Can be run manually or scheduled

## Edge Cases Handled

1. **Partial failures**: If some emails fail, successful ones are still tracked
2. **Time zone issues**: Uses execution hour in UTC, date in org timezone
3. **Concurrent requests**: Database UNIQUE constraints prevent race conditions
4. **Error recovery**: If tracking insert fails for any reason other than duplicate, job continues
5. **Digest already exists**: Daily digest check still uses existing `daily_digests` table check

## Performance Impact

- **Minimal overhead**: Single SELECT + INSERT per org/member
- **Indexed lookups**: Indexes on commonly queried columns
- **No locking**: Uses optimistic concurrency with UNIQUE constraints

## Future Improvements

1. **Distributed locking**: Use Redis for more robust locking across instances
2. **Exponential backoff**: Add retry logic with backoff for transient failures
3. **Monitoring**: Add alerting for repeated failures
4. **Batch operations**: Group email sends into batches for better performance
