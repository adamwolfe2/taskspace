/**
 * Database Migration Helper
 *
 * Provides migration status checking and execution utilities.
 * Uses node-pg-migrate for versioned database migrations.
 *
 * Usage:
 * - CLI: npm run migrate (apply pending migrations)
 * - CLI: npm run migrate:status (check migration status)
 * - Code: checkMigrationStatus() (for health checks)
 */

import { sql } from "./sql"
import { logger } from "@/lib/logger"

export interface MigrationStatus {
  applied: string[]
  pending: string[]
  lastApplied: string | null
  lastAppliedAt: Date | null
}

export interface MigrationInfo {
  id: number
  name: string
  run_on: Date
}

/**
 * Check the current migration status
 * Returns list of applied and pending migrations
 */
export async function checkMigrationStatus(): Promise<MigrationStatus> {
  try {
    // Check if pgmigrations table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'pgmigrations'
      )
    `

    if (!tableCheck.rows[0]?.exists) {
      return {
        applied: [],
        pending: ["all"],
        lastApplied: null,
        lastAppliedAt: null,
      }
    }

    // Get applied migrations
    const { rows } = await sql`
      SELECT id, name, run_on
      FROM pgmigrations
      ORDER BY run_on DESC
    `

    const applied = rows.map((r) => r.name as string)
    const lastApplied = rows.length > 0 ? (rows[0].name as string) : null
    const lastAppliedAt = rows.length > 0 ? new Date(rows[0].run_on as string) : null

    return {
      applied,
      pending: [], // Would need to compare with filesystem migrations
      lastApplied,
      lastAppliedAt,
    }
  } catch {
    // If pgmigrations doesn't exist, no migrations have been run
    return {
      applied: [],
      pending: ["initial-schema"],
      lastApplied: null,
      lastAppliedAt: null,
    }
  }
}

/**
 * Check if database is initialized (has required tables)
 */
export async function isDatabaseInitialized(): Promise<boolean> {
  try {
    const { rows } = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'users'
      )
    `
    return rows[0]?.exists === true
  } catch {
    return false
  }
}

/**
 * Get database schema version info for health checks
 */
export async function getDatabaseHealth(): Promise<{
  healthy: boolean
  initialized: boolean
  migrationStatus: MigrationStatus
  error?: string
}> {
  try {
    const initialized = await isDatabaseInitialized()
    const migrationStatus = await checkMigrationStatus()

    return {
      healthy: true,
      initialized,
      migrationStatus,
    }
  } catch (error) {
    return {
      healthy: false,
      initialized: false,
      migrationStatus: {
        applied: [],
        pending: [],
        lastApplied: null,
        lastAppliedAt: null,
      },
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Create performance optimization indexes
 * These indexes improve query performance for common access patterns
 * Safe to run multiple times (uses IF NOT EXISTS)
 */
export async function createOptimizationIndexes(): Promise<{
  created: string[]
  existing: string[]
  errors: string[]
}> {
  const created: string[] = []
  const existing: string[] = []
  const errors: string[] = []

  const indexes = [
    // Organization members - manager lookups
    {
      name: "idx_members_manager_id",
      sql: `CREATE INDEX IF NOT EXISTS idx_members_manager_id ON organization_members(organization_id, manager_id) WHERE manager_id IS NOT NULL`,
    },
    // Organization members - status filtering
    {
      name: "idx_members_org_status",
      sql: `CREATE INDEX IF NOT EXISTS idx_members_org_status ON organization_members(organization_id, status)`,
    },
    // Rocks - quarter-based queries
    {
      name: "idx_rocks_org_quarter",
      sql: `CREATE INDEX IF NOT EXISTS idx_rocks_org_quarter ON rocks(organization_id, quarter, status)`,
    },
    // Tasks - date range filtering
    {
      name: "idx_tasks_org_created",
      sql: `CREATE INDEX IF NOT EXISTS idx_tasks_org_created ON assigned_tasks(organization_id, created_at DESC)`,
    },
    // Tasks - assignee and status filtering
    {
      name: "idx_tasks_assignee_status",
      sql: `CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON assigned_tasks(assignee_id, status)`,
    },
    // EOD reports - organization-wide date queries
    {
      name: "idx_eod_org_date",
      sql: `CREATE INDEX IF NOT EXISTS idx_eod_org_date ON eod_reports(organization_id, date DESC)`,
    },
    // Notifications - unread filtering
    {
      name: "idx_notifications_unread",
      sql: `CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, organization_id, read) WHERE read = FALSE`,
    },
    // Issues - workspace priority sorting
    {
      name: "idx_issues_workspace_priority",
      sql: `CREATE INDEX IF NOT EXISTS idx_issues_workspace_priority ON issues(workspace_id, priority DESC, created_at DESC)`,
    },
    // Weekly metric entries - member and date queries
    {
      name: "idx_metric_entries_member_week",
      sql: `CREATE INDEX IF NOT EXISTS idx_metric_entries_member_week ON weekly_metric_entries(team_member_id, week_ending DESC)`,
    },
  ]

  for (const index of indexes) {
    try {
      // Check if index exists
      const { rows } = await sql`
        SELECT 1 FROM pg_indexes WHERE indexname = ${index.name}
      `

      if (rows.length > 0) {
        existing.push(index.name)
      } else {
        // TODO: postgres.js doesn't support .unsafe() method
        // Index creation needs to be done via migrations instead
        // For now, skip dynamic index creation
        errors.push(`${index.name}: Dynamic index creation not supported with postgres.js - use migrations`)
      }
    } catch (error) {
      errors.push(`${index.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return { created, existing, errors }
}

/**
 * Log migration activity to audit logs
 */
export async function logMigrationActivity(
  action: string,
  details: Record<string, unknown>,
  userId?: string
): Promise<void> {
  try {
    await sql`
      INSERT INTO audit_logs (
        id,
        action,
        severity,
        resource_type,
        actor_id,
        actor_type,
        details,
        created_at
      ) VALUES (
        gen_random_uuid()::text,
        ${action},
        'warning',
        'database',
        ${userId || "system"},
        ${userId ? "user" : "system"},
        ${JSON.stringify(details)}::jsonb,
        NOW()
      )
    `
  } catch {
    // Audit log failure shouldn't break migrations
    logger.error({}, "Failed to log migration activity")
  }
}
