/**
 * Run assigned_tasks draft member migration
 *
 * Adds assignee_email support to assigned_tasks so tasks can be pre-assigned
 * to invited (draft) members before they accept their invitation.
 * Safe to run multiple times (uses IF NOT EXISTS and IF EXISTS checks).
 */

import { NextRequest, NextResponse } from "next/server"
import { withDangerousAdmin } from "@/lib/api/middleware"
import type { ApiResponse } from "@/lib/types"
import { logger } from "@/lib/logger"
import { db as vercelDb } from "@vercel/postgres"

export const POST = withDangerousAdmin(async (_request: NextRequest, _auth) => {

  try {
    logger.info("🚨 RUNNING ASSIGNED_TASKS DRAFT MEMBER MIGRATION")

    const client = await vercelDb.connect()

    try {
      await client.query("BEGIN")

      // Step 1: Make assignee_id nullable (safe to run multiple times)
      await client.query(`
        ALTER TABLE assigned_tasks
        ALTER COLUMN assignee_id DROP NOT NULL
      `)
      logger.info("✓ Made assigned_tasks.assignee_id nullable")

      // Step 2: Add assignee_email column (with IF NOT EXISTS check)
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'assigned_tasks' AND column_name = 'assignee_email'
          ) THEN
            ALTER TABLE assigned_tasks ADD COLUMN assignee_email VARCHAR(255);
          END IF;
        END $$;
      `)
      logger.info("✓ Added assigned_tasks.assignee_email column")

      // Step 3: Add check constraint (drop if exists, then create)
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'tasks_assignee_check'
          ) THEN
            ALTER TABLE assigned_tasks DROP CONSTRAINT tasks_assignee_check;
          END IF;
        END $$;
      `)
      await client.query(`
        ALTER TABLE assigned_tasks
        ADD CONSTRAINT tasks_assignee_check
        CHECK (
          (assignee_id IS NOT NULL AND assignee_email IS NULL) OR
          (assignee_id IS NULL AND assignee_email IS NOT NULL)
        )
      `)
      logger.info("✓ Added assigned_tasks assignee check constraint")

      // Step 4: Create index on assignee_email (drop if exists, then create)
      await client.query(`
        DROP INDEX IF EXISTS idx_assigned_tasks_assignee_email
      `)
      await client.query(`
        CREATE INDEX idx_assigned_tasks_assignee_email ON assigned_tasks(assignee_email)
        WHERE assignee_email IS NOT NULL
      `)
      logger.info("✓ Created index on assigned_tasks.assignee_email")

      // Step 5: Update transfer function to also handle assigned_tasks
      await client.query(`
        CREATE OR REPLACE FUNCTION transfer_pending_items_to_user(
          p_email VARCHAR(255),
          p_user_id VARCHAR(255)
        ) RETURNS void AS $$
        BEGIN
          -- Transfer rocks from email to user_id
          UPDATE rocks
          SET user_id = p_user_id,
              owner_email = NULL,
              updated_at = NOW()
          WHERE owner_email = p_email;

          -- Transfer assigned_tasks from email to user_id
          UPDATE assigned_tasks
          SET assignee_id = p_user_id,
              assignee_email = NULL,
              updated_at = NOW()
          WHERE assignee_email = p_email;
        END;
        $$ LANGUAGE plpgsql;
      `)
      logger.info("✓ Updated transfer_pending_items_to_user function to include assigned_tasks")

      await client.query("COMMIT")
      logger.info("✅ assigned_tasks draft member migration completed successfully!")

      return NextResponse.json<ApiResponse<{ message: string }>>({
        success: true,
        data: { message: "Migration completed successfully" },
        message: "assigned_tasks draft member migration applied"
      })

    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    logger.error({ error: errorMessage }, "Migration failed")

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "Migration failed"
      },
      { status: 500 }
    )
  }
})
