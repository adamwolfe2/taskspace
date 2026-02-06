import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/sql"
import { generateId } from "@/lib/auth/password"
import { db } from "@/lib/db"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { decryptToken } from "@/lib/crypto/token-encryption"
import { withAuth } from "@/lib/api/middleware"

const ASANA_API_BASE = "https://app.asana.com/api/1.0"

interface AsanaTask {
  gid: string
  name: string
  notes: string
  completed: boolean
  completed_at: string | null
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
export const POST = withAuth(async (request, auth) => {
  try {
    // First, check if org has Asana integration with user mappings
    const org = await db.organizations.findById(auth.organization.id)
    const asanaConfig = org?.settings?.asanaIntegration

    let pat: string | null = null
    let asanaUserGid: string | null = null
    let workspaceGid: string | null = null

    // Check if user is mapped in org-level Asana config
    if (asanaConfig?.enabled && asanaConfig?.userMappings?.length > 0) {
      const userMapping = asanaConfig.userMappings.find(
        (m: { aimsUserId: string; aimsUserEmail?: string; asanaUserGid: string }) => m.aimsUserId === auth.user.id || m.aimsUserEmail?.toLowerCase() === auth.user.email?.toLowerCase()
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
        // Decrypt the token from database
        pat = decryptToken(member.asana_pat)
        workspaceGid = member.asana_workspace_gid

        if (pat) {
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
    }

    if (!pat || !asanaUserGid) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Asana not configured. Please ask your admin to set up Asana integration or connect your personal Asana account in Settings." },
        { status: 400 }
      )
    }

    // Get all tasks (including completed) assigned to this user
    // Calculate date 365 days ago for completed tasks filter
    const completedSince = new Date()
    completedSince.setDate(completedSince.getDate() - 365)
    const completedSinceStr = completedSince.toISOString().split('T')[0]

    const optFields = "name,notes,completed,completed_at,due_on,assignee.email,assignee.name,projects.name"
    let allTasks: AsanaTask[] = []

    if (workspaceGid) {
      // Fetch incomplete tasks
      const incompleteEndpoint = `${ASANA_API_BASE}/tasks?assignee=${asanaUserGid}&workspace=${workspaceGid}&opt_fields=${optFields}`
      const incompleteResponse = await fetch(incompleteEndpoint, {
        headers: { Authorization: `Bearer ${pat}` },
      })

      if (incompleteResponse.ok) {
        const incompleteData = await incompleteResponse.json()
        allTasks = incompleteData.data || []
      }

      // Fetch completed tasks from the last 365 days
      const completedEndpoint = `${ASANA_API_BASE}/tasks?assignee=${asanaUserGid}&workspace=${workspaceGid}&completed_since=${completedSinceStr}&opt_fields=${optFields}`
      const completedResponse = await fetch(completedEndpoint, {
        headers: { Authorization: `Bearer ${pat}` },
      })

      if (completedResponse.ok) {
        const completedData = await completedResponse.json()
        const completedTasks = completedData.data || []

        // Merge and deduplicate
        const taskMap = new Map<string, AsanaTask>()
        for (const task of [...allTasks, ...completedTasks]) {
          taskMap.set(task.gid, task)
        }
        allTasks = Array.from(taskMap.values())
      }
    } else {
      // Fallback to user_task_list endpoint
      const tasksEndpoint = `${ASANA_API_BASE}/user_task_lists/${asanaUserGid}/tasks?opt_fields=${optFields}`
      const tasksResponse = await fetch(tasksEndpoint, {
        headers: { Authorization: `Bearer ${pat}` },
      })

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        allTasks = tasksData.data || []
      }
    }

    if (allTasks.length === 0) {
      // Try the search endpoint as fallback (for both completed and incomplete)
      const searchEndpoint = `${ASANA_API_BASE}/workspaces/${workspaceGid}/tasks/search?assignee.any=${asanaUserGid}&is_subtask=false&opt_fields=${optFields}`

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
      allTasks = searchData.data || []
    }

    return processAsanaTasks(allTasks, auth, workspaceGid)

  } catch (error) {
    logError(logger, "Asana sync error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to sync with Asana" },
      { status: 500 }
    )
  }
})

