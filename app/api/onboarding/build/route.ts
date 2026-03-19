import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAdmin, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { generateId, generateInviteToken, getExpirationDate } from "@/lib/auth/password"
import { z } from "zod"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import type { Rock, AssignedTask, OrganizationMember, Invitation, ApiResponse } from "@/lib/types"
import { sendInvitationEmail } from "@/lib/integrations/email"
import { logger, logError } from "@/lib/logger"

const memberInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  role: z.enum(["admin", "member"]).optional().default("member"),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
})

const clientInputSchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
})

const projectInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  clientName: z.string().optional(),
  status: z.string().optional().default("active"),
})

const rockInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  ownerEmail: z.string().optional(),
  quarter: z.string().optional(),
  dueDate: z.string().optional(),
  milestones: z.array(z.string()).optional(),
})

const taskInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeEmail: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional().default("normal"),
  dueDate: z.string().optional(),
  rockTitle: z.string().optional(),
})

const buildWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
  payload: z.object({
    members: z.array(memberInputSchema).optional().default([]),
    clients: z.array(clientInputSchema).optional().default([]),
    projects: z.array(projectInputSchema).optional().default([]),
    rocks: z.array(rockInputSchema).optional().default([]),
    tasks: z.array(taskInputSchema).optional().default([]),
  }),
})

interface BuildResult {
  created: {
    members: number
    clients: number
    projects: number
    rocks: number
    tasks: number
  }
  skipped: {
    members: number
    tasks: number
  }
  invitesSent: number
  errors: string[]
}

