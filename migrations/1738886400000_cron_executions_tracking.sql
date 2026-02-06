-- Migration: Add cron execution tracking for idempotency
-- Date: 2025-02-05
-- Purpose: Prevent duplicate emails/digests when Vercel retries cron jobs

-- Cron executions tracking table
CREATE TABLE IF NOT EXISTS cron_executions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_name VARCHAR(100) NOT NULL,
  organization_id VARCHAR(255) NOT NULL,
  execution_date DATE NOT NULL,
  execution_hour INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'running',
  metadata JSONB DEFAULT '{}',
  UNIQUE(job_name, organization_id, execution_date, execution_hour)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_cron_executions_job_org_date
  ON cron_executions(job_name, organization_id, execution_date);

CREATE INDEX IF NOT EXISTS idx_cron_executions_started_at
  ON cron_executions(started_at);

-- Add tracking column to track which members received emails today
-- This is used by eod-reminder and daily-eod-email jobs
CREATE TABLE IF NOT EXISTS email_delivery_log (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email_type VARCHAR(100) NOT NULL,
  organization_id VARCHAR(255) NOT NULL,
  member_id VARCHAR(255) NOT NULL,
  member_email VARCHAR(255) NOT NULL,
  delivery_date DATE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'sent',
  error_message TEXT,
  UNIQUE(email_type, organization_id, member_id, delivery_date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_delivery_org_date
  ON email_delivery_log(email_type, organization_id, delivery_date);

CREATE INDEX IF NOT EXISTS idx_email_delivery_sent_at
  ON email_delivery_log(sent_at);

-- Auto-cleanup old records (keep 90 days)
-- This prevents the tables from growing indefinitely
CREATE OR REPLACE FUNCTION cleanup_old_cron_executions()
RETURNS void AS $$
BEGIN
  DELETE FROM cron_executions
  WHERE started_at < NOW() - INTERVAL '90 days';

  DELETE FROM email_delivery_log
  WHERE sent_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
