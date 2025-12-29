import { NextRequest, NextResponse } from "next/server"
import { asanaClient, AsanaTask } from "@/lib/integrations/asana"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import type { AsanaUserMapping, AssignedTask, Rock } from "@/lib/types"

interface SyncResult {
  tasksCreatedInAsana: number
  tasksUpdatedInAsana: number
  tasksCreatedInAims: number
  tasksUpdatedInAims: number
  errors: string[]
}

/**
 * POST /api/asana/sync
 * Trigger a two-way sync between AIMS and Asana
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin permissions
    if (!isAdmin(auth)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { direction = "both" } = body // "to_asana", "from_asana", or "both"

    const org = await db.organizations.findById(auth.organization.id)
    if (!org?.settings?.asanaIntegration?.enabled) {
      return NextResponse.json(
        { error: "Asana integration not enabled" },
        { status: 400 }
      )
    }

    const asanaConfig = org.settings.asanaIntegration
    if (!asanaConfig.projectGid || asanaConfig.userMappings.length === 0) {
      return NextResponse.json(
        { error: "Asana integration not fully configured" },
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

    // Get Asana tasks from the configured project
    let asanaTasks: AsanaTask[] = []
    try {
      asanaTasks = await asanaClient.getProjectTasks(asanaConfig.projectGid)
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
        const mapping = aimsUserToAsana.get(aimsTask.assignedTo)
        if (!mapping) continue // Skip tasks for unmapped users

        try {
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
          } else {
            // Create new task in Asana
            await asanaClient.createTask({
              name: aimsTask.title,
              notes: `${aimsTask.description || ""}\n\n---\nAIMS Task ID: AIMS-${aimsTask.id}`,
              projects: [asanaConfig.projectGid],
              assignee: mapping.asanaUserGid,
              due_on: aimsTask.dueDate ? aimsTask.dueDate.split("T")[0] : undefined,
              completed: aimsTask.status === "completed",
            })
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
          // Check if task already exists in AIMS (by AIMS ID in notes or matching name)
          const aimsIdMatch = asanaTask.notes?.match(/AIMS-([a-zA-Z0-9-]+)/)
          let existingAimsTask: AssignedTask | undefined

          if (aimsIdMatch) {
            existingAimsTask = aimsTasks.find((t) => t.id === aimsIdMatch[1])
          } else {
            existingAimsTask = aimsTasks.find(
              (t) => t.title === asanaTask.name && t.assignedTo === mapping.aimsUserId
            )
          }

          if (existingAimsTask) {
            // Update existing AIMS task if completion status differs
            const newStatus = asanaTask.completed ? "completed" : "pending"
            if (existingAimsTask.status !== newStatus) {
              await db.assignedTasks.update(existingAimsTask.id, {
                status: newStatus,
                completedAt: asanaTask.completed ? new Date().toISOString() : undefined,
              })
              result.tasksUpdatedInAims++
            }
          } else {
            // Create new task in AIMS
            await db.assignedTasks.create({
              title: asanaTask.name,
              description: asanaTask.notes?.replace(/\n---\nAIMS Task ID:.*$/, "").trim() || "",
              assignedTo: mapping.aimsUserId,
              assignedBy: auth.user.id,
              organizationId: auth.organization.id,
              status: asanaTask.completed ? "completed" : "pending",
              priority: "medium",
              dueDate: asanaTask.due_on || undefined,
              source: "asana",
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

    return NextResponse.json({
      success: true,
      result,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Asana sync error:", error)
    return NextResponse.json(
      { error: "Failed to sync with Asana" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/asana/sync
 * Get sync status and last sync info
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const org = await db.organizations.findById(auth.organization.id)
    const asanaConfig = org?.settings?.asanaIntegration

    return NextResponse.json({
      enabled: asanaConfig?.enabled || false,
      lastSyncAt: asanaConfig?.lastSyncAt || null,
      projectName: asanaConfig?.projectName || null,
      userMappingsCount: asanaConfig?.userMappings?.length || 0,
    })
  } catch (error) {
    console.error("Asana sync status error:", error)
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    )
  }
}
