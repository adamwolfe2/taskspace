/**
 * V2 Features Migration — Combined
 *
 * Creates all new tables and alters existing tables for the 15 moat-building features.
 * Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS throughout).
 *
 * Tables created:
 * 1. weekly_briefs (F1)
 * 2. meeting_templates (F15)
 * 3. ALTER meetings — ai_summary, ai_action_items, ai_key_decisions (F3)
 * 4. one_on_ones (F4)
 * 5. rock_retrospectives (F5)
 * 6. team_health_snapshots (F6)
 * 7. people_velocity_cache (F7)
 * 8. ALTER clients — portal_show_rocks, portal_show_tasks, portal_branding (F8)
 * 9. eos_health_reports (F9)
 * 10. company_digests (F10)
 * 11. push_subscriptions (F2)
 * 12. automations + automation_logs (F13)
 * 13. scorecard_benchmarks (F14)
 */

import { NextRequest, NextResponse } from "next/server"
import { withDangerousAdmin } from "@/lib/api/middleware"
import type { ApiResponse } from "@/lib/types"
import { logger } from "@/lib/logger"
import { db as vercelDb } from "@vercel/postgres"

export const POST = withDangerousAdmin(async (_request: NextRequest, _auth) => {
  try {
    logger.info("Running V2 features migration (15 features)")

    const client = await vercelDb.connect()

    try {
      await client.query("BEGIN")

      // 1. weekly_briefs (F1: Monday Morning Brief)
      await client.query(`
        CREATE TABLE IF NOT EXISTS weekly_briefs (
          id VARCHAR(255) PRIMARY KEY,
          org_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          week_start DATE NOT NULL,
          content JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(org_id, user_id, week_start)
        )
      `)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_weekly_briefs_user ON weekly_briefs(user_id, org_id)`)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_weekly_briefs_week ON weekly_briefs(week_start)`)
      logger.info("weekly_briefs table ready")

      // 2. meeting_templates (F15: Recurring Meeting Agenda Templates)
      await client.query(`
        CREATE TABLE IF NOT EXISTS meeting_templates (
          id VARCHAR(255) PRIMARY KEY,
          workspace_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          sections JSONB NOT NULL DEFAULT '[]',
          is_default BOOLEAN DEFAULT FALSE,
          created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_meeting_templates_workspace ON meeting_templates(workspace_id)`)
      logger.info("meeting_templates table ready")

      // 3. ALTER meetings for AI intelligence (F3)
      await client.query(`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ai_summary TEXT`)
      await client.query(`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ai_action_items JSONB`)
      await client.query(`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ai_key_decisions JSONB`)
      logger.info("meetings table altered for AI intelligence")

      // 4. one_on_ones (F4: 1-on-1 Module)
      await client.query(`
        CREATE TABLE IF NOT EXISTS one_on_ones (
          id VARCHAR(255) PRIMARY KEY,
          workspace_id VARCHAR(255) NOT NULL,
          manager_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          report_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          scheduled_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE,
          status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
          notes TEXT,
          ai_prep JSONB,
          talking_points JSONB DEFAULT '[]',
          action_items JSONB DEFAULT '[]',
          rating INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_one_on_ones_workspace ON one_on_ones(workspace_id, manager_id, report_id)`)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_one_on_ones_manager ON one_on_ones(manager_id)`)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_one_on_ones_report ON one_on_ones(report_id)`)
      logger.info("one_on_ones table ready")

      // 5. rock_retrospectives (F5: Quarterly Rock Retrospectives)
      await client.query(`
        CREATE TABLE IF NOT EXISTS rock_retrospectives (
          id VARCHAR(255) PRIMARY KEY,
          org_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          workspace_id VARCHAR(255) NOT NULL,
          quarter VARCHAR(10) NOT NULL,
          ai_analysis JSONB NOT NULL DEFAULT '{}',
          completion_rate DECIMAL(5,2),
          total_rocks INTEGER DEFAULT 0,
          completed_rocks INTEGER DEFAULT 0,
          created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(workspace_id, quarter)
        )
      `)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_rock_retro_workspace ON rock_retrospectives(workspace_id)`)
      logger.info("rock_retrospectives table ready")

      // 6. team_health_snapshots (F6: Team Health Pulse Score)
      await client.query(`
        CREATE TABLE IF NOT EXISTS team_health_snapshots (
          id VARCHAR(255) PRIMARY KEY,
          org_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          workspace_id VARCHAR(255) NOT NULL,
          week_start DATE NOT NULL,
          overall_score INTEGER,
          dimensions JSONB NOT NULL DEFAULT '{}',
          computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(workspace_id, week_start)
        )
      `)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_team_health_workspace ON team_health_snapshots(workspace_id, week_start)`)
      logger.info("team_health_snapshots table ready")

      // 7. people_velocity_cache (F7: People Velocity Tracker)
      await client.query(`
        CREATE TABLE IF NOT EXISTS people_velocity_cache (
          id VARCHAR(255) PRIMARY KEY,
          org_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          week_start DATE NOT NULL,
          metrics JSONB NOT NULL DEFAULT '{}',
          computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(org_id, user_id, week_start)
        )
      `)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_people_velocity_user ON people_velocity_cache(user_id, week_start)`)
      logger.info("people_velocity_cache table ready")

      // 8. ALTER clients for portal upgrade (F8)
      await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_show_rocks BOOLEAN DEFAULT FALSE`)
      await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_show_tasks BOOLEAN DEFAULT FALSE`)
      await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_branding JSONB`)
      logger.info("clients table altered for portal upgrade")

      // 9. eos_health_reports (F9: EOS Health Report Card)
      await client.query(`
        CREATE TABLE IF NOT EXISTS eos_health_reports (
          id VARCHAR(255) PRIMARY KEY,
          org_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          workspace_id VARCHAR(255) NOT NULL,
          quarter VARCHAR(10) NOT NULL,
          scores JSONB NOT NULL DEFAULT '{}',
          overall_grade VARCHAR(2),
          ai_analysis TEXT,
          recommendations JSONB DEFAULT '[]',
          created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_eos_health_workspace ON eos_health_reports(workspace_id, quarter)`)
      logger.info("eos_health_reports table ready")

      // 10. company_digests (F10: Company Digest Generator)
      await client.query(`
        CREATE TABLE IF NOT EXISTS company_digests (
          id VARCHAR(255) PRIMARY KEY,
          org_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          workspace_id VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          period_type VARCHAR(20) NOT NULL,
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          content JSONB NOT NULL DEFAULT '{}',
          format VARCHAR(20) DEFAULT 'standard',
          created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_company_digests_workspace ON company_digests(workspace_id)`)
      logger.info("company_digests table ready")

      // 11. push_subscriptions (F2: Mobile Push Notifications)
      await client.query(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          org_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          endpoint TEXT NOT NULL,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, endpoint)
        )
      `)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id, org_id)`)
      logger.info("push_subscriptions table ready")

      // 12. automations + automation_logs (F13: Automation Builder)
      await client.query(`
        CREATE TABLE IF NOT EXISTS automations (
          id VARCHAR(255) PRIMARY KEY,
          org_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          workspace_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          trigger_type VARCHAR(50) NOT NULL,
          trigger_config JSONB DEFAULT '{}',
          actions JSONB NOT NULL DEFAULT '[]',
          is_enabled BOOLEAN DEFAULT TRUE,
          run_count INTEGER DEFAULT 0,
          last_run_at TIMESTAMP WITH TIME ZONE,
          created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_automations_workspace ON automations(workspace_id, trigger_type)`)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_automations_enabled ON automations(workspace_id, is_enabled)`)

      await client.query(`
        CREATE TABLE IF NOT EXISTS automation_logs (
          id VARCHAR(255) PRIMARY KEY,
          automation_id VARCHAR(255) NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
          trigger_event JSONB,
          actions_executed JSONB,
          status VARCHAR(20) NOT NULL DEFAULT 'success',
          error TEXT,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_logs_automation ON automation_logs(automation_id, executed_at DESC)`)
      logger.info("automations + automation_logs tables ready")

      // 13. scorecard_benchmarks (F14: Scorecard Benchmark Mode)
      await client.query(`
        CREATE TABLE IF NOT EXISTS scorecard_benchmarks (
          id VARCHAR(255) PRIMARY KEY,
          org_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          workspace_id VARCHAR(255) NOT NULL,
          metric_name VARCHAR(255) NOT NULL,
          benchmark_value DECIMAL(10,2),
          benchmark_type VARCHAR(20) DEFAULT 'rolling_avg',
          period VARCHAR(20) DEFAULT '13_weeks',
          computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_scorecard_benchmarks_workspace ON scorecard_benchmarks(workspace_id, metric_name)`)
      logger.info("scorecard_benchmarks table ready")

      await client.query("COMMIT")
      logger.info("V2 features migration completed successfully")

      return NextResponse.json<ApiResponse<{ message: string }>>({
        success: true,
        data: {
          message: "V2 migration completed: 10 new tables created, 2 tables altered, 13 features ready",
        },
      })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error }, "V2 features migration failed")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "V2 migration failed: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    )
  }
})
