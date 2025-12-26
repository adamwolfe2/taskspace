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
    await sql`
      CREATE TABLE IF NOT EXISTS organization_members (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        department VARCHAR(255) DEFAULT 'General',
        weekly_measurable TEXT,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        invited_by VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        UNIQUE(organization_id, user_id)
      )
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

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token)`
    await sql`CREATE INDEX IF NOT EXISTS idx_password_reset_email ON password_reset_tokens(email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_members_org_id ON organization_members(organization_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_members_user_id ON organization_members(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_rocks_org_id ON rocks(organization_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_rocks_user_id ON rocks(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON assigned_tasks(organization_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON assigned_tasks(assignee_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token)`

    return NextResponse.json({
      success: true,
      message: "Database migration completed successfully",
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
