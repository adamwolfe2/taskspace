import { NextRequest, NextResponse } from "next/server"
import { withAuth, withAdmin } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { slackDb } from "@/lib/db/slack"
import {
  sendBotDM,
  listWorkspaceUsers,
  findSlackUserByEmail,
} from "@/lib/integrations/slack-bot"
import { decryptToken } from "@/lib/crypto/token-encryption"
import { logger, logError } from "@/lib/logger"
import { z } from "zod"
import type { ApiResponse } from "@/lib/types"

// Validation schemas
const updateSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  userMappings: z
    .array(
      z.object({
        userId: z.string().min(1),
        enabled: z.boolean(),
      })
    )
    .optional(),
})

const postActionSchema = z.object({
  action: z.enum(["test_dm", "link_users", "unlink_user"]),
  userId: z.string().optional(), // Required for unlink_user
})

/**
 * GET /api/slack/admin
 * Return Slack bot status for the organization
 */
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const orgId = auth.organization.id

    // Get installation
    const installation = await slackDb.installations.findByOrgId(orgId)

    if (!installation) {
      return NextResponse.json<ApiResponse<{
        installed: boolean
        enabled: boolean
        teamName: string | null
        linkedUsersCount: number
        totalMembers: number
        userMappings: never[]
      }>>({
        success: true,
        data: {
          installed: false,
          enabled: false,
          teamName: null,
          linkedUsersCount: 0,
          totalMembers: 0,
          userMappings: [],
        },
      })
    }

    // Get user mappings
    const userMappings = await slackDb.userMappings.findByOrgId(orgId)

    // Get total org members
    const members = await db.members.findWithUsersByOrganizationId(orgId)
    const activeMembers = members.filter((m) => m.status === "active")

    // Build user mapping response with names
    const mappingsWithNames = userMappings.map((mapping) => {
      const member = activeMembers.find((m) => m.id === mapping.userId)
      return {
        userId: mapping.userId,
        userName: member?.name || "Unknown",
        slackUserId: mapping.slackUserId,
        slackEmail: mapping.slackEmail,
        enabled: mapping.enabled,
      }
    })

    return NextResponse.json<ApiResponse<{
      installed: boolean
      enabled: boolean
      teamName: string | null
      linkedUsersCount: number
      totalMembers: number
      userMappings: typeof mappingsWithNames
    }>>({
      success: true,
      data: {
        installed: true,
        enabled: installation.enabled,
        teamName: installation.slackTeamName,
        linkedUsersCount: userMappings.filter((m) => m.enabled).length,
        totalMembers: activeMembers.length,
        userMappings: mappingsWithNames,
      },
    })
  } catch (error) {
    logError(logger, "Get Slack admin status error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get Slack status" },
      { status: 500 }
    )
  }
})

/**
 * PUT /api/slack/admin
 * Update Slack bot settings (admin only)
 */
