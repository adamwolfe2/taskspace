import { sql } from "@vercel/postgres"
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

    // Add source tracking to assigned_tasks
    await sql`ALTER TABLE assigned_tasks ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual'`
    await sql`ALTER TABLE assigned_tasks ADD COLUMN IF NOT EXISTS ai_context TEXT`

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

    return NextResponse.json({
      success: true,
      message: "Database migration completed successfully (including AI Command Center and Notifications tables)",
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
