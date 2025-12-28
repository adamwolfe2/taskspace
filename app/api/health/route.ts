import { sql } from "@vercel/postgres"
import { NextResponse } from "next/server"

export async function GET() {
  const checks: Record<string, { status: string; error?: string }> = {
    server: { status: "ok" },
    database: { status: "unknown" },
    tables: { status: "unknown" },
  }

  try {
    // Check database connection
    const { rows } = await sql`SELECT 1 as test`
    if (rows[0]?.test === 1) {
      checks.database = { status: "ok" }
    }

    // Check if tables exist
    const { rows: tableRows } = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `
    const tables = tableRows.map(r => r.table_name)
    const requiredTables = ["users", "organizations", "organization_members", "sessions"]
    const missingTables = requiredTables.filter(t => !tables.includes(t))

    if (missingTables.length === 0) {
      checks.tables = { status: "ok" }
    } else {
      checks.tables = {
        status: "missing",
        error: `Missing tables: ${missingTables.join(", ")}. Run GET /api/db/migrate to create them.`,
      }
    }

    const allOk = Object.values(checks).every(c => c.status === "ok")

    return NextResponse.json({
      status: allOk ? "healthy" : "unhealthy",
      checks,
      existingTables: tables,
      env: {
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        nodeEnv: process.env.NODE_ENV,
      },
    })
  } catch (error) {
    checks.database = {
      status: "error",
      error: error instanceof Error ? error.message : "Database connection failed",
    }

    return NextResponse.json(
      {
        status: "unhealthy",
        checks,
        env: {
          hasPostgresUrl: !!process.env.POSTGRES_URL,
          nodeEnv: process.env.NODE_ENV,
        },
      },
      { status: 500 }
    )
  }
}
