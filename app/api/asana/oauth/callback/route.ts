import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import crypto from "crypto"
import { logger, logError } from "@/lib/logger"
import { encryptToken } from "@/lib/crypto/token-encryption"

/**
 * GET /api/asana/oauth/callback
 *
 * Handles the OAuth callback from Asana after user authorization.
 * Asana redirects here with an authorization code that can be exchanged for an access token.
 *
 * SECURITY: This route validates the state parameter to prevent CSRF attacks.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    // Handle errors from Asana
    if (error) {
      logger.error({ error, errorDescription }, "Asana OAuth error")
      return NextResponse.redirect(
        new URL(`/settings?asana_error=${encodeURIComponent(errorDescription || error)}`, request.url)
      )
    }

    // Validate authorization code exists
    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?asana_error=No authorization code received", request.url)
      )
    }

    // CSRF Protection: Validate state parameter
    if (!state) {
      logger.error({}, "Asana OAuth: Missing state parameter - potential CSRF attack")
      return NextResponse.redirect(
        new URL("/settings?asana_error=Invalid OAuth request - missing state parameter", request.url)
      )
    }

    // Verify state parameter exists in our database (stored when OAuth was initiated)
    // State format: base64(JSON.stringify({ sessionId, timestamp, nonce }))
    let stateData: { sessionId?: string; userId?: string; orgId?: string; timestamp?: number; nonce?: string }
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString("utf-8"))
    } catch {
      logger.error({}, "Asana OAuth: Invalid state parameter format")
      return NextResponse.redirect(
        new URL("/settings?asana_error=Invalid OAuth state", request.url)
      )
    }

    // Check state is not too old (max 10 minutes)
    const maxAge = 10 * 60 * 1000 // 10 minutes
    if (!stateData.timestamp || Date.now() - stateData.timestamp > maxAge) {
      logger.error({}, "Asana OAuth: State parameter expired")
      return NextResponse.redirect(
        new URL("/settings?asana_error=OAuth session expired - please try again", request.url)
      )
    }

    // Verify the user/org from state exists
    if (!stateData.userId || !stateData.orgId) {
      logger.error({}, "Asana OAuth: Missing user/org in state")
      return NextResponse.redirect(
        new URL("/settings?asana_error=Invalid OAuth state - missing user info", request.url)
      )
    }

    // Exchange authorization code for access token
    const clientId = process.env.ASANA_CLIENT_ID
    const clientSecret = process.env.ASANA_CLIENT_SECRET
    const redirectUri = `${new URL(request.url).origin}/api/asana/oauth/callback`

    if (!clientId || !clientSecret) {
      logger.error({}, "Asana OAuth: Missing client credentials")
      return NextResponse.redirect(
        new URL("/settings?asana_error=Asana integration not configured", request.url)
      )
    }

    const tokenResponse = await fetch("https://app.asana.com/-/oauth_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      logger.error({ errorData }, "Asana token exchange failed")
      return NextResponse.redirect(
        new URL(`/settings?asana_error=${encodeURIComponent(errorData.error_description || "Token exchange failed")}`, request.url)
      )
    }

    const tokenData = await tokenResponse.json()

    // tokenData contains:
    // - access_token: The token to use for API calls
    // - refresh_token: Token to refresh the access token
    // - expires_in: Seconds until access_token expires
    // - token_type: "bearer"
    // - data: { id, gid, name, email } - User info

    logger.info({ email: tokenData.data?.email }, "Asana OAuth successful for user")

    // Encrypt tokens before storing in database
    const encryptedAccessToken = encryptToken(tokenData.access_token)
    const encryptedRefreshToken = encryptToken(tokenData.refresh_token || null)
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString()

    await sql`
      UPDATE organization_members
      SET
        asana_pat = ${encryptedAccessToken},
        asana_refresh_token = ${encryptedRefreshToken},
        asana_token_expires_at = ${expiresAt}
      WHERE organization_id = ${stateData.orgId} AND user_id = ${stateData.userId}
    `

    return NextResponse.redirect(
      new URL(`/settings?asana_success=true&asana_user=${encodeURIComponent(tokenData.data?.email || "")}`, request.url)
    )
  } catch (error) {
    logError(logger, "Asana OAuth callback error", error)
    return NextResponse.redirect(
      new URL("/settings?asana_error=An unexpected error occurred", request.url)
    )
  }
}

/**
 * Helper to generate OAuth state parameter
 * Call this when initiating OAuth to create a secure state
 */
export function generateOAuthState(userId: string, orgId: string): string {
  const stateData = {
    userId,
    orgId,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString("hex"),
  }
  return Buffer.from(JSON.stringify(stateData)).toString("base64")
}
