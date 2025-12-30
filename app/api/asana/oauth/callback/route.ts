import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/asana/oauth/callback
 *
 * Handles the OAuth callback from Asana after user authorization.
 * Asana redirects here with an authorization code that can be exchanged for an access token.
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
      console.error("Asana OAuth error:", error, errorDescription)
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

    // Exchange authorization code for access token
    const clientId = process.env.ASANA_CLIENT_ID
    const clientSecret = process.env.ASANA_CLIENT_SECRET
    const redirectUri = `${new URL(request.url).origin}/api/asana/oauth/callback`

    if (!clientId || !clientSecret) {
      console.error("Asana OAuth: Missing client credentials")
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
      console.error("Asana token exchange failed:", errorData)
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

    console.log("Asana OAuth successful for user:", tokenData.data?.email)

    // For now, redirect to settings with success message
    // In a full implementation, you would:
    // 1. Store the access_token and refresh_token in the database
    // 2. Associate with the current user/organization
    // 3. Use the token for API calls

    // The state parameter can be used to pass the user's session/org ID
    // to know which account to associate the token with

    return NextResponse.redirect(
      new URL(`/settings?asana_success=true&asana_user=${encodeURIComponent(tokenData.data?.email || "")}`, request.url)
    )
  } catch (error) {
    console.error("Asana OAuth callback error:", error)
    return NextResponse.redirect(
      new URL("/settings?asana_error=An unexpected error occurred", request.url)
    )
  }
}
