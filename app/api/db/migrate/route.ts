import { sql } from "@/lib/db/sql"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Security check: Only allow migration with proper authorization
    // In production, require a secret key or check if tables exist
    const authHeader = request.headers.get("x-migration-key")
    const migrationKey = process.env.MIGRATION_KEY

    // If MIGRATION_KEY is set, require it to match
    if (migrationKey && authHeader !== migrationKey) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid migration key" },
        { status: 401 }
      )
    }

    // In production without a migration key, only allow if tables don't exist yet
    if (process.env.NODE_ENV === "production" && !migrationKey) {
      // Check if users table exists
      const { rows } = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'users'
        )
      `
      if (rows[0]?.exists) {
        return NextResponse.json(
          { success: false, error: "Migration already complete. Set MIGRATION_KEY to re-run." },
          { status: 403 }
        )
      }
    }

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        email_verified BOOLEAN DEFAULT FALSE,
        last_login_at TIMESTAMP WITH TIME ZONE
      )
    `

    // Create organizations table
    await sql`
      CREATE TABLE IF NOT EXISTS organizations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        owner_id VARCHAR(255) NOT NULL,
        settings JSONB DEFAULT '{}',
        subscription JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create organization members table
    // user_id is nullable to support draft members (created before invitation)
    await sql`
      CREATE TABLE IF NOT EXISTS organization_members (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255),
        email VARCHAR(255),
        name VARCHAR(255),
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        department VARCHAR(255) DEFAULT 'General',
        weekly_measurable TEXT,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        invited_by VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active'
      )
    `

    // Migration: Add email and name columns if they don't exist (for existing databases)
    await sql`ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS email VARCHAR(255)`
    await sql`ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS name VARCHAR(255)`

    // Migration: Add timezone, reminder, and manager columns (for existing databases)
    await sql`ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS timezone VARCHAR(100)`
    await sql`ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS eod_reminder_time VARCHAR(10)`
    await sql`ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS manager_id VARCHAR(255)`
    await sql`ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS job_title VARCHAR(255)`
    await sql`ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'`

    // Migration: Make user_id nullable and drop the unique constraint (for existing databases)
    // Note: PostgreSQL doesn't have ALTER COLUMN IF NOT NULL, so we use a DO block
    await sql`
      DO $$
      BEGIN
        -- Make user_id nullable if it isn't already
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'organization_members'
          AND column_name = 'user_id'
          AND is_nullable = 'NO'
        ) THEN
          ALTER TABLE organization_members ALTER COLUMN user_id DROP NOT NULL;
        END IF;

        -- Drop the unique constraint on (organization_id, user_id) if it exists
        -- This allows multiple draft members without user_id conflicts
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'organization_members_organization_id_user_id_key'
        ) THEN
          ALTER TABLE organization_members DROP CONSTRAINT organization_members_organization_id_user_id_key;
        END IF;
      END $$;
    `

    // Create sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        organization_id VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_agent TEXT,
        ip_address VARCHAR(50)
      )
    `

    // Create invitations table
    await sql`
      CREATE TABLE IF NOT EXISTS invitations (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'member',
        department VARCHAR(255) DEFAULT 'General',
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        invited_by VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending'
      )
    `

    // Create rocks table
    await sql`
      CREATE TABLE IF NOT EXISTS rocks (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        progress INTEGER DEFAULT 0,
        due_date DATE,
        status VARCHAR(50) DEFAULT 'on-track',
        bucket VARCHAR(255),
        outcome TEXT,
        done_when JSONB DEFAULT '[]',
        quarter VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create assigned tasks table
    await sql`
      CREATE TABLE IF NOT EXISTS assigned_tasks (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        assignee_id VARCHAR(255) NOT NULL,
        assignee_name VARCHAR(255),
        assigned_by_id VARCHAR(255),
        assigned_by_name VARCHAR(255),
        type VARCHAR(50) DEFAULT 'personal',
        rock_id VARCHAR(255),
        rock_title VARCHAR(500),
        priority VARCHAR(50) DEFAULT 'normal',
        due_date DATE,
        status VARCHAR(50) DEFAULT 'pending',
        completed_at TIMESTAMP WITH TIME ZONE,
        added_to_eod BOOLEAN DEFAULT FALSE,
        eod_report_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create EOD reports table
    await sql`
      CREATE TABLE IF NOT EXISTS eod_reports (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        tasks JSONB DEFAULT '[]',
        challenges TEXT,
        tomorrow_priorities JSONB DEFAULT '[]',
        needs_escalation BOOLEAN DEFAULT FALSE,
        escalation_note TEXT,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(organization_id, user_id, date)
      )
    `

    // Create password reset tokens table
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        used_at TIMESTAMP WITH TIME ZONE
      )
    `

    // Create API keys table for external integrations (MCP, Claude Desktop, etc.)
    await sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        key VARCHAR(255) UNIQUE NOT NULL,
        scopes JSONB DEFAULT '["read", "write"]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_used_at TIMESTAMP WITH TIME ZONE
      )
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token)`
    await sql`CREATE INDEX IF NOT EXISTS idx_password_reset_email ON password_reset_tokens(email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key)`
    await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_members_org_id ON organization_members(organization_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_members_user_id ON organization_members(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_members_email ON organization_members(organization_id, email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_rocks_org_id ON rocks(organization_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_rocks_user_id ON rocks(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON assigned_tasks(organization_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON assigned_tasks(assignee_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token)`

    // ============================================
    // AI COMMAND CENTER TABLES
    // ============================================

    // Admin brain dumps for processing
    await sql`
      CREATE TABLE IF NOT EXISTS admin_brain_dumps (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        admin_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        processed_at TIMESTAMP WITH TIME ZONE,
        tasks_generated INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // AI-extracted insights from EOD reports
    await sql`
      CREATE TABLE IF NOT EXISTS eod_insights (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        eod_report_id VARCHAR(255) NOT NULL,
        completed_items JSONB DEFAULT '[]',
        blockers JSONB DEFAULT '[]',
        sentiment VARCHAR(20),
        sentiment_score INTEGER,
        categories JSONB DEFAULT '[]',
        highlights JSONB DEFAULT '[]',
        ai_summary TEXT,
        follow_up_questions JSONB DEFAULT '[]',
        processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // AI-generated tasks pending approval
    await sql`
      CREATE TABLE IF NOT EXISTS ai_generated_tasks (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        brain_dump_id VARCHAR(255),
        assignee_id VARCHAR(255) NOT NULL,
        assignee_name VARCHAR(255),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        priority VARCHAR(20) DEFAULT 'medium',
        due_date DATE,
        context TEXT,
        status VARCHAR(50) DEFAULT 'pending_approval',
        approved_by VARCHAR(255),
        approved_at TIMESTAMP WITH TIME ZONE,
        converted_task_id VARCHAR(255),
        pushed_to_slack BOOLEAN DEFAULT FALSE,
        pushed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Daily digests
    await sql`
      CREATE TABLE IF NOT EXISTS daily_digests (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        digest_date DATE NOT NULL,
        summary TEXT,
        wins JSONB DEFAULT '[]',
        blockers JSONB DEFAULT '[]',
        concerns JSONB DEFAULT '[]',
        follow_ups JSONB DEFAULT '[]',
        challenge_questions JSONB DEFAULT '[]',
        team_sentiment VARCHAR(20),
        reports_analyzed INTEGER DEFAULT 0,
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(organization_id, digest_date)
      )
    `

    // AI conversation history for copilot
    await sql`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        query TEXT NOT NULL,
        response TEXT,
        context_used JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Notifications table for in-app notifications
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        read BOOLEAN DEFAULT FALSE,
        action_url TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Add AI-related columns to organization_members
    await sql`ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'`
    await sql`ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 100`
    await sql`ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS active_projects JSONB DEFAULT '[]'`
    await sql`ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS slack_user_id VARCHAR(255)`

    // Add Asana Personal Access Token column for individual member sync
    await sql`ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS asana_pat TEXT`
    await sql`ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS asana_workspace_gid VARCHAR(255)`
    await sql`ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS asana_last_sync_at TIMESTAMP WITH TIME ZONE`

    // Add source tracking to assigned_tasks
    await sql`ALTER TABLE assigned_tasks ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual'`
    await sql`ALTER TABLE assigned_tasks ADD COLUMN IF NOT EXISTS ai_context TEXT`
    await sql`ALTER TABLE assigned_tasks ADD COLUMN IF NOT EXISTS asana_gid VARCHAR(255)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_asana_gid ON assigned_tasks(asana_gid)`

    // Add milestones column to rocks table (legacy - kept for compatibility)
    await sql`ALTER TABLE rocks ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '[]'`

    // ============================================
    // ROCK MILESTONES TABLE (proper relational structure)
    // ============================================
    await sql`
      CREATE TABLE IF NOT EXISTS rock_milestones (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        rock_id VARCHAR(255) NOT NULL REFERENCES rocks(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP WITH TIME ZONE,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_rock_milestones_rock_id ON rock_milestones(rock_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_rock_milestones_position ON rock_milestones(rock_id, position)`

    // Add comments column to assigned_tasks table
    await sql`ALTER TABLE assigned_tasks ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'`

    // Add recurrence columns to assigned_tasks table
    await sql`ALTER TABLE assigned_tasks ADD COLUMN IF NOT EXISTS recurrence JSONB`
    await sql`ALTER TABLE assigned_tasks ADD COLUMN IF NOT EXISTS parent_recurring_task_id VARCHAR(255)`

    // AI Command Center indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_brain_dumps_org ON admin_brain_dumps(organization_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_brain_dumps_status ON admin_brain_dumps(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_eod_insights_report ON eod_insights(eod_report_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_eod_insights_org ON eod_insights(organization_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_generated_tasks(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_ai_tasks_org ON ai_generated_tasks(organization_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_digests_date ON daily_digests(organization_id, digest_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_ai_conversations_org ON ai_conversations(organization_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read)`

    // ============================================
    // AUDIT LOGS TABLE
    // ============================================
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        organization_id VARCHAR(255),
        user_id VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        severity VARCHAR(20) DEFAULT 'info',
        resource_type VARCHAR(50),
        resource_id VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Audit log indexes for efficient querying
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity)`
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id)`

    // ============================================
    // WEBHOOK CONFIGURATIONS TABLE
    // ============================================
    await sql`
      CREATE TABLE IF NOT EXISTS webhook_configs (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        organization_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        secret VARCHAR(255),
        events JSONB DEFAULT '[]',
        enabled BOOLEAN DEFAULT TRUE,
        retry_count INTEGER DEFAULT 3,
        last_triggered_at TIMESTAMP WITH TIME ZONE,
        last_status_code INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_webhook_configs_org ON webhook_configs(organization_id)`

    // ============================================
    // WEBHOOK DELIVERIES TABLE (for retry tracking)
    // ============================================
    await sql`
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        webhook_config_id VARCHAR(255) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        response_code INTEGER,
        response_body TEXT,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        delivered_at TIMESTAMP WITH TIME ZONE
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_config ON webhook_deliveries(webhook_config_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status)`

    // ============================================
    // DATA RETENTION POLICIES TABLE
    // ============================================
    await sql`
      CREATE TABLE IF NOT EXISTS data_retention_policies (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        organization_id VARCHAR(255) NOT NULL UNIQUE,
        eod_reports_days INTEGER DEFAULT 365,
        audit_logs_days INTEGER DEFAULT 730,
        ai_conversations_days INTEGER DEFAULT 90,
        notifications_days INTEGER DEFAULT 30,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // ============================================
    // SCHEDULED REPORTS TABLE
    // ============================================
    await sql`
      CREATE TABLE IF NOT EXISTS scheduled_reports (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        organization_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        report_type VARCHAR(50) NOT NULL,
        schedule VARCHAR(50) NOT NULL,
        recipients JSONB DEFAULT '[]',
        config JSONB DEFAULT '{}',
        enabled BOOLEAN DEFAULT TRUE,
        last_run_at TIMESTAMP WITH TIME ZONE,
        next_run_at TIMESTAMP WITH TIME ZONE,
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_scheduled_reports_org ON scheduled_reports(organization_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at)`

    // ============================================
    // RECURRING TASK TEMPLATES TABLE
    // ============================================
    await sql`
      CREATE TABLE IF NOT EXISTS recurring_task_templates (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        organization_id VARCHAR(255) NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        priority VARCHAR(20) DEFAULT 'normal',
        default_assignee_id VARCHAR(255),
        estimated_minutes INTEGER,
        labels JSONB DEFAULT '[]',
        recurrence_rule JSONB NOT NULL,
        next_run_date DATE,
        last_run_date DATE,
        occurrence_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_recurring_templates_org ON recurring_task_templates(organization_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_recurring_templates_next_run ON recurring_task_templates(next_run_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_recurring_templates_active ON recurring_task_templates(is_active)`

    // Add recurring_task_id to assigned_tasks for linking generated tasks
    await sql`ALTER TABLE assigned_tasks ADD COLUMN IF NOT EXISTS recurring_task_id VARCHAR(255)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_recurring_id ON assigned_tasks(recurring_task_id)`

    // Add additional columns to webhook_configs for better tracking
    await sql`ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0`
    await sql`ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS headers JSONB DEFAULT '{}'`

    // Update webhook_deliveries schema for dispatcher compatibility
    await sql`ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS webhook_id VARCHAR(255)`
    await sql`ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS response_status INTEGER`
    await sql`ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS response_time_ms INTEGER`
    await sql`ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 1`
    await sql`ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE`
    await sql`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id)`

    // Update audit_logs schema for improved structure
    await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id VARCHAR(255)`
    await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_type VARCHAR(20) DEFAULT 'user'`
    await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'`

    // ============================================
    // RATE LIMITING TABLE (for serverless compatibility)
    // ============================================
    await sql`
      CREATE TABLE IF NOT EXISTS rate_limit_attempts (
        id SERIAL PRIMARY KEY,
        identifier VARCHAR(255) NOT NULL,
        attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit_attempts(identifier)`
    await sql`CREATE INDEX IF NOT EXISTS idx_rate_limit_attempted_at ON rate_limit_attempts(attempted_at)`
    await sql`CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup ON rate_limit_attempts(identifier, attempted_at)`

    // ============================================
    // CRITICAL PERFORMANCE INDEXES
    // These are essential for production query performance
    // ============================================

    // User lookups (login, profile)
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email))`

    // Session validation (every authenticated request)
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token_expires ON sessions(token, expires_at)`
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_org ON sessions(user_id, organization_id)`

    // Member lookups (permissions, team views)
    await sql`CREATE INDEX IF NOT EXISTS idx_members_user_org ON organization_members(user_id, organization_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_members_org_status ON organization_members(organization_id, status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_members_email_lower ON organization_members(organization_id, LOWER(email))`
    await sql`CREATE INDEX IF NOT EXISTS idx_members_manager ON organization_members(organization_id, manager_id)`

    // Task queries (dashboard, filters)
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_org_assignee ON assigned_tasks(organization_id, assignee_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON assigned_tasks(organization_id, status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_org_due_date ON assigned_tasks(organization_id, due_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON assigned_tasks(assignee_id, status)`

    // Rock queries (quarterly tracking)
    await sql`CREATE INDEX IF NOT EXISTS idx_rocks_org_user ON rocks(organization_id, user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_rocks_org_status ON rocks(organization_id, status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_rocks_org_quarter ON rocks(organization_id, quarter)`

    // EOD report queries (daily submission checks)
    await sql`CREATE INDEX IF NOT EXISTS idx_eod_org_date ON eod_reports(organization_id, date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_eod_user_date ON eod_reports(user_id, date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_eod_org_user_date ON eod_reports(organization_id, user_id, date)`

    // Notification queries (unread counts, user inbox)
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read)`
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)`

    // API key validation
    await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key)`

    // Invitation lookups
    await sql`CREATE INDEX IF NOT EXISTS idx_invitations_org_status ON invitations(organization_id, status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_invitations_email_lower ON invitations(LOWER(email))`

    // Audit log queries (compliance, debugging)
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_org_created ON audit_logs(organization_id, created_at DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_logs(user_id, created_at DESC)`

    // ============================================
    // DATA CLEANUP FUNCTION
    // ============================================
    await sql`
      CREATE OR REPLACE FUNCTION cleanup_expired_data()
      RETURNS void AS $$
      BEGIN
        -- Delete expired sessions
        DELETE FROM sessions WHERE expires_at < NOW();

        -- Delete old rate limit attempts (older than 1 hour)
        DELETE FROM rate_limit_attempts WHERE attempted_at < NOW() - INTERVAL '1 hour';

        -- Delete expired password reset tokens
        DELETE FROM password_reset_tokens WHERE expires_at < NOW();

        -- Delete expired invitations
        DELETE FROM invitations WHERE expires_at < NOW() AND status = 'pending';
      END;
      $$ LANGUAGE plpgsql;
    `

    // ============================================
    // WEEKLY SCORECARD TABLES (EOS-style metrics)
    // ============================================

    // Team member metrics - defines the measurable for each team member
    await sql`
      CREATE TABLE IF NOT EXISTS team_member_metrics (
        id VARCHAR(255) PRIMARY KEY,
        team_member_id VARCHAR(255) NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
        metric_name TEXT NOT NULL,
        weekly_goal INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Partial unique index - only one active metric per member
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_active_metric_per_member
      ON team_member_metrics(team_member_id)
      WHERE is_active = true
    `

    // Weekly metric entries - stores aggregated weekly values
    await sql`
      CREATE TABLE IF NOT EXISTS weekly_metric_entries (
        id VARCHAR(255) PRIMARY KEY,
        team_member_id VARCHAR(255) NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
        metric_id VARCHAR(255) NOT NULL REFERENCES team_member_metrics(id) ON DELETE CASCADE,
        week_ending DATE NOT NULL,
        actual_value INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(team_member_id, week_ending)
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_weekly_entries_week ON weekly_metric_entries(week_ending)`
    await sql`CREATE INDEX IF NOT EXISTS idx_weekly_entries_member ON weekly_metric_entries(team_member_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_team_member_metrics_member ON team_member_metrics(team_member_id)`

    // Add metric_value_today to eod_reports for daily tracking
    await sql`ALTER TABLE eod_reports ADD COLUMN IF NOT EXISTS metric_value_today INTEGER DEFAULT NULL`

    // Add attachments to eod_reports for file/image uploads
    await sql`ALTER TABLE eod_reports ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT NULL`

    // ============================================
    // ORG CHART ROCK PROGRESS TABLE
    // ============================================

    // Tracks individual rock bullet completion for org chart employees
    await sql`
      CREATE TABLE IF NOT EXISTS org_chart_rock_progress (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        employee_name VARCHAR(255) NOT NULL,
        rock_index INTEGER NOT NULL,
        bullet_index INTEGER NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_by VARCHAR(255),
        UNIQUE(employee_name, rock_index, bullet_index)
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_org_chart_rock_progress_employee ON org_chart_rock_progress(employee_name)`
    await sql`CREATE INDEX IF NOT EXISTS idx_org_chart_rock_progress_composite ON org_chart_rock_progress(employee_name, rock_index)`

    // ============================================
    // MA EMPLOYEES TABLE (Org Chart Data Source)
    // ============================================

    // Stores all Modern Amenities employees for the org chart
    // Hierarchy is built from the supervisor field (name matching)
    await sql`
      CREATE TABLE IF NOT EXISTS ma_employees (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        supervisor VARCHAR(255),
        department VARCHAR(100),
        job_title VARCHAR(255),
        responsibilities TEXT,
        notes TEXT,
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_ma_employees_supervisor ON ma_employees(supervisor)`
    await sql`CREATE INDEX IF NOT EXISTS idx_ma_employees_department ON ma_employees(department)`
    await sql`CREATE INDEX IF NOT EXISTS idx_ma_employees_active ON ma_employees(is_active)`

    // Add rocks column to ma_employees for syncing workspace rocks
    await sql`ALTER TABLE ma_employees ADD COLUMN IF NOT EXISTS rocks TEXT`
    await sql`CREATE INDEX IF NOT EXISTS idx_ma_employees_email ON ma_employees(email)`

    // ============================================
    // PRODUCTIVITY TRACKING TABLES (Rize-inspired)
    // ============================================

    // Focus blocks table (manual focus time logging)
    await sql`
      CREATE TABLE IF NOT EXISTS focus_blocks (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        organization_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        category VARCHAR(50) NOT NULL CHECK (category IN ('deep_work', 'meetings', 'admin', 'collaboration', 'learning', 'planning')),
        quality INTEGER CHECK (quality >= 1 AND quality <= 5),
        interruptions INTEGER DEFAULT 0,
        notes TEXT,
        task_id VARCHAR(255),
        rock_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_focus_blocks_user ON focus_blocks(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_focus_blocks_org ON focus_blocks(organization_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_focus_blocks_user_time ON focus_blocks(user_id, start_time)`
    await sql`CREATE INDEX IF NOT EXISTS idx_focus_blocks_org_time ON focus_blocks(organization_id, start_time)`

    // Daily energy/mood tracking
    await sql`
      CREATE TABLE IF NOT EXISTS daily_energy (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        organization_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        energy_level VARCHAR(20) CHECK (energy_level IN ('low', 'medium', 'high', 'peak')),
        mood VARCHAR(10),
        factors JSONB DEFAULT '[]',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(organization_id, user_id, date)
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_daily_energy_user ON daily_energy(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_energy_user_date ON daily_energy(user_id, date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_energy_org_date ON daily_energy(organization_id, date)`

    // User streaks (persistent tracking)
    await sql`
      CREATE TABLE IF NOT EXISTS user_streaks (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        organization_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_submission_date DATE,
        milestone_dates JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(organization_id, user_id)
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON user_streaks(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_user_streaks_org_user ON user_streaks(organization_id, user_id)`

    // Focus score history (daily snapshots)
    await sql`
      CREATE TABLE IF NOT EXISTS focus_score_history (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        organization_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        score INTEGER CHECK (score >= 0 AND score <= 100),
        breakdown JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(organization_id, user_id, date)
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_focus_score_history_user ON focus_score_history(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_focus_score_history_user_date ON focus_score_history(user_id, date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_focus_score_history_org_date ON focus_score_history(organization_id, date)`

    return NextResponse.json({
      success: true,
      message: "Database migration completed successfully (including AI Command Center, Notifications, Audit Logs, Webhooks, Enterprise tables, Weekly Scorecard, Org Chart, and Productivity Tracking)",
    })
  } catch (error) {
    console.error("Migration error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Migration failed",
      },
      { status: 500 }
    )
  }
}
