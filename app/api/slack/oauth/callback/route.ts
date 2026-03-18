import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { slackDb } from "@/lib/db/slack"
import { exchangeOAuthCode, listWorkspaceUsers } from "@/lib/integrations/slack-bot"

import { logger, logError } from "@/lib/logger"

/**
 * GET /api/slack/oauth/callback
 * OAuth callback from Slack - no auth middleware (redirect from Slack)
 *
 * Exchanges the authorization code for a bot token, stores the installation,
 * and auto-links users by email.
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.trytaskspace.com"

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    // Handle user denial
    if (error) {
      logger.warn({ error }, "Slack OAuth denied by user")
      return NextResponse.redirect(
        `${appUrl}/app?p=settings&slack=error&reason=access_denied`
      )
    }

    if (!code || !state) {
      logger.warn("Slack OAuth callback missing code or state")
      return NextResponse.redirect(`${appUrl}/app?p=settings&slack=error&reason=missing_params`)
    }

    // Decode and validate state
    let stateData: { orgId: string; userId: string; ts: number }
    try {
      const decoded = Buffer.from(state, "base64url").toString()
      stateData = JSON.parse(decoded)
    } catch {
      logger.warn("Slack OAuth callback: invalid state parameter")
      return NextResponse.redirect(`${appUrl}/app?p=settings&slack=error&reason=invalid_state`)
    }

    // Validate required fields
    if (!stateData.orgId || !stateData.userId || !stateData.ts) {
      logger.warn({ stateData }, "Slack OAuth callback: incomplete state data")
      return NextResponse.redirect(`${appUrl}/app?p=settings&slack=error&reason=invalid_state`)
    }

    // Check state timestamp (valid for 10 minutes)
    if (Date.now() - stateData.ts > 10 * 60 * 1000) {
      logger.warn("Slack OAuth callback: state expired")
      return NextResponse.redirect(`${appUrl}/app?p=settings&slack=error&reason=expired`)
    }

    // Verify the org exists and the userId belongs to it
    const org = await db.organizations.findById(stateData.orgId)
    if (!org) {
      logger.warn({ orgId: stateData.orgId }, "Slack OAuth callback: organization not found")
      return NextResponse.redirect(`${appUrl}/app?p=settings&slack=error&reason=org_not_found`)
    }

    const members = await db.members.findWithUsersByOrganizationId(stateData.orgId)
    const installingUser = members.find((m) => m.id === stateData.userId)
    if (!installingUser) {
      logger.warn(
        { userId: stateData.userId, orgId: stateData.orgId },
        "Slack OAuth callback: user not a member of org"
      )
      return NextResponse.redirect(`${appUrl}/app?p=settings&slack=error&reason=unauthorized`)
    }

    // Exchange code for token
    const redirectUri = `${appUrl}/api/slack/oauth/callback`
    const oauthResult = await exchangeOAuthCode(code, redirectUri)

    if (!oauthResult.ok || !oauthResult.access_token || !oauthResult.team) {
      logger.error({ error: oauthResult.error }, "Slack OAuth token exchange failed")
      return NextResponse.redirect(`${appUrl}/app?p=settings&slack=error&reason=token_exchange`)
    }

    // Store the installation (DB layer handles encryption)
    await slackDb.installations.create({
      organizationId: stateData.orgId,
      slackTeamId: oauthResult.team.id,
      slackTeamName: oauthResult.team.name,
      botUserId: oauthResult.bot_user_id || "",
      botToken: oauthResult.access_token,
      installerUserId: stateData.userId,
    })

    logger.info(
      {
        orgId: stateData.orgId,
        teamId: oauthResult.team.id,
        teamName: oauthResult.team.name,
      },
      "Slack bot installed successfully"
    )

    // Auto-link users by email
    try {
      const slackUsers = await listWorkspaceUsers(oauthResult.access_token)
      const activeMembers = members.filter((m) => m.status === "active")

      let linkedCount = 0
      for (const member of activeMembers) {
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
            organizationId: stateData.orgId,
            userId: member.id,
            slackUserId: matchingSlackUser.id,
            slackEmail: matchingSlackUser.profile?.email || "",
          })
          linkedCount++
        }
      }

      logger.info(
        { orgId: stateData.orgId, linkedCount, totalMembers: activeMembers.length },
        "Auto-linked Slack users by email"
      )
    } catch (linkError) {
      // Don't fail the whole installation if auto-linking fails
      logError(logger, "Failed to auto-link Slack users", linkError)
    }

    return NextResponse.redirect(`${appUrl}/app?p=settings&slack=connected`)
  } catch (error) {
    logError(logger, "Slack OAuth callback error", error)
    return NextResponse.redirect(`${appUrl}/app?p=settings&slack=error`)
  }
}
