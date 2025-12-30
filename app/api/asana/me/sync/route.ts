import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { sql } from "@vercel/postgres"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse, AssignedTask } from "@/lib/types"

const ASANA_API_BASE = "https://app.asana.com/api/1.0"

interface AsanaTask {
  gid: string
  name: string
  notes: string
  completed: boolean
  due_on: string | null
  assignee: {
    gid: string
    email: string
    name: string
  } | null
}

interface SyncResult {
  tasksImported: number
  tasksUpdated: number
  tasksCompleted: number
  errors: string[]
}

/**
 * POST /api/asana/me/sync
 * Sync tasks from Asana that are assigned to the current user
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get member's Asana credentials
    const { rows: memberRows } = await sql`
      SELECT asana_pat, asana_workspace_gid
      FROM organization_members
      WHERE organization_id = ${auth.organization.id} AND user_id = ${auth.user.id}
    `

    const member = memberRows[0]
    if (!member?.asana_pat) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Asana account not connected. Please connect your Asana account first." },
        { status: 400 }
      )
    }

    const { asana_pat: pat, asana_workspace_gid: workspaceGid } = member

    // First, get the user's Asana user GID by looking up by email
    const meResponse = await fetch(`${ASANA_API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${pat}` },
    })

    if (!meResponse.ok) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to authenticate with Asana. Please reconnect your account." },
        { status: 400 }
      )
    }

    const meData = await meResponse.json()
    const asanaUserGid = meData.data.gid

    // Get tasks assigned to this user in the workspace
    let tasksEndpoint = `${ASANA_API_BASE}/tasks?assignee=${asanaUserGid}&opt_fields=name,notes,completed,due_on,assignee.email,assignee.name`

    if (workspaceGid) {
      tasksEndpoint += `&workspace=${workspaceGid}`
    }

    // Only get incomplete tasks by default
    tasksEndpoint += `&completed_since=now`

    const tasksResponse = await fetch(tasksEndpoint, {
      headers: { Authorization: `Bearer ${pat}` },
    })

    if (!tasksResponse.ok) {
      const error = await tasksResponse.json()
      console.error("Asana tasks fetch error:", error)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to fetch tasks from Asana" },
        { status: 500 }
      )
    }

    const tasksData = await tasksResponse.json()
    const asanaTasks: AsanaTask[] = tasksData.data

    // Get existing tasks from AIMS that were synced from Asana
    const { rows: existingTaskRows } = await sql`
      SELECT id, asana_gid, status
      FROM assigned_tasks
      WHERE organization_id = ${auth.organization.id}
        AND assignee_id = ${auth.user.id}
        AND asana_gid IS NOT NULL
    `

    const existingTasksByGid = new Map<string, { id: string; status: string }>()
    for (const task of existingTaskRows) {
      existingTasksByGid.set(task.asana_gid, { id: task.id, status: task.status })
    }

    const result: SyncResult = {
      tasksImported: 0,
      tasksUpdated: 0,
      tasksCompleted: 0,
      errors: [],
    }

    const now = new Date().toISOString()

    for (const asanaTask of asanaTasks) {
      try {
        const existingTask = existingTasksByGid.get(asanaTask.gid)

        if (existingTask) {
          // Update existing task if completion status changed
          if (asanaTask.completed && existingTask.status !== "completed") {
            await sql`
              UPDATE assigned_tasks
              SET status = 'completed',
                  completed_at = ${now},
                  updated_at = ${now}
              WHERE id = ${existingTask.id}
            `
            result.tasksCompleted++
          }
        } else {
          // Create new task from Asana
          const taskId = generateId()
          await sql`
            INSERT INTO assigned_tasks (
              id, organization_id, title, description, assignee_id, assignee_name,
              type, priority, due_date, status, source, asana_gid, created_at, updated_at
            ) VALUES (
              ${taskId},
              ${auth.organization.id},
              ${asanaTask.name},
              ${asanaTask.notes || null},
              ${auth.user.id},
              ${auth.user.name},
              'assigned',
              'normal',
              ${asanaTask.due_on || now.split("T")[0]},
              ${asanaTask.completed ? "completed" : "pending"},
              'asana',
              ${asanaTask.gid},
              ${now},
              ${now}
            )
          `
          result.tasksImported++
        }
      } catch (err) {
        console.error(`Failed to sync task ${asanaTask.gid}:`, err)
        result.errors.push(`Failed to sync task: ${asanaTask.name}`)
      }
    }

    // Update last sync timestamp
    await sql`
      UPDATE organization_members
      SET asana_last_sync_at = ${now}
      WHERE organization_id = ${auth.organization.id} AND user_id = ${auth.user.id}
    `

    return NextResponse.json<ApiResponse<SyncResult>>({
      success: true,
      data: result,
      message: `Synced ${result.tasksImported} new tasks from Asana`,
    })
  } catch (error) {
    console.error("Asana sync error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to sync with Asana" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/asana/me/sync
 * Get the last sync status
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { rows } = await sql`
      SELECT asana_last_sync_at
      FROM organization_members
      WHERE organization_id = ${auth.organization.id} AND user_id = ${auth.user.id}
    `

    const member = rows[0]

    // Count tasks synced from Asana
    const { rows: countRows } = await sql`
      SELECT COUNT(*) as count
      FROM assigned_tasks
      WHERE organization_id = ${auth.organization.id}
        AND assignee_id = ${auth.user.id}
        AND source = 'asana'
    `

    return NextResponse.json<ApiResponse<{
      lastSyncAt: string | null
      tasksSyncedFromAsana: number
    }>>({
      success: true,
      data: {
        lastSyncAt: member?.asana_last_sync_at?.toISOString() || null,
        tasksSyncedFromAsana: parseInt(countRows[0]?.count || "0", 10),
      },
    })
  } catch (error) {
    console.error("Get sync status error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get sync status" },
      { status: 500 }
    )
  }
}
