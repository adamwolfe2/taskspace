/**
 * POST /api/admin/migrate-member
 *
 * Migrates a draft (placeholder) member to a real email address.
 * - Updates the member's email to the real email
 * - Creates an invitation for the real email
 * - Stores the placeholder user ID on the invitation so that when the
 *   real user accepts, all tasks/rocks transfer from the old placeholder user.
 */

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAdmin } from "@/lib/api/middleware"
import { generateId, generateInviteToken, getExpirationDate } from "@/lib/auth/password"
import { sendInvitationEmail } from "@/lib/email"
import { withTransaction } from "@/lib/db/transactions"
import type { Invitation, ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { z } from "zod"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { sql } from "@/lib/db/sql"

const migrateMemberSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  newEmail: z.string().email("Invalid email address"),
})

export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    const { memberId, newEmail } = await validateBody(request, migrateMemberSchema)
    const normalizedEmail = newEmail.toLowerCase()

    // Ensure the placeholder_user_id column exists (self-healing migration)
    try {
      await sql`ALTER TABLE invitations ADD COLUMN IF NOT EXISTS placeholder_user_id VARCHAR(255)`
    } catch {
      // Column likely already exists
    }

    // Find the draft member
    const member = await db.members.findByOrgAndId(auth.organization.id, memberId)
    if (!member) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Member not found" },
        { status: 404 }
      )
    }

    if (member.status === "active") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "This member is already active. Only pending/draft members can be migrated." },
        { status: 400 }
      )
    }

    const oldEmail = member.email
    if (oldEmail.toLowerCase() === normalizedEmail) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "New email is the same as the current email. Use the standard invite flow instead." },
        { status: 400 }
      )
    }

    // Check if the new email is already used by an active member in this org
    const existingMember = await db.members.findByOrgAndEmail(auth.organization.id, normalizedEmail)
    if (existingMember && existingMember.id !== member.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "A member with this email already exists in your organization" },
        { status: 409 }
      )
    }

    // Look up the placeholder user (if one exists for the old email)
    const placeholderUser = await db.users.findByEmail(oldEmail)
    const placeholderUserId = placeholderUser?.id || null

    // Count how many items will be migrated
    let taskCount = 0
    let rockCount = 0
    if (placeholderUserId) {
      const { rows: taskRows } = await sql`
        SELECT COUNT(*)::int as count FROM assigned_tasks
        WHERE assignee_id = ${placeholderUserId} AND organization_id = ${auth.organization.id}
      `
      taskCount = taskRows[0]?.count || 0

      const { rows: rockRows } = await sql`
        SELECT COUNT(*)::int as count FROM rocks
        WHERE (user_id = ${placeholderUserId} OR owner_email = ${oldEmail})
          AND organization_id = ${auth.organization.id}
      `
      rockCount = rockRows[0]?.count || 0
    }

    // Execute migration in a transaction
    const result = await withTransaction(async (client) => {
      const now = new Date().toISOString()

      // Update the member's email
      await client.sql`
        UPDATE organization_members
        SET email = ${normalizedEmail}, status = ${"invited"}
        WHERE id = ${member.id} AND organization_id = ${auth.organization.id}
      `

      // Check for existing pending invitation for the new email in this org
      const { rows: existingInvites } = await client.sql<{ id: string }>`
        SELECT id FROM invitations
        WHERE organization_id = ${auth.organization.id}
          AND LOWER(email) = LOWER(${normalizedEmail})
          AND status = 'pending'
      `
      if (existingInvites.length > 0) {
        // Cancel old invitation
        await client.sql`
          UPDATE invitations SET status = 'cancelled'
          WHERE id = ${existingInvites[0].id}
        `
      }

      // Create invitation with placeholder_user_id
      const invitationId = generateId()
      const token = generateInviteToken()
      const expiresAt = getExpirationDate(24 * 7) // 7 days

      await client.sql`
        INSERT INTO invitations (
          id, organization_id, email, role, department,
          token, expires_at, created_at, invited_by, status, placeholder_user_id
        )
        VALUES (
          ${invitationId}, ${auth.organization.id}, ${normalizedEmail},
          ${member.role === "owner" ? "admin" : member.role}, ${member.department || "General"},
          ${token}, ${expiresAt}, ${now}, ${auth.user.id}, ${"pending"},
          ${placeholderUserId}
        )
      `

      const invitation: Invitation = {
        id: invitationId,
        organizationId: auth.organization.id,
        email: normalizedEmail,
        role: member.role === "owner" ? "admin" : member.role,
        department: member.department || "General",
        token,
        expiresAt,
        createdAt: now,
        invitedBy: auth.user.id,
        status: "pending",
      }

      return { invitation, placeholderUserId }
    })

    // Send invitation email (non-critical)
    let emailSent = false
    try {
      const emailResult = await sendInvitationEmail(result.invitation, auth.organization, auth.user.name)
      emailSent = emailResult.success
      if (!emailResult.success) {
        logError(logger, "Failed to send migration invitation email", emailResult.error)
      }
    } catch (error) {
      logError(logger, "Failed to send migration invitation email", error)
    }

    logger.info({
      memberId: member.id,
      oldEmail,
      newEmail: normalizedEmail,
      placeholderUserId: result.placeholderUserId,
      taskCount,
      rockCount,
    }, "Member migration initiated")

    return NextResponse.json<ApiResponse<{
      invitation: Invitation
      migration: {
        oldEmail: string
        newEmail: string
        placeholderUserId: string | null
        tasksToTransfer: number
        rocksToTransfer: number
      }
      emailSent: boolean
    }>>({
      success: true,
      data: {
        invitation: result.invitation,
        migration: {
          oldEmail,
          newEmail: normalizedEmail,
          placeholderUserId: result.placeholderUserId,
          tasksToTransfer: taskCount,
          rocksToTransfer: rockCount,
        },
        emailSent,
      },
      message: `Migration initiated for ${member.name}. ${taskCount} tasks and ${rockCount} rocks will transfer when they accept the invitation.`,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    logError(logger, "Migrate member error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to migrate member" },
      { status: 500 }
    )
  }
})
