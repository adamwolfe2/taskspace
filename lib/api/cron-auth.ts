/**
 * Shared cron job authentication
 *
 * Verifies the CRON_SECRET header using timing-safe comparison
 * to prevent timing attacks on the secret value.
 */

import crypto from "crypto"
import { NextRequest } from "next/server"
import { logger } from "@/lib/logger"

export function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      logger.error("CRON_SECRET not configured — denying cron request")
      return false
    }
    logger.warn("CRON_SECRET not configured — allowing cron in development mode")
    return true
  }

  // Defense-in-depth: in production, also check for Vercel's cron header
  // Vercel automatically sets this header when invoking cron jobs
  if (process.env.NODE_ENV === "production" && process.env.VERCEL === "1") {
    const vercelCronHeader = request.headers.get("x-vercel-cron")
    if (!vercelCronHeader) {
      logger.warn("Cron request missing x-vercel-cron header in production")
      // Don't reject — the CRON_SECRET check below is the primary gate
      // This just logs for monitoring
    }
  }

  const provided = request.headers.get("authorization") || ""
  const expected = `Bearer ${cronSecret}`

  // Use timing-safe comparison to prevent timing attacks
  if (provided.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
}
