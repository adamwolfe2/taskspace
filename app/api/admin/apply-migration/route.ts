/**
 * One-time migration runner — no session required, secret header only.
 * Applies any missing migrations by running all SQL files with IF NOT EXISTS.
 * Safe to call multiple times.
 */
import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/sql"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_OPS_SECRET
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_OPS_SECRET not configured" }, { status: 403 })
  }

  const headerSecret = request.headers.get("x-admin-secret") || ""
  if (
    headerSecret.length !== secret.trim().length ||
    !crypto.timingSafeEqual(Buffer.from(headerSecret), Buffer.from(secret.trim()))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const results: { step: string; status: string; error?: string }[] = []

  // Apply each migration step safely (all use IF NOT EXISTS)
  const steps: { name: string; query: string }[] = [
    {
      name: "quarterly_reports table",
      query: `
        CREATE TABLE IF NOT EXISTS quarterly_reports (
          id            VARCHAR(255) PRIMARY KEY,
          org_id        VARCHAR(255) NOT NULL,
          workspace_id  VARCHAR(255) NOT NULL,
          quarter       VARCHAR(20)  NOT NULL,
          period_start  DATE         NOT NULL,
          period_end    DATE         NOT NULL,
          title         VARCHAR(500) NOT NULL DEFAULT '',
          status        VARCHAR(20)  NOT NULL DEFAULT 'draft',
          public_token  VARCHAR(255) UNIQUE,
          data          JSONB        NOT NULL DEFAULT '{}',
          created_by    VARCHAR(255),
          created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `,
    },
    {
      name: "idx_quarterly_reports_workspace",
      query: `CREATE INDEX IF NOT EXISTS idx_quarterly_reports_workspace ON quarterly_reports(workspace_id, org_id, created_at DESC)`,
    },
    {
      name: "idx_quarterly_reports_token",
      query: `CREATE INDEX IF NOT EXISTS idx_quarterly_reports_token ON quarterly_reports(public_token) WHERE public_token IS NOT NULL`,
    },
    {
      name: "eos_health_reports table",
      query: `
        CREATE TABLE IF NOT EXISTS eos_health_reports (
          id VARCHAR(255) PRIMARY KEY,
          org_id VARCHAR(255) NOT NULL,
          workspace_id VARCHAR(255) NOT NULL,
          quarter VARCHAR(50) NOT NULL,
          scores JSONB NOT NULL DEFAULT '{}',
          overall_grade VARCHAR(5) NOT NULL DEFAULT 'C',
          ai_analysis TEXT NOT NULL DEFAULT '',
          recommendations JSONB NOT NULL DEFAULT '[]',
          created_by VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `,
    },
    {
      name: "idx_eos_health_workspace",
      query: `CREATE INDEX IF NOT EXISTS idx_eos_health_workspace ON eos_health_reports(workspace_id, created_at DESC)`,
    },
    {
      name: "people_velocity_cache table",
      query: `
        CREATE TABLE IF NOT EXISTS people_velocity_cache (
          id VARCHAR(255) PRIMARY KEY,
          org_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          workspace_id VARCHAR(255),
          week_start DATE NOT NULL,
          metrics JSONB NOT NULL DEFAULT '{}',
          computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `,
    },
    {
      name: "people_velocity_cache unique constraint",
      query: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'people_velocity_cache_org_user_workspace_week_key'
          ) THEN
            ALTER TABLE people_velocity_cache
              ADD CONSTRAINT people_velocity_cache_org_user_workspace_week_key
              UNIQUE (org_id, user_id, workspace_id, week_start);
          END IF;
        END $$
      `,
    },
    {
      name: "idx_people_velocity_workspace_week",
      query: `CREATE INDEX IF NOT EXISTS idx_people_velocity_workspace_week ON people_velocity_cache(workspace_id, week_start DESC)`,
    },
    {
      name: "company_digests table",
      query: `
        CREATE TABLE IF NOT EXISTS company_digests (
          id VARCHAR(255) PRIMARY KEY,
          org_id VARCHAR(255) NOT NULL,
          workspace_id VARCHAR(255) NOT NULL,
          title VARCHAR(500) NOT NULL,
          period_type VARCHAR(50) NOT NULL,
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          content JSONB NOT NULL DEFAULT '{}',
          format VARCHAR(50) NOT NULL DEFAULT 'markdown',
          created_by VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `,
    },
    {
      name: "idx_company_digests_workspace",
      query: `CREATE INDEX IF NOT EXISTS idx_company_digests_workspace ON company_digests(workspace_id, created_at DESC)`,
    },
  ]

  for (const step of steps) {
    try {
      // @ts-expect-error — sql.query has union type with incompatible signatures
      await sql.query(step.query)
      results.push({ step: step.name, status: "ok" })
    } catch (err) {
      results.push({ step: step.name, status: "error", error: err instanceof Error ? err.message : String(err) })
    }
  }

  const allOk = results.every(r => r.status === "ok")
  return NextResponse.json({ success: allOk, results }, { status: allOk ? 200 : 500 })
}
