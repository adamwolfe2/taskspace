-- Migration: Webhook Event Deduplication
-- Adds table to track processed webhook events and prevent duplicate processing
-- Date: 2025-02-05

-- ============================================
-- WEBHOOK EVENT TRACKING TABLE
-- ============================================

-- Track processed webhook events to ensure idempotency
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stripe_customer_id TEXT,
  organization_id TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Index for efficient lookups and cleanup queries
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_processed_at
  ON processed_webhook_events(processed_at);

CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_event_type
  ON processed_webhook_events(event_type);

-- Optional: Function to clean up old webhook events (older than 30 days)
-- This can be run periodically to prevent table growth
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM processed_webhook_events
  WHERE processed_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comment on table for documentation
COMMENT ON TABLE processed_webhook_events IS 'Tracks processed webhook events from Stripe to ensure idempotency and prevent duplicate processing';
COMMENT ON FUNCTION cleanup_old_webhook_events() IS 'Deletes webhook events older than 30 days. Should be run periodically via a cron job or scheduled task.';
