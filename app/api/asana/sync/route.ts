import { NextRequest, NextResponse } from "next/server"
import { asanaClient, AsanaTask } from "@/lib/integrations/asana"
import { db } from "@/lib/db"
import { generateId } from "@/lib/auth/password"
import type { AsanaUserMapping, AssignedTask, ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { withAuth, withAdmin } from "@/lib/api/middleware"

interface SyncResult {
  tasksCreatedInAsana: number
  tasksUpdatedInAsana: number
  tasksCreatedInAims: number
  tasksUpdatedInAims: number
  errors: string[]
}

interface SyncStatusData {
  enabled: boolean
  lastSyncAt: string | null
  projectName: string | null
  userMappingsCount: number
}

/**
 * POST /api/asana/sync
 * Trigger a two-way sync between AIMS and Asana
 */
export const POST = withAdmin(async (request, auth) => {
  try {
    const body = await request.json()
    const { direction = "both" } = body // "to_asana", "from_asana", or "both"

    const org = await db.organizations.findById(auth.organization.id)
    if (!org?.settings?.asanaIntegration?.enabled) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Asana integration not enabled" },
        { status: 400 }
      )
    }

    const asanaConfig = org.settings.asanaIntegration
    if (!asanaConfig.projectGid || asanaConfig.userMappings.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Asana integration not fully configured" },
        { status: 400 }
      )
    }

    const result: SyncResult = {
      tasksCreatedInAsana: 0,
      tasksUpdatedInAsana: 0,
      tasksCreatedInAims: 0,
      tasksUpdatedInAims: 0,
      errors: [],
    }

    // Get AIMS tasks for mapped users
    const aimsTasks = await db.assignedTasks.findByOrganizationId(auth.organization.id)

    // Get Asana tasks from the configured project (including completed tasks from last 365 days)
    let asanaTasks: AsanaTask[] = []
    try {
      asanaTasks = await asanaClient.getProjectTasks(asanaConfig.projectGid, {
        includeCompleted: true,
        completedSinceDays: 365, // Sync completed tasks from the last year
      })
    } catch (error) {
      result.errors.push(`Failed to fetch Asana tasks: ${error}`)
    }

    // Build mapping lookups
    const aimsUserToAsana = new Map<string, AsanaUserMapping>()
    const asanaUserToAims = new Map<string, AsanaUserMapping>()
    for (const mapping of asanaConfig.userMappings) {
      aimsUserToAsana.set(mapping.aimsUserId, mapping)
      asanaUserToAims.set(mapping.asanaUserGid, mapping)
    }

    // Sync AIMS → Asana (if direction is "to_asana" or "both")
    if (direction === "to_asana" || direction === "both") {
      for (const aimsTask of aimsTasks) {
        const mapping = aimsUserToAsana.get(aimsTask.assigneeId)
        if (!mapping) continue // Skip tasks for unmapped users

        // Skip tasks that originated from Asana (they're already in Asana)
        if (aimsTask.source === "asana") continue

        try {
          // First, check if task already has an asanaGid (already synced)
          if (aimsTask.asanaGid) {
            const existingAsanaTask = asanaTasks.find((at) => at.gid === aimsTask.asanaGid)
            if (existingAsanaTask) {
              // Update existing Asana task if completion status differs
              if (existingAsanaTask.completed !== (aimsTask.status === "completed")) {
                await asanaClient.updateTask(existingAsanaTask.gid, {
                  completed: aimsTask.status === "completed",
                })
                result.tasksUpdatedInAsana++
              }
              continue
            }
          }

          // Check if task already exists in Asana (by matching name pattern)
          const existingAsanaTask = asanaTasks.find(
            (at) => at.name === aimsTask.title || at.notes?.includes(`AIMS-${aimsTask.id}`)
          )

          if (existingAsanaTask) {
            // Update existing Asana task if completion status differs
            if (existingAsanaTask.completed !== (aimsTask.status === "completed")) {
              await asanaClient.updateTask(existingAsanaTask.gid, {
                completed: aimsTask.status === "completed",
              })
              result.tasksUpdatedInAsana++
            }
            // Also update the aimsTask with the asanaGid if not set
            if (!aimsTask.asanaGid) {
              await db.assignedTasks.update(aimsTask.id, { asanaGid: existingAsanaTask.gid })
            }
          } else {
            // Create new task in Asana
            const newAsanaTask = await asanaClient.createTask({
              name: aimsTask.title,
              notes: `${aimsTask.description || ""}\n\n---\nAIMS Task ID: AIMS-${aimsTask.id}`,
              projects: [asanaConfig.projectGid],
              assignee: mapping.asanaUserGid,
              due_on: aimsTask.dueDate ? aimsTask.dueDate.split("T")[0] : undefined,
              completed: aimsTask.status === "completed",
            })
            // Store the asanaGid back in the AIMS task for future syncs
            await db.assignedTasks.update(aimsTask.id, { asanaGid: newAsanaTask.gid })
            result.tasksCreatedInAsana++
          }
        } catch (error) {
          result.errors.push(`Failed to sync AIMS task ${aimsTask.id}: ${error}`)
        }
      }
    }

    // Sync Asana → AIMS (if direction is "from_asana" or "both")
    if (direction === "from_asana" || direction === "both") {
      for (const asanaTask of asanaTasks) {
        if (!asanaTask.assignee) continue

        const mapping = asanaUserToAims.get(asanaTask.assignee.gid)
        if (!mapping) continue // Skip tasks for unmapped users

        try {
          // First, check if task already exists by asanaGid (most reliable)
          let existingAimsTask: AssignedTask | undefined = aimsTasks.find(
            (t) => t.asanaGid === asanaTask.gid
          )

          // Fall back to checking by AIMS ID in notes or matching name
          if (!existingAimsTask) {
            const aimsIdMatch = asanaTask.notes?.match(/AIMS-([a-zA-Z0-9-]+)/)
            if (aimsIdMatch) {
              existingAimsTask = aimsTasks.find((t) => t.id === aimsIdMatch[1])
            } else {
              existingAimsTask = aimsTasks.find(
                (t) => t.title === asanaTask.name && t.assigneeId === mapping.aimsUserId
              )
            }
          }

          if (existingAimsTask) {
            // Update existing AIMS task if completion status differs
            const newStatus = asanaTask.completed ? "completed" : "pending"
            const updates: Partial<AssignedTask> = {}

            if (existingAimsTask.status !== newStatus) {
              updates.status = newStatus
              updates.completedAt = asanaTask.completed ? new Date().toISOString() : undefined
            }

            // Ensure asanaGid is set if not already
            if (!existingAimsTask.asanaGid) {
              updates.asanaGid = asanaTask.gid
            }

            if (Object.keys(updates).length > 0) {
              await db.assignedTasks.update(existingAimsTask.id, updates)
              if (updates.status) result.tasksUpdatedInAims++
            }
          } else {
            // Create new task in AIMS
            const now = new Date().toISOString()
            const taskId = generateId()
            await db.assignedTasks.create({
              id: taskId,
              organizationId: auth.organization.id,
              title: asanaTask.name,
              description: asanaTask.notes?.replace(/\n---\nAIMS Task ID:.*$/, "").trim() || "",
              assigneeId: mapping.aimsUserId,
              assigneeName: mapping.aimsUserName,
              assignedById: auth.user.id,
              assignedByName: auth.user.name,
              type: "assigned",
              rockId: null,
              rockTitle: null,
              priority: "medium",
              dueDate: asanaTask.due_on || now.split("T")[0],
              status: asanaTask.completed ? "completed" : "pending",
              completedAt: asanaTask.completed ? now : null,
              addedToEOD: false,
              eodReportId: null,
              createdAt: now,
              updatedAt: now,
              source: "asana",
              asanaGid: asanaTask.gid,
            })
            result.tasksCreatedInAims++
          }
        } catch (error) {
          result.errors.push(`Failed to sync Asana task ${asanaTask.gid}: ${error}`)
        }
      }
    }

    // Update last sync timestamp
    await db.organizations.update(auth.organization.id, {
      settings: {
        ...org.settings,
        asanaIntegration: {
          ...asanaConfig,
          lastSyncAt: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json<ApiResponse<{ result: SyncResult; syncedAt: string }>>({
      success: true,
      data: {
        result,
        syncedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    logError(logger, "Asana sync error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to sync with Asana" },
      { status: 500 }
    )
  }
})

/**
 * GET /api/asana/sync
 * Get sync status and last sync info
 */
export const GET = withAuth(async (request, auth) => {
  try {
    const org = await db.organizations.findById(auth.organization.id)
    const asanaConfig = org?.settings?.asanaIntegration

    return NextResponse.json<ApiResponse<SyncStatusData>>({
      success: true,
      data: {
        enabled: asanaConfig?.enabled || false,
        lastSyncAt: asanaConfig?.lastSyncAt || null,
        projectName: asanaConfig?.projectName || null,
        userMappingsCount: asanaConfig?.userMappings?.length || 0,
      },
    })
  } catch (error) {
    logError(logger, "Asana sync status error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get sync status" },
      { status: 500 }
    )
  }
})
