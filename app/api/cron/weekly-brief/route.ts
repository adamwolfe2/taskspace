import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateWeeklyBrief, isClaudeConfigured } from "@/lib/ai/claude-client"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse, Organization } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { CONFIG } from "@/lib/config"
import * as Sentry from "@sentry/nextjs"
import { sql } from "@/lib/db/sql"

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const isProduction = process.env.NODE_ENV === "production"
  if (!cronSecret) {
    if (isProduction) return false
    return true
  }
  return request.headers.get("authorization") === `Bearer ${cronSecret}`
}

function isBriefTime(org: Organization, targetHour: number): boolean {
  const timezone = org.settings?.timezone || CONFIG.organization.defaultTimezone
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
    })
    const currentHour = parseInt(formatter.format(now), 10)
    return currentHour === targetHour
  } catch {
    return new Date().getUTCHours() === 12
  }
}

function getWeekStartInTimezone(timezone: string): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    return formatter.format(now)
  } catch {
    return new Date().toISOString().split("T")[0]
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isClaudeConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "AI features not configured" },
        { status: 503 }
      )
    }

    logger.info({ timestamp: new Date().toISOString() }, "Running weekly brief check")

    // Fast-exit: Monday briefs run at 7 AM. UTC window for US timezones: 11-15 UTC
    const utcHour = new Date().getUTCHours()
    if (utcHour < 11 || utcHour > 15) {
      return NextResponse.json<ApiResponse<{ results: never[] }>>({
        success: true,
        data: { results: [] },
        message: "Outside 7 AM window for US timezones — skipped",
      })
    }

    const organizations = await db.organizations.findAll()
    const results: { orgId: string; success: boolean; skipped?: string; error?: string; briefsGenerated?: number }[] = []

    for (const org of organizations) {
      if (!isBriefTime(org, 7)) {
        results.push({ orgId: org.id, success: true, skipped: "Not 7 AM" })
        continue
      }

      const timezone = org.settings?.timezone || CONFIG.organization.defaultTimezone
      const weekStart = getWeekStartInTimezone(timezone)

      try {
        const members = await db.members.findWithUsersByOrganizationId(org.id)
        const activeMembers = members.filter(m => m.status === "active")
        let briefsGenerated = 0

        // Process in batches of 5 to avoid API rate limits
        const BATCH_SIZE = 5
        for (let i = 0; i < activeMembers.length; i += BATCH_SIZE) {
          const batch = activeMembers.slice(i, i + BATCH_SIZE)
          const results_batch = await Promise.allSettled(
            batch.map(async (member) => {
              // Idempotency: check if brief already exists for this user/week
              const existing = await sql`
                SELECT id FROM weekly_briefs
                WHERE org_id = ${org.id} AND user_id = ${member.id} AND week_start = ${weekStart}::date
              `
              if (existing.rows.length > 0) return false

              // Fetch context for this member
              const [rocks, tasks, eodReports] = await Promise.all([
                db.rocks.findByOrganizationId(org.id).then(r =>
                  r.filter(rock => rock.userId === member.id && rock.status !== "completed")
                    .map(rock => ({ title: rock.title, progress: rock.progress, status: rock.status }))
                ),
                db.assignedTasks.findByAssigneeId(member.id, org.id).then(t =>
                  t.filter(task => task.status !== "completed")
                    .map(task => ({ title: task.title, dueDate: task.dueDate || "", status: task.status }))
                ),
                db.eodReports.findByOrganizationId(org.id).then(reports =>
                  reports
                    .filter(r => r.userId === member.id)
                    .slice(0, 5)
                    .map(r => ({ date: r.date, summary: r.challenges || undefined }))
                ),
              ])

              const { result: brief, usage } = await generateWeeklyBrief({
                rocks,
                tasks,
                meetings: [],
                lastWeekEODs: eodReports,
              })

              // Save brief
              await sql`
                INSERT INTO weekly_briefs (id, org_id, user_id, week_start, content, created_at)
                VALUES (${generateId()}, ${org.id}, ${member.id}, ${weekStart}::date, ${JSON.stringify(brief)}::jsonb, NOW())
                ON CONFLICT (org_id, user_id, week_start) DO NOTHING
              `

              // Record AI usage
              try {
                const { recordUsage } = await import("@/lib/ai/credits")
                await recordUsage({
                  organizationId: org.id,
                  userId: "system-cron",
                  action: "cron-weekly-brief",
                  model: usage.model,
                  inputTokens: usage.inputTokens,
                  outputTokens: usage.outputTokens,
                })
              } catch (usageErr) {
                logError(logger, "Failed to record weekly brief AI usage", usageErr)
              }

              return true
            })
          )
          for (const result of results_batch) {
            if (result.status === 'rejected') {
              logger.warn({ error: result.reason }, 'Failed to generate brief for user')
            } else if (result.value === true) {
              briefsGenerated++
            }
          }
        }

        results.push({ orgId: org.id, success: true, briefsGenerated })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logError(logger, `Weekly brief failed for org ${org.id}`, error)
        Sentry.captureMessage("Cron weekly-brief partially failed", {
          level: "warning",
          extra: { orgId: org.id, error: errorMessage },
        })
        results.push({ orgId: org.id, success: false, error: errorMessage })
      }
    }

    return NextResponse.json<ApiResponse<{ results: typeof results }>>({
      success: true,
      data: { results },
    })
  } catch (error) {
    logError(logger, "Weekly brief cron error", error)
    Sentry.captureException(error, { extra: { job: "weekly-brief" } })
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to generate weekly briefs" },
      { status: 500 }
    )
  }
}
