import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { sql } from "@vercel/postgres"
import { generateId } from "@/lib/auth/password"
import { db } from "@/lib/db"
import type { ApiResponse } from "@/lib/types"

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
  tasksDeleted: number
  errors: string[]
}

/**
 * POST /api/asana/me/sync
 * Sync tasks from Asana that are assigned to the current user
 * Uses org-level Asana integration if user is mapped, otherwise uses member PAT
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

    // First, check if org has Asana integration with user mappings
    const org = await db.organizations.findById(auth.organization.id)
    const asanaConfig = org?.settings?.asanaIntegration

    let pat: string | null = null
    let asanaUserGid: string | null = null
    let workspaceGid: string | null = null

    // Check if user is mapped in org-level Asana config
    if (asanaConfig?.enabled && asanaConfig?.userMappings?.length > 0) {
      const userMapping = asanaConfig.userMappings.find(
        (m: any) => m.aimsUserId === auth.user.id || m.aimsUserEmail?.toLowerCase() === auth.user.email?.toLowerCase()
      )

      if (userMapping) {
        // Use org-level Asana PAT (from env var)
        pat = process.env.ASANA_ACCESS_TOKEN || null
        asanaUserGid = userMapping.asanaUserGid
        workspaceGid = asanaConfig.workspaceGid
      }
    }

    // Fall back to member's personal PAT if not mapped or org integration not configured
    if (!pat) {
      const { rows: memberRows } = await sql`
        SELECT asana_pat, asana_workspace_gid
        FROM organization_members
        WHERE organization_id = ${auth.organization.id} AND user_id = ${auth.user.id}
      `

      const member = memberRows[0]
      if (member?.asana_pat) {
        pat = member.asana_pat
        workspaceGid = member.asana_workspace_gid

        // Get user GID from their PAT
        const meResponse = await fetch(`${ASANA_API_BASE}/users/me`, {
          headers: { Authorization: `Bearer ${pat}` },
        })

        if (meResponse.ok) {
          const meData = await meResponse.json()
          asanaUserGid = meData.data.gid
        }
      }
    }

    if (!pat || !asanaUserGid) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Asana not configured. Please ask your admin to set up Asana integration or connect your personal Asana account in Settings." },
        { status: 400 }
      )
    }

    // Get incomplete tasks assigned to this user
    // Using user_task_list endpoint for better results
    let tasksEndpoint = `${ASANA_API_BASE}/user_task_lists/${asanaUserGid}/tasks?opt_fields=name,notes,completed,due_on,assignee.email,assignee.name,projects.name`

    // If we have a workspace, use the tasks endpoint with workspace filter instead
    if (workspaceGid) {
      tasksEndpoint = `${ASANA_API_BASE}/tasks?assignee=${asanaUserGid}&workspace=${workspaceGid}&opt_fields=name,notes,completed,due_on,assignee.email,assignee.name,projects.name`
    }

    const tasksResponse = await fetch(tasksEndpoint, {
      headers: { Authorization: `Bearer ${pat}` },
    })

    if (!tasksResponse.ok) {
      const errorData = await tasksResponse.json().catch(() => ({}))
      console.error("Asana tasks fetch error:", errorData)

      // If user_task_list fails, try the search endpoint
      const searchEndpoint = `${ASANA_API_BASE}/workspaces/${workspaceGid}/tasks/search?assignee.any=${asanaUserGid}&is_subtask=false&completed=false&opt_fields=name,notes,completed,due_on,assignee.email,assignee.name,projects.name`

      const searchResponse = await fetch(searchEndpoint, {
        headers: { Authorization: `Bearer ${pat}` },
      })

      if (!searchResponse.ok) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Failed to fetch tasks from Asana" },
          { status: 500 }
        )
      }

      const searchData = await searchResponse.json()
      return processAsanaTasks(searchData.data, auth, workspaceGid)
    }

    const tasksData = await tasksResponse.json()
    return processAsanaTasks(tasksData.data, auth, workspaceGid)

  } catch (error) {
    console.error("Asana sync error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to sync with Asana" },
      { status: 500 }
    )
  }
}

async function processAsanaTasks(
  asanaTasks: AsanaTask[],
  auth: { user: { id: string; name: string; email?: string }; organization: { id: string } },
  workspaceGid: string | null
) {
  // Filter to only incomplete tasks
  const incompleteTasks = asanaTasks.filter(t => !t.completed)

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
    tasksDeleted: 0,
    errors: [],
  }

  const now = new Date().toISOString()

  // Create a set of all Asana task GIDs for quick lookup
  const asanaTaskGids = new Set(asanaTasks.map(t => t.gid))

  // Check for tasks in AIMS that no longer exist in Asana (deleted)
  for (const [gid, existingTask] of existingTasksByGid) {
    if (!asanaTaskGids.has(gid) && existingTask.status !== "completed") {
      try {
        // Task was deleted in Asana, delete it in AIMS
        await sql`
          DELETE FROM assigned_tasks
          WHERE id = ${existingTask.id}
        `
        result.tasksDeleted++
        console.log(`Deleted AIMS task ${existingTask.id} because it was deleted in Asana (gid: ${gid})`)
      } catch (err) {
        console.error(`Failed to delete task ${existingTask.id}:`, err)
        result.errors.push(`Failed to delete task that was removed from Asana`)
      }
    }
  }

  for (const asanaTask of incompleteTasks) {
    try {
      const existingTask = existingTasksByGid.get(asanaTask.gid)

      if (existingTask) {
        // Task already exists, check if needs update
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
        result.tasksUpdated++
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
            'pending',
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

  // Build message
  const messages: string[] = []
  if (result.tasksImported > 0) messages.push(`${result.tasksImported} imported`)
  if (result.tasksDeleted > 0) messages.push(`${result.tasksDeleted} deleted`)
  if (result.tasksCompleted > 0) messages.push(`${result.tasksCompleted} completed`)

  return NextResponse.json<ApiResponse<SyncResult>>({
    success: true,
    data: result,
    message: messages.length > 0
      ? `Synced with Asana: ${messages.join(", ")}`
      : `No changes to sync (${incompleteTasks.length} tasks in sync)`,
  })
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
