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

    const applied = rows.map((r: MigrationInfo) => r.name)
    const lastApplied = rows.length > 0 ? rows[0].name : null
    const lastAppliedAt = rows.length > 0 ? rows[0].run_on : null

    return {
      applied,
      pending: [], // Would need to compare with filesystem migrations
      lastApplied,
      lastAppliedAt,
    }
  } catch (error) {
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
    console.error("Failed to log migration activity")
  }
}
