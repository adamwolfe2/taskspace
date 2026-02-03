/**
 * EMERGENCY DATABASE SETUP
 *
 * This creates the workspace table and migrates data in one shot
 * Does NOT use migrations - just raw SQL execution
 */

import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logger } from "@/lib/logger"

export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    logger.info("🚨 EMERGENCY SETUP STARTING")

    const steps = []

    // Step 1: Create workspaces table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS workspaces (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
          organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL,
          type VARCHAR(50) DEFAULT 'team',
          description TEXT,
          settings JSONB DEFAULT '{}',
          is_default BOOLEAN DEFAULT FALSE,
          created_by VARCHAR(255),
          logo_url VARCHAR(500),
          primary_color VARCHAR(50),
          secondary_color VARCHAR(50),
          accent_color VARCHAR(50),
          favicon_url VARCHAR(500),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(organization_id, slug)
        )
      `
      steps.push("✓ Created workspaces table")
      logger.info("✓ Created workspaces table")
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("already exists")) {
        steps.push("⚠ Workspaces table already exists")
      } else {
        throw error
      }
    }

    // Step 2: Create workspace_members table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS workspace_members (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
          workspace_id VARCHAR(255) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          user_id VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'member',
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(workspace_id, user_id)
        )
      `
      steps.push("✓ Created workspace_members table")
      logger.info("✓ Created workspace_members table")
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("already exists")) {
        steps.push("⚠ Workspace_members table already exists")
      } else {
        throw error
      }
    }

    // Step 3: Add workspace_id columns to existing tables (only if tables exist)
    const tables = ["rocks", "assigned_tasks", "eod_reports", "meetings", "focus_blocks", "daily_energy", "user_streaks", "focus_score_history"]

    for (const table of tables) {
      try {
        // First check if table exists
        const { rows: tableCheck } = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = ${table}
          )
        `

        if (!tableCheck[0]?.exists) {
          steps.push(`⊘ Skipped ${table} (table does not exist)`)
          continue
        }

        // Use raw SQL with dynamic table name (admin only, safe context)
        // @ts-expect-error - Dynamic table name for emergency admin operation
        await sql([`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255) REFERENCES workspaces(id) ON DELETE SET NULL`])
        steps.push(`✓ Added workspace_id to ${table}`)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        if (msg.includes("already exists")) {
          steps.push(`⚠ ${table}: workspace_id already exists`)
        } else {
          steps.push(`⚠ ${table}: ${msg.substring(0, 100)}`)
        }
      }
    }

    // Step 4: Create default workspace for your organization
    const orgId = auth.organization.id
    const userId = auth.user.id

    const { rows: existing } = await sql`
      SELECT id FROM workspaces WHERE organization_id = ${orgId} LIMIT 1
    `

    let workspaceId: string

    if (existing.length > 0) {
      workspaceId = existing[0].id as string
      steps.push(`⚠ Workspace already exists: ${workspaceId}`)
    } else {
      const { rows: newWorkspace } = await sql`
        INSERT INTO workspaces (organization_id, name, slug, type, is_default, created_by, description)
        VALUES (
          ${orgId},
          'Default',
          'default',
          'team',
          true,
          ${userId},
          'Default workspace for all organization members'
        )
        RETURNING id
      `
      workspaceId = newWorkspace[0].id as string
      steps.push(`✓ Created default workspace: ${workspaceId}`)
      logger.info(`✓ Created workspace ${workspaceId}`)
    }

    // Step 5: Add all org members to workspace
    const { rows: orgMembers } = await sql`
      SELECT user_id, role FROM organization_members WHERE organization_id = ${orgId}
    `

    for (const member of orgMembers) {
      const memberRole = (member.role === 'owner' || member.role === 'admin') ? 'admin' : 'member'
      try {
        await sql`
          INSERT INTO workspace_members (workspace_id, user_id, role)
          VALUES (${workspaceId}, ${member.user_id}, ${memberRole})
          ON CONFLICT (workspace_id, user_id) DO NOTHING
        `
      } catch (error) {
        // Ignore conflicts
      }
    }
    steps.push(`✓ Added ${orgMembers.length} members to workspace`)

    // Step 6: Migrate data (only from tables that exist)
    let migratedRecords = 0

    // Helper function to safely migrate a table
    const migrateTable = async (tableName: string, isUserBased: boolean) => {
      try {
        // Check if table exists
        const { rows: tableCheck } = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = ${tableName}
          )
        `

        if (!tableCheck[0]?.exists) {
          return 0
        }

        // Check if workspace_id column exists
        const { rows: columnCheck } = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = ${tableName}
            AND column_name = 'workspace_id'
          )
        `

        if (!columnCheck[0]?.exists) {
          return 0
        }

        // Migrate based on table type
        let result
        if (isUserBased) {
          // @ts-expect-error - Dynamic table name for emergency admin operation
          result = await sql([`
            UPDATE ${tableName} SET workspace_id = '${workspaceId}'
            WHERE user_id IN (
              SELECT user_id FROM organization_members WHERE organization_id = '${orgId}'
            ) AND workspace_id IS NULL
          `])
        } else {
          // @ts-expect-error - Dynamic table name for emergency admin operation
          result = await sql([`
            UPDATE ${tableName} SET workspace_id = '${workspaceId}'
            WHERE organization_id = '${orgId}' AND workspace_id IS NULL
          `])
        }

        return result.rowCount || 0
      } catch (error) {
        logger.error({ error }, `Failed to migrate ${tableName}`)
        return 0
      }
    }

    // Migrate org-based tables
    migratedRecords += await migrateTable('assigned_tasks', false)
    migratedRecords += await migrateTable('rocks', false)
    migratedRecords += await migrateTable('eod_reports', false)
    migratedRecords += await migrateTable('meetings', false)

    // Migrate user-based tables
    migratedRecords += await migrateTable('focus_blocks', true)
    migratedRecords += await migrateTable('daily_energy', true)
    migratedRecords += await migrateTable('user_streaks', true)
    migratedRecords += await migrateTable('focus_score_history', true)

    steps.push(`✓ Migrated ${migratedRecords} total records`)
    logger.info(`✓ Migrated ${migratedRecords} records`)

    return NextResponse.json<ApiResponse<{
      workspaceId: string
      steps: string[]
      migratedRecords: number
    }>>({
      success: true,
      data: {
        workspaceId,
        steps,
        migratedRecords
      },
      message: `SUCCESS! Setup complete and ${migratedRecords} records migrated`
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorStack = error instanceof Error ? error.stack : ""

    logger.error({
      message: errorMessage,
      stack: errorStack
    }, "Emergency setup failed")

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: `Setup failed: ${errorMessage}`
      },
      { status: 500 }
    )
  }
})
