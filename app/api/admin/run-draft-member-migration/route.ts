/**
 * EMERGENCY: Run draft member rocks migration
 *
 * This endpoint runs the specific migration to add owner_email support.
 * Safe to run multiple times (uses IF NOT EXISTS and IF EXISTS checks).
 */

import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import type { ApiResponse } from "@/lib/types"
import { logger } from "@/lib/logger"
import { db as vercelDb } from "@vercel/postgres"

export const POST = withAdmin(async (request: NextRequest, auth) => {
  // Warn when running in production (allowed since it's behind withAdmin and idempotent)
  if (process.env.NODE_ENV === "production") {
    logger.warn({ userId: auth.user.id, orgId: auth.organization.id }, "run-draft-member-migration called in production environment")
  }

  try {
    logger.info("🚨 RUNNING DRAFT MEMBER ROCKS MIGRATION")

    const client = await vercelDb.connect()

    try {
      // Execute migration in a transaction
      await client.query("BEGIN")

      // Step 1: Make user_id nullable on rocks table (safe to run multiple times)
      await client.query(`
        ALTER TABLE rocks
        ALTER COLUMN user_id DROP NOT NULL
      `)
      logger.info("✓ Made rocks.user_id nullable")

      // Step 2: Add owner_email field (with IF NOT EXISTS check)
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'rocks' AND column_name = 'owner_email'
          ) THEN
            ALTER TABLE rocks ADD COLUMN owner_email VARCHAR(255);
          END IF;
        END $$;
      `)
      logger.info("✓ Added rocks.owner_email column")

      // Step 3: Add check constraint (drop if exists, then create)
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'rocks_owner_check'
          ) THEN
            ALTER TABLE rocks DROP CONSTRAINT rocks_owner_check;
          END IF;
        END $$;
      `)
      await client.query(`
        ALTER TABLE rocks
        ADD CONSTRAINT rocks_owner_check
        CHECK (
          (user_id IS NOT NULL AND owner_email IS NULL) OR
          (user_id IS NULL AND owner_email IS NOT NULL)
        )
      `)
      logger.info("✓ Added rocks ownership check constraint")

      // Step 4: Create index (drop if exists, then create)
      await client.query(`
        DROP INDEX IF EXISTS idx_rocks_owner_email
      `)
      await client.query(`
        CREATE INDEX idx_rocks_owner_email ON rocks(owner_email)
        WHERE owner_email IS NOT NULL
      `)
      logger.info("✓ Created index on rocks.owner_email")

      // Step 5: Handle tasks table (only if it exists - might be called assigned_tasks)
      const { rows: tasksTableCheck } = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'tasks'
        ) as exists
      `)

      if (tasksTableCheck[0].exists) {
        await client.query(`
          ALTER TABLE tasks
          ALTER COLUMN user_id DROP NOT NULL
        `)
        logger.info("✓ Made tasks.user_id nullable")

        await client.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'tasks' AND column_name = 'owner_email'
            ) THEN
              ALTER TABLE tasks ADD COLUMN owner_email VARCHAR(255);
            END IF;
          END $$;
        `)
        logger.info("✓ Added tasks.owner_email column")

        await client.query(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.table_constraints
              WHERE constraint_name = 'tasks_owner_check'
            ) THEN
              ALTER TABLE tasks DROP CONSTRAINT tasks_owner_check;
            END IF;
          END $$;
        `)
        await client.query(`
          ALTER TABLE tasks
          ADD CONSTRAINT tasks_owner_check
          CHECK (
            (user_id IS NOT NULL AND owner_email IS NULL) OR
            (user_id IS NULL AND owner_email IS NOT NULL)
          )
        `)
        logger.info("✓ Added tasks ownership check constraint")

        await client.query(`
          DROP INDEX IF EXISTS idx_tasks_owner_email
        `)
        await client.query(`
          CREATE INDEX idx_tasks_owner_email ON tasks(owner_email)
          WHERE owner_email IS NOT NULL
        `)
        logger.info("✓ Created index on tasks.owner_email")
      } else {
        logger.info("⚠ Tasks table not found, skipping tasks migration (this is okay)")
      }

      // Step 6: Create transfer function (handles only rocks if tasks table doesn't exist)
      const transferFunctionSql = tasksTableCheck[0].exists
        ? `
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

            -- Transfer tasks from email to user_id
            UPDATE tasks
            SET user_id = p_user_id,
                owner_email = NULL,
                updated_at = NOW()
            WHERE owner_email = p_email;
          END;
          $$ LANGUAGE plpgsql;
        `
        : `
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
          END;
          $$ LANGUAGE plpgsql;
        `

      await client.query(transferFunctionSql)
      logger.info("✓ Created transfer_pending_items_to_user function")

      await client.query("COMMIT")
      logger.info("✅ Migration completed successfully!")

      return NextResponse.json<ApiResponse<{ message: string }>>({
        success: true,
        data: { message: "Migration completed successfully" },
        message: "Draft member rocks migration applied"
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
        error: `Migration failed: ${errorMessage}`
      },
      { status: 500 }
    )
  }
})
