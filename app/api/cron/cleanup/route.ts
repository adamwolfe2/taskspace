/**
 * Daily Database Cleanup Cron
 *
 * Purges expired/used tokens, stale sessions, and expired invitations
 * to prevent unbounded table growth.
 *
 * Runs at 02:00 UTC daily (low-traffic window).
 * Configure in vercel.json: { "path": "/api/cron/cleanup", "schedule": "0 2 * * *" }
 */

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { logger } from "@/lib/logger"

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      logger.error("CRON_SECRET not configured — denying cleanup cron request")
      return false
    }
    logger.warn("CRON_SECRET not configured — allowing cleanup cron in development mode")
    return true
  }
  return request.headers.get("authorization") === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results: Record<string, number> = {}

  try {
    // 1. Expired + used password reset tokens
    const resetDeleted = await db.passwordResetTokens.deleteExpired()
    results.passwordResetTokens = resetDeleted
  } catch (err) {
    logger.error({ err }, "Cleanup: failed to delete expired password reset tokens")
    results.passwordResetTokens = -1
  }

  try {
    // 2. Expired + used email verification tokens
    const verifyDeleted = await db.emailVerificationTokens.deleteExpired()
    results.emailVerificationTokens = verifyDeleted
  } catch (err) {
    logger.error({ err }, "Cleanup: failed to delete expired email verification tokens")
    results.emailVerificationTokens = -1
  }

  try {
    // 3. Expired sessions (past expires_at) and inactive sessions (30+ days)
    const sessions = await db.sessions.cleanupExpiredSessions()
    results.expiredSessions = sessions.expired
    results.inactiveSessions = sessions.inactive
  } catch (err) {
    logger.error({ err }, "Cleanup: failed to clean up expired sessions")
    results.expiredSessions = -1
    results.inactiveSessions = -1
  }

  try {
    // 4. Mark pending invitations past their expiry date as expired
    const { rowCount } = await sql`
      UPDATE invitations
      SET status = 'expired'
      WHERE status = 'pending' AND expires_at < NOW()
    `
    results.expiredInvitations = rowCount ?? 0
  } catch (err) {
    logger.error({ err }, "Cleanup: failed to expire stale invitations")
    results.expiredInvitations = -1
  }

  logger.info({ results }, "Daily cleanup cron completed")

  return NextResponse.json({ success: true, results })
}
