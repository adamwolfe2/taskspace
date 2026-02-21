import { NextRequest, NextResponse } from "next/server"
import { withDangerousAdmin } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { consolidateAccountSchema } from "@/lib/validation/schemas"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/migrations/consolidate-account
 *
 * Transfers all organization memberships, ownership, tasks, rocks, and EOD reports
 * from an old user account to the current (new) user account. Used to consolidate
 * multiple accounts into a single master account.
 *
 * Protected by withDangerousAdmin (owner role + ADMIN_OPS_SECRET in production).
 * Idempotent — safe to run multiple times.
 *
 * Request body: { oldUserEmail: string }
 */
export const POST = withDangerousAdmin(async (request: NextRequest, auth) => {
  try {
    const { oldUserEmail } = await validateBody(request, consolidateAccountSchema)

    const newUserId = auth.user.id
    const newUserEmail = auth.user.email

    // Prevent self-consolidation
    if (oldUserEmail.toLowerCase() === newUserEmail.toLowerCase()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Cannot consolidate account into itself" },
        { status: 400 }
      )
    }

    // Find the old user
    const { rows: oldUsers } = await sql`
      SELECT id, email, name FROM users WHERE LOWER(email) = LOWER(${oldUserEmail})
    `
    if (oldUsers.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `User not found: ${oldUserEmail}` },
        { status: 404 }
      )
    }

    const oldUserId = oldUsers[0].id as string
    const oldUserName = oldUsers[0].name as string

    logger.info(`Starting account consolidation: ${oldUserEmail} (${oldUserId}) → ${newUserEmail} (${newUserId})`)

    const results: Record<string, number> = {}

    // 1. Transfer organization_members rows (skip duplicates where new user already has membership)
    const { rowCount: membersTransferred } = await sql`
      UPDATE organization_members
      SET user_id = ${newUserId},
          email = ${newUserEmail}
      WHERE user_id = ${oldUserId}
        AND organization_id NOT IN (
          SELECT organization_id FROM organization_members WHERE user_id = ${newUserId}
        )
    `
    results.membersTransferred = membersTransferred ?? 0

    // 2. Transfer organization ownership
    const { rowCount: orgsTransferred } = await sql`
      UPDATE organizations
      SET owner_id = ${newUserId}
      WHERE owner_id = ${oldUserId}
    `
    results.orgsTransferred = orgsTransferred ?? 0

    // 3. Transfer EOD reports
    const { rowCount: eodsTransferred } = await sql`
      UPDATE eod_reports
      SET user_id = ${newUserId}
      WHERE user_id = ${oldUserId}
    `
    results.eodsTransferred = eodsTransferred ?? 0

    // 4. Transfer assigned tasks (assignee)
    const { rowCount: tasksTransferred } = await sql`
      UPDATE assigned_tasks
      SET assignee_id = ${newUserId},
          assignee_name = ${auth.user.name}
      WHERE assignee_id = ${oldUserId}
    `
    results.tasksTransferred = tasksTransferred ?? 0

    // 5. Transfer assigned tasks (assigned_by)
    const { rowCount: tasksAssignedByTransferred } = await sql`
      UPDATE assigned_tasks
      SET assigned_by_id = ${newUserId},
          assigned_by_name = ${auth.user.name}
      WHERE assigned_by_id = ${oldUserId}
    `
    results.tasksAssignedByTransferred = tasksAssignedByTransferred ?? 0

    // 6. Transfer rocks
    const { rowCount: rocksTransferred } = await sql`
      UPDATE rocks
      SET user_id = ${newUserId}
      WHERE user_id = ${oldUserId}
    `
    results.rocksTransferred = rocksTransferred ?? 0

    // 7. Transfer personal tasks
    const { rowCount: personalTasksTransferred } = await sql`
      UPDATE tasks
      SET user_id = ${newUserId}
      WHERE user_id = ${oldUserId}
    `
    results.personalTasksTransferred = personalTasksTransferred ?? 0

    // 8. Transfer notifications
    const { rowCount: notificationsTransferred } = await sql`
      UPDATE notifications
      SET user_id = ${newUserId}
      WHERE user_id = ${oldUserId}
    `
    results.notificationsTransferred = notificationsTransferred ?? 0

    // 9. Transfer sessions (invalidate old user sessions)
    const { rowCount: sessionsDeleted } = await sql`
      DELETE FROM sessions WHERE user_id = ${oldUserId}
    `
    results.sessionsDeleted = sessionsDeleted ?? 0

    // 10. Transfer manager references
    const { rowCount: managerRefsUpdated } = await sql`
      UPDATE organization_members
      SET manager_id = ${newUserId}
      WHERE manager_id = ${oldUserId}
    `
    results.managerRefsUpdated = managerRefsUpdated ?? 0

    // 11. Transfer user_organization_preferences (if exists)
    try {
      const { rowCount: prefsTransferred } = await sql`
        UPDATE user_organization_preferences
        SET user_id = ${newUserId}
        WHERE user_id = ${oldUserId}
          AND user_id NOT IN (
            SELECT user_id FROM user_organization_preferences WHERE user_id = ${newUserId}
          )
      `
      results.prefsTransferred = prefsTransferred ?? 0
    } catch {
      // Table may not exist yet
      results.prefsTransferred = 0
    }

    // 12. Transfer AI conversations
    const { rowCount: aiConversationsTransferred } = await sql`
      UPDATE ai_conversations
      SET user_id = ${newUserId}
      WHERE user_id = ${oldUserId}
    `
    results.aiConversationsTransferred = aiConversationsTransferred ?? 0

    // 13. Transfer admin brain dumps
    const { rowCount: brainDumpsTransferred } = await sql`
      UPDATE admin_brain_dumps
      SET admin_id = ${newUserId}
      WHERE admin_id = ${oldUserId}
    `
    results.brainDumpsTransferred = brainDumpsTransferred ?? 0

    // 14. Transfer workspace_members (skip duplicates where new user already has membership)
    const { rowCount: workspaceMembersTransferred } = await sql`
      UPDATE workspace_members
      SET user_id = ${newUserId}
      WHERE user_id = ${oldUserId}
        AND workspace_id NOT IN (
          SELECT workspace_id FROM workspace_members WHERE user_id = ${newUserId}
        )
    `
    results.workspaceMembersTransferred = workspaceMembersTransferred ?? 0

    // Clean up leftover workspace_members for old user (duplicates that couldn't transfer)
    const { rowCount: workspaceMembersDeleted } = await sql`
      DELETE FROM workspace_members WHERE user_id = ${oldUserId}
    `
    results.workspaceMembersDuplicatesDeleted = workspaceMembersDeleted ?? 0

    logger.info(`Account consolidation complete: ${oldUserEmail} → ${newUserEmail} — ${JSON.stringify(results)}`)

    return NextResponse.json<ApiResponse<{
      oldUser: { id: string; email: string; name: string }
      newUser: { id: string; email: string }
      results: Record<string, number>
    }>>({
      success: true,
      data: {
        oldUser: { id: oldUserId, email: oldUserEmail, name: oldUserName },
        newUser: { id: newUserId, email: newUserEmail },
        results,
      },
      message: `Successfully consolidated ${oldUserEmail} into ${newUserEmail}`,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Account consolidation failed", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Account consolidation failed" },
      { status: 500 }
    )
  }
})