async function processAsanaTasks(
  asanaTasks: AsanaTask[],
  auth: { user: { id: string; name: string; email?: string }; organization: { id: string } },
  _workspaceGid: string | null
) {
  // Process ALL tasks (both completed and incomplete)

  // Get existing tasks from AIMS that were synced from Asana
  const { rows: existingTaskRows } = await sql`
    SELECT id, asana_gid, status, completed_at
    FROM assigned_tasks
    WHERE organization_id = ${auth.organization.id}
      AND assignee_id = ${auth.user.id}
      AND asana_gid IS NOT NULL
  `

  const existingTasksByGid = new Map<string, { id: string; status: string; completed_at: string | null }>()
  for (const task of existingTaskRows) {
    existingTasksByGid.set(task.asana_gid, { id: task.id, status: task.status, completed_at: task.completed_at })
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
  // Only delete if it was an incomplete task that got deleted
  for (const [gid, existingTask] of existingTasksByGid) {
    if (!asanaTaskGids.has(gid) && existingTask.status !== "completed") {
      try {
        // Task was deleted in Asana, delete it in AIMS
        await sql`
          DELETE FROM assigned_tasks
          WHERE id = ${existingTask.id}
        `
        result.tasksDeleted++
        logger.info({ taskId: existingTask.id, asanaGid: gid }, "Deleted AIMS task because it was deleted in Asana")
      } catch (err) {
        logError(logger, `Failed to delete task ${existingTask.id}`, err)
        result.errors.push(`Failed to delete task that was removed from Asana`)
      }
    }
  }

  // Process ALL tasks from Asana (completed and incomplete)
  for (const asanaTask of asanaTasks) {
    try {
      const existingTask = existingTasksByGid.get(asanaTask.gid)

      if (existingTask) {
        // Task already exists, check if needs update
        const newStatus = asanaTask.completed ? "completed" : "pending"

        if (existingTask.status !== newStatus) {
          const completedAt = asanaTask.completed
            ? (asanaTask.completed_at || now)
            : null

          await sql`
            UPDATE assigned_tasks
            SET status = ${newStatus},
                completed_at = ${completedAt},
                updated_at = ${now}
            WHERE id = ${existingTask.id}
          `
          if (asanaTask.completed) {
            result.tasksCompleted++
          }
        }
        result.tasksUpdated++
      } else {
        // Create new task from Asana (including completed ones)
        const taskId = generateId()
        const status = asanaTask.completed ? "completed" : "pending"
        const completedAt = asanaTask.completed
          ? (asanaTask.completed_at || now)
          : null

        await sql`
          INSERT INTO assigned_tasks (
            id, organization_id, title, description, assignee_id, assignee_name,
            type, priority, due_date, status, completed_at, source, asana_gid, created_at, updated_at
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
            ${status},
            ${completedAt},
            'asana',
            ${asanaTask.gid},
            ${now},
            ${now}
          )
        `
        result.tasksImported++
      }
    } catch (err) {
      logError(logger, `Failed to sync task ${asanaTask.gid}`, err)
      result.errors.push(`Failed to sync task: ${asanaTask.name}`)
    }
  }

  // Update last sync timestamp
  await sql`
    UPDATE organization_members
    SET asana_last_sync_at = ${now}
    WHERE organization_id = ${auth.organization.id} AND user_id = ${auth.user.id}
  `

  // Build message - count total completed and pending
  const completedCount = asanaTasks.filter(t => t.completed).length
  const pendingCount = asanaTasks.filter(t => !t.completed).length

  const messages: string[] = []
  if (result.tasksImported > 0) messages.push(`${result.tasksImported} imported`)
  if (result.tasksDeleted > 0) messages.push(`${result.tasksDeleted} deleted`)
  if (result.tasksCompleted > 0) messages.push(`${result.tasksCompleted} status updated`)

  return NextResponse.json<ApiResponse<SyncResult>>({
    success: true,
    data: result,
    message: messages.length > 0
      ? `Synced with Asana: ${messages.join(", ")} (${completedCount} completed, ${pendingCount} pending)`
      : `No changes to sync (${completedCount} completed, ${pendingCount} pending tasks in sync)`,
  })
}

/**
 * GET /api/asana/me/sync
 * Get the last sync status
 */
export const GET = withAuth(async (request, auth) => {
  try {
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
    logError(logger, "Get sync status error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get sync status" },
      { status: 500 }
    )
  }
})
