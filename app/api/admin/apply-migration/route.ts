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