// POST /api/onboarding/build - Batch-create workspace data from structured payload
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    const { workspaceId, payload } = await validateBody(request, buildWorkspaceSchema)

    // Verify workspace belongs to this org
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Verify caller has workspace access
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      )
    }

    const result: BuildResult = {
      created: { members: 0, clients: 0, projects: 0, rocks: 0, tasks: 0 },
      skipped: { members: 0, tasks: 0 },
      invitesSent: 0,
      errors: [],
    }

    const now = new Date().toISOString()

    // ── 1. MEMBERS ──────────────────────────────────────────────────────────
    // Map email → member record (existing + newly created) for later lookups
    const emailToMember = new Map<string, { memberId: string; userId?: string | null; name: string }>()

    // Load existing members first
    const existingMembers = await db.members.findByOrganizationId(auth.organization.id)
    for (const m of existingMembers) {
      if (m.email) {
        emailToMember.set(m.email.toLowerCase(), {
          memberId: m.id,
          userId: m.userId,
          name: m.name || m.email,
        })
      }
    }

    // Check subscription limit
    const memberSlots = auth.organization.subscription.maxUsers === null ? Infinity : auth.organization.subscription.maxUsers - existingMembers.length

    for (const memberInput of payload.members || []) {
      // Skip members without an email — they can't be invited or logged in
      if (!memberInput.email) {
        result.errors.push(`${memberInput.name}: no email provided — add manually from Team Management`)
        result.skipped.members++
        continue
      }

      const emailLower = memberInput.email.toLowerCase()

      // Skip if already in org
      if (emailToMember.has(emailLower)) {
        result.skipped.members++
        continue
      }

      // Skip if over plan limit
      if (result.created.members >= memberSlots) {
        result.errors.push(`Member limit reached — skipped ${memberInput.email}`)
        result.skipped.members++
        continue
      }

      try {
        const memberId = generateId()
        const member: OrganizationMember = {
          id: memberId,
          organizationId: auth.organization.id,
          userId: null,
          email: emailLower,
          name: memberInput.name.trim(),
          role: memberInput.role === "admin" ? "admin" : "member",
          department: memberInput.department || "",
          joinedAt: now,
          invitedBy: auth.user.id,
          status: "pending",
        }

        await db.members.create(member)
        emailToMember.set(emailLower, { memberId, userId: null, name: memberInput.name })
        result.created.members++

        // Send invitation email — skip if already has a pending invite
        try {
          const existingInvites = await db.invitations.findPendingByEmail(emailLower)
          const alreadyInvited = existingInvites.some(i => i.organizationId === auth.organization.id)
          if (!alreadyInvited) {
            const invitation: Invitation = {
              id: generateId(),
              organizationId: auth.organization.id,
              email: emailLower,
              role: member.role === "admin" ? "admin" : "member",
              department: member.department,
              token: generateInviteToken(),
              expiresAt: getExpirationDate(24 * 7),
              createdAt: now,
              invitedBy: auth.user.id,
              status: "pending",
              workspaceId: workspaceId,
            }
            await db.invitations.create(invitation)
            await db.members.update(memberId, { status: "invited" })
            const emailResult = await sendInvitationEmail(invitation, auth.organization, auth.user.name)
            if (emailResult.success) {
              result.invitesSent++
            } else {
              logError(logger, `Failed to send invite to ${emailLower}`, emailResult.error)
            }
          }
        } catch (inviteErr) {
          logError(logger, `Failed to invite member ${memberInput.email}`, inviteErr)
        }
      } catch (err) {
        logError(logger, `Failed to create member ${memberInput.email}`, err)
        result.errors.push(`Could not create member: ${memberInput.email}`)
      }
    }

    // ── 2. CLIENTS ──────────────────────────────────────────────────────────
    const clientNameToId = new Map<string, string>()

    for (const clientInput of payload.clients || []) {
      try {
        const client = await db.clients.create(auth.organization.id, workspaceId, {
          name: clientInput.name.trim(),
          notes: clientInput.notes,
          industry: clientInput.industry,
          website: clientInput.website,
          status: "active",
          createdBy: auth.user.id,
        })
        clientNameToId.set(clientInput.name.toLowerCase(), client.id)
        result.created.clients++
      } catch (err) {
        logError(logger, `Failed to create client ${clientInput.name}`, err)
        result.errors.push(`Could not create client: ${clientInput.name}`)
      }
    }

    // ── 3. PROJECTS ─────────────────────────────────────────────────────────
    const projectNameToId = new Map<string, string>()

    for (const projectInput of payload.projects || []) {
      try {
        const clientId = projectInput.clientName
          ? clientNameToId.get(projectInput.clientName.toLowerCase())
          : undefined

        const project = await db.projects.create(auth.organization.id, workspaceId, {
          name: projectInput.name.trim(),
          description: projectInput.description,
          clientId: clientId || undefined,
          status: (projectInput.status as "active" | "planning" | "on-hold" | "completed") || "active",
          createdBy: auth.user.id,
        })
        projectNameToId.set(projectInput.name.toLowerCase(), project.id)
        // Auto-add creator as project owner
        await db.projects.addMember(project.id, auth.user.id, "owner")
        result.created.projects++
      } catch (err) {
        logError(logger, `Failed to create project ${projectInput.name}`, err)
        result.errors.push(`Could not create project: ${projectInput.name}`)
      }
    }

    // ── 4. ROCKS ────────────────────────────────────────────────────────────
    const rockTitleToId = new Map<string, string>()
    const defaultDueDate = getQuarterEndDate()

    for (const rockInput of payload.rocks || []) {
      try {
        const rockId = generateId()

        // Resolve owner: try to find a real userId by email, fall back to ownerEmail
        let targetUserId: string | undefined
        let ownerEmail: string | undefined

        if (rockInput.ownerEmail) {
          const ownerLower = rockInput.ownerEmail.toLowerCase()
          const ownerInfo = emailToMember.get(ownerLower)
          if (ownerInfo?.userId) {
            targetUserId = ownerInfo.userId
          } else if (ownerInfo) {
            // Draft member (no userId yet) — use ownerEmail
            ownerEmail = ownerLower
          } else {
            // Not in org at all — assign to creator
            targetUserId = auth.user.id
          }
        } else {
          targetUserId = auth.user.id
        }

        // Build milestones
        const milestones = (rockInput.milestones || []).map((text) => ({
          id: generateId(),
          text,
          completed: false,
        }))

        const rock: Rock = {
          id: rockId,
          organizationId: auth.organization.id,
          workspaceId,
          userId: targetUserId,
          ownerEmail: ownerEmail || undefined,
          title: rockInput.title.trim(),
          description: rockInput.description?.trim() || "",
          progress: 0,
          dueDate: rockInput.dueDate || defaultDueDate,
          status: "on-track",
          quarter: rockInput.quarter || getCurrentQuarter(),
          milestones: milestones.length > 0 ? milestones : undefined,
          createdAt: now,
          updatedAt: now,
          bucket: undefined,
          outcome: undefined,
          doneWhen: [],
          projectId: null,
          projectName: null,
        }

        await db.rocks.create(rock)
        rockTitleToId.set(rockInput.title.toLowerCase(), rockId)
        result.created.rocks++
      } catch (err) {
        logError(logger, `Failed to create rock "${rockInput.title}"`, err)
        result.errors.push(`Could not create rock: ${rockInput.title}`)
      }
    }

    // ── 5. TASKS ────────────────────────────────────────────────────────────
    for (const taskInput of payload.tasks || []) {
      try {
        // Resolve assignee — supports active members (userId), draft/invited members (email only), or admin fallback
        let assigneeId: string | null = auth.user.id
        let assigneeEmail: string | undefined = undefined
        let assigneeName = auth.user.name
        let taskType: "assigned" | "personal" = "personal"
        let assignedById: string | null = null
        let assignedByName: string | null = null

        if (taskInput.assigneeEmail) {
          const emailLower = taskInput.assigneeEmail.toLowerCase()
          const assigneeInfo = emailToMember.get(emailLower)
          if (assigneeInfo) {
            assigneeName = assigneeInfo.name
            taskType = "assigned"
            assignedById = auth.user.id
            assignedByName = auth.user.name
            if (assigneeInfo.userId) {
              // Active member with a real user account
              assigneeId = assigneeInfo.userId
            } else {
              // Draft/invited member — store email so task transfers on join
              assigneeId = null
              assigneeEmail = emailLower
            }
          }
          // Unknown email (not in org) → falls through to admin as owner
        }

        // Resolve rock link by title
        const rockId = taskInput.rockTitle
          ? rockTitleToId.get(taskInput.rockTitle.toLowerCase()) || null
          : null

        const rockTitle = taskInput.rockTitle && rockId ? taskInput.rockTitle : null

        const task: AssignedTask = {
          id: generateId(),
          organizationId: auth.organization.id,
          workspaceId,
          title: taskInput.title.trim(),
          description: taskInput.description?.trim(),
          assigneeId,
          assigneeEmail,
          assigneeName,
          assignedById,
          assignedByName,
          type: taskType,
          rockId,
          rockTitle,
          priority: (taskInput.priority as "low" | "normal" | "high") || "normal",
          dueDate: taskInput.dueDate || null,
          status: "pending",
          createdAt: now,
          source: "manual",
        }

        await db.assignedTasks.create(task)
        result.created.tasks++
      } catch (err) {
        logError(logger, `Failed to create task "${taskInput.title}"`, err)
        result.errors.push(`Could not create task: ${taskInput.title}`)
      }
    }

    const total =
      result.created.members +
      result.created.clients +
      result.created.projects +
      result.created.rocks +
      result.created.tasks

    logger.info(
      { orgId: auth.organization.id, workspaceId, result },
      "Workspace build completed"
    )

    return NextResponse.json<ApiResponse<BuildResult>>({
      success: true,
      data: result,
      message: `Workspace built — ${total} items created, ${result.invitesSent} invite${result.invitesSent === 1 ? "" : "s"} sent`,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Build workspace error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to build workspace" },
      { status: 500 }
    )
  }
})

// ── Helpers ────────────────────────────────────────────────────────────────

function getCurrentQuarter(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const quarter = Math.ceil(month / 3)
  return `Q${quarter} ${year}`
}

function getQuarterEndDate(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const quarter = Math.ceil(month / 3)
  const endMonth = quarter * 3
  const endDay = new Date(year, endMonth, 0).getDate()
  return `${year}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`
}
