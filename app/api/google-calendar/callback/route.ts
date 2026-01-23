import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateId } from "@/lib/auth/password"
import * as googleCalendar from "@/lib/google-calendar"
import { logger, logError } from "@/lib/logger"

// GET /api/google-calendar/callback - OAuth callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    // Handle user denial
    if (error) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      return NextResponse.redirect(`${appUrl}?page=settings&tab=integrations&calendar_error=access_denied`)
    }

    if (!code || !state) {
      return NextResponse.json(
        { success: false, error: "Missing code or state" },
        { status: 400 }
      )
    }

    // Decode and validate state
    let stateData: { userId: string; orgId: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid state" },
        { status: 400 }
      )
    }

    // Check state timestamp (valid for 10 minutes)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.json(
        { success: false, error: "State expired" },
        { status: 400 }
      )
    }

    // Exchange code for tokens
    const tokens = await googleCalendar.exchangeCodeForTokens(code)

    const now = new Date().toISOString()

    // Save tokens to database
    await db.googleCalendarTokens.create({
      id: generateId(),
      userId: stateData.userId,
      organizationId: stateData.orgId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type,
      expiryDate: tokens.expiry_date,
      scope: tokens.scope,
      calendarId: 'primary',
      syncEnabled: true,
      createdAt: now,
      updatedAt: now,
    })

    // Redirect back to settings page
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${appUrl}?page=settings&tab=integrations&calendar_connected=true`)
  } catch (error) {
    logError(logger, "Google Calendar OAuth callback error", error)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${appUrl}?page=settings&tab=integrations&calendar_error=failed`)
  }
}