export const PUT = withAdmin(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const parsed = updateSettingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Invalid request: ${parsed.error.message}` },
        { status: 400 }
      )
    }

    const { enabled, userMappings } = parsed.data
    const orgId = auth.organization.id

    // Get installation
    const installation = await slackDb.installations.findByOrgId(orgId)
    if (!installation) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Slack bot is not installed" },
        { status: 404 }
      )
    }

    // Update installation enabled status
    if (enabled !== undefined) {
      await slackDb.installations.update(orgId, { enabled })
      logger.info(
        { orgId, enabled },
        "Slack installation enabled status updated"
      )
    }

    // Update individual user mapping enabled/disabled
    if (userMappings && userMappings.length > 0) {
      for (const mapping of userMappings) {
        await slackDb.userMappings.updateByUserAndOrg(
          orgId,
          mapping.userId,
          { enabled: mapping.enabled }
        )
      }
      logger.info(
        { orgId, updatedCount: userMappings.length },
        "Slack user mappings updated"
      )
    }

    return NextResponse.json<ApiResponse<{ updated: true }>>({
      success: true,
      data: { updated: true },
    })
  } catch (error) {
    logError(logger, "Update Slack admin settings error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update Slack settings" },
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/slack/admin
 * Disconnect Slack bot (admin only)
 */
export const DELETE = withAdmin(async (request: NextRequest, auth) => {
  try {
    const orgId = auth.organization.id

    // Verify installation exists
    const installation = await slackDb.installations.findByOrgId(orgId)
    if (!installation) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Slack bot is not installed" },
        { status: 404 }
      )
    }

    // Delete all related records
    await slackDb.conversations.deleteByOrgId(orgId)
    await slackDb.userMappings.deleteByOrgId(orgId)
    await slackDb.installations.delete(orgId)

    logger.info(
      { orgId, teamId: installation.slackTeamId, teamName: installation.slackTeamName },
      "Slack bot disconnected"
    )

    return NextResponse.json<ApiResponse<{ disconnected: true }>>({
      success: true,
      data: { disconnected: true },
    })
  } catch (error) {
    logError(logger, "Disconnect Slack error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to disconnect Slack" },
      { status: 500 }
    )
  }
})

/**
 * POST /api/slack/admin
 * Manual admin actions (admin only)
 * Actions: test_dm, link_users, unlink_user
 */
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const parsed = postActionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Invalid request: ${parsed.error.message}` },
        { status: 400 }
      )
    }

    const { action, userId } = parsed.data
    const orgId = auth.organization.id

    // Get installation
    const installation = await slackDb.installations.findByOrgId(orgId)
    if (!installation) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Slack bot is not installed" },
        { status: 404 }
      )
    }

    // Bot token is already decrypted by the DB layer
    const botToken = installation.botToken

    switch (action) {
      case "test_dm": {
        // Send a test DM to the requesting admin
        const adminMapping = await slackDb.userMappings.findByUserAndOrg(
          auth.user.id,
          orgId
        )

        if (!adminMapping) {
          // Try to find the admin by email in Slack
          const members = await db.members.findWithUsersByOrganizationId(orgId)
          const adminMember = members.find((m) => m.id === auth.user.id)

          if (!adminMember?.email) {
            return NextResponse.json<ApiResponse<null>>(
              { success: false, error: "Your account is not linked to Slack. Please link your account first." },
              { status: 400 }
            )
          }

          const slackUser = await findSlackUserByEmail(botToken, adminMember.email)
          if (!slackUser) {
            return NextResponse.json<ApiResponse<null>>(
              {
                success: false,
                error: "Could not find your Slack account. Make sure you use the same email in both Taskspace and Slack.",
              },
              { status: 400 }
            )
          }

          // Send test DM using the found Slack user
          await sendBotDM(
            botToken,
            slackUser.id,
            [{ type: "section", text: { type: "mrkdwn", text: "This is a test message from the *Taskspace* Slack bot. If you can see this, the integration is working correctly!" } }],
            "Taskspace test message"
          )

          return NextResponse.json<ApiResponse<{ sent: true }>>({
            success: true,
            data: { sent: true },
          })
        }

        await sendBotDM(
          botToken,
          adminMapping.slackUserId,
          [{ type: "section", text: { type: "mrkdwn", text: "This is a test message from the *Taskspace* Slack bot. If you can see this, the integration is working correctly!" } }],
          "Taskspace test message"
        )

        logger.info(
          { orgId, adminUserId: auth.user.id },
          "Slack test DM sent"
        )

        return NextResponse.json<ApiResponse<{ sent: true }>>({
          success: true,
          data: { sent: true },
        })
      }

      case "link_users": {
        // Re-run auto-link by email for all org members
        const slackUsers = await listWorkspaceUsers(botToken)
        const members = await db.members.findWithUsersByOrganizationId(orgId)
        const activeMembers = members.filter((m) => m.status === "active")
        const existingMappings = await slackDb.userMappings.findByOrgId(orgId)
        const alreadyLinkedUserIds = new Set(
          existingMappings.map((m) => m.userId)
        )

        let linkedCount = 0
        for (const member of activeMembers) {
          // Skip already linked members
          if (alreadyLinkedUserIds.has(member.id)) continue
          if (!member.email) continue

          const matchingSlackUser = slackUsers.find(
            (su) =>
              su.profile?.email &&
              su.profile.email.toLowerCase() === member.email.toLowerCase() &&
              !su.deleted &&
              !su.is_bot
          )

          if (matchingSlackUser) {
            await slackDb.userMappings.create({
              organizationId: orgId,
              userId: member.id,
              slackUserId: matchingSlackUser.id,
              slackEmail: matchingSlackUser.profile?.email || "",
            })
            linkedCount++
          }
        }

        logger.info(
          { orgId, linkedCount, totalMembers: activeMembers.length },
          "Slack users re-linked by email"
        )

        return NextResponse.json<
          ApiResponse<{ linked: number; total: number }>
        >({
          success: true,
          data: { linked: linkedCount, total: activeMembers.length },
        })
      }

      case "unlink_user": {
        if (!userId) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "userId is required for unlink_user action" },
            { status: 400 }
          )
        }

        await slackDb.userMappings.deleteByUserAndOrg(userId, orgId)

        logger.info(
          { orgId, unlinkedUserId: userId },
          "Slack user unlinked"
        )

        return NextResponse.json<ApiResponse<{ unlinked: true }>>({
          success: true,
          data: { unlinked: true },
        })
      }

      default:
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    logError(logger, "Slack admin action error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to perform Slack action" },
      { status: 500 }
    )
  }
})
