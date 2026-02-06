/**
 * Database Status & Diagnostic Endpoint
 *
 * Returns information about what data exists in the database.
 * Useful for debugging data loss issues.
 */

import { sql } from "@/lib/db/sql"
import { NextRequest, NextResponse } from "next/server"
import { withOptionalAuth } from "@/lib/api/middleware"

interface TableCount {
  table: string
  count: number
}

interface DbStatus {
  connected: boolean
  error?: string
  tableCounts: TableCount[]
  currentOrg?: {
    id: string
    name: string
    memberCount: number
    rockCount: number
    taskCount: number
    eodCount: number
  }
  allOrgs?: {
    id: string
    name: string
    createdAt: string
  }[]
}

export const GET = withOptionalAuth(async (request: NextRequest, auth) => {
  const status: DbStatus = {
    connected: false,
    tableCounts: [],
  }

  try {
    // Test connection
    await sql`SELECT 1`
    status.connected = true

    // Get all table counts
    const tables = [
      "users",
      "organizations",
      "organization_members",
      "sessions",
      "rocks",
      "rock_milestones",
      "assigned_tasks",
      "eod_reports",
      "notifications",
      "invitations",
    ]

    for (const table of tables) {
      try {
        // @ts-expect-error - Dynamic table name for status check
        const result = await sql([`SELECT COUNT(*) as count FROM ${table}`])
        status.tableCounts.push({
          table,
          count: parseInt(result.rows[0]?.count || "0"),
        })
      } catch {
        status.tableCounts.push({
          table,
          count: -1, // -1 indicates table doesn't exist
        })
      }
    }

    // Get all organizations
    const { rows: orgs } = await sql`
      SELECT id, name, created_at
      FROM organizations
      ORDER BY created_at DESC
    `
    status.allOrgs = orgs.map(o => ({
      id: o.id,
      name: o.name,
      createdAt: o.created_at?.toISOString() || "",
    }))

    // Try to get current user's org data
    if (auth) {
      const orgId = auth.organization.id

      const [members, rocks, tasks, eods] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM organization_members WHERE organization_id = ${orgId}`,
        sql`SELECT COUNT(*) as count FROM rocks WHERE organization_id = ${orgId}`,
        sql`SELECT COUNT(*) as count FROM assigned_tasks WHERE organization_id = ${orgId}`,
        sql`SELECT COUNT(*) as count FROM eod_reports WHERE organization_id = ${orgId}`,
      ])

      status.currentOrg = {
        id: auth.organization.id,
        name: auth.organization.name,
        memberCount: parseInt(members.rows[0]?.count || "0"),
        rockCount: parseInt(rocks.rows[0]?.count || "0"),
        taskCount: parseInt(tasks.rows[0]?.count || "0"),
        eodCount: parseInt(eods.rows[0]?.count || "0"),
      }
    }

    return NextResponse.json({ success: true, data: status })
  } catch (error) {
    status.error = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, data: status }, { status: 500 })
  }
})
