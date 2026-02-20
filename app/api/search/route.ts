import { NextRequest } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import { successResponse, Errors } from "@/lib/api/errors"
import type { ApiResponse } from "@/lib/types"

interface SearchResult {
  id: string
  type: "task" | "rock" | "member"
  title: string
  subtitle?: string
  status?: string
}

// GET /api/search?q=...
export const GET = withAuth(async (request: NextRequest, auth) => {
  const q = request.nextUrl.searchParams.get("q")?.trim()
  if (!q || q.length < 2) {
    return successResponse<SearchResult[]>([])
  }

  // Escape ILIKE metacharacters to prevent wildcard injection
  const escaped = q.replace(/[\\%_]/g, "\\$&")
  const searchTerm = `%${escaped}%`
  const orgId = auth.organization.id
  const limit = 5

  // Run all 3 searches in parallel
  const [taskRows, rockRows, memberRows] = await Promise.all([
    sql<{ id: string; title: string; status: string; assignee_name: string }>`
      SELECT id, title, status, assignee_name
      FROM assigned_tasks
      WHERE organization_id = ${orgId}
        AND (title ILIKE ${searchTerm} OR description ILIKE ${searchTerm})
      ORDER BY
        CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
        updated_at DESC
      LIMIT ${limit}
    `.then(r => r.rows),

    sql<{ id: string; title: string; status: string; owner_name: string }>`
      SELECT id, title, status, owner_name
      FROM rocks
      WHERE organization_id = ${orgId}
        AND (title ILIKE ${searchTerm} OR description ILIKE ${searchTerm})
      ORDER BY updated_at DESC
      LIMIT ${limit}
    `.then(r => r.rows),

    sql<{ id: string; name: string; role: string; department: string; job_title: string }>`
      SELECT om.id, om.name, om.role, om.department, om.job_title
      FROM organization_members om
      WHERE om.organization_id = ${orgId}
        AND om.status = 'active'
        AND (om.name ILIKE ${searchTerm} OR om.email ILIKE ${searchTerm} OR om.department ILIKE ${searchTerm})
      ORDER BY om.name
      LIMIT ${limit}
    `.then(r => r.rows),
  ])

  const results: SearchResult[] = [
    ...taskRows.map(t => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      subtitle: t.assignee_name,
      status: t.status,
    })),
    ...rockRows.map(r => ({
      id: r.id,
      type: "rock" as const,
      title: r.title,
      subtitle: r.owner_name,
      status: r.status,
    })),
    ...memberRows.map(m => ({
      id: m.id,
      type: "member" as const,
      title: m.name,
      subtitle: [m.job_title, m.department].filter(Boolean).join(" · ") || m.role,
    })),
  ]

  return successResponse(results)
})
