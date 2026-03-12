import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { generateRockRetrospective } from "@/lib/ai/claude-client"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse, RockRetrospective } from "@/lib/types"
import { sql } from "@/lib/db/sql"
import { db } from "@/lib/db"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { generateRockRetroSchema } from "@/lib/validation/schemas"

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const quarter = searchParams.get("quarter")

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    let query
    if (quarter) {
      query = sql`
        SELECT * FROM rock_retrospectives
        WHERE workspace_id = ${workspaceId} AND org_id = ${auth.organization.id} AND quarter = ${quarter}
        ORDER BY created_at DESC
        LIMIT 1
      `
    } else {
      query = sql`
        SELECT * FROM rock_retrospectives
        WHERE workspace_id = ${workspaceId} AND org_id = ${auth.organization.id}
        ORDER BY created_at DESC
        LIMIT 10
      `
    }

    const result = await query
    const retrospectives: RockRetrospective[] = result.rows.map(row => ({
      id: row.id as string,
      orgId: row.org_id as string,
      workspaceId: row.workspace_id as string,
      quarter: row.quarter as string,
      aiAnalysis: row.ai_analysis as RockRetrospective["aiAnalysis"],
      completionRate: parseFloat(row.completion_rate as string) || 0,
      totalRocks: (row.total_rocks as number) || 0,
      completedRocks: (row.completed_rocks as number) || 0,
      createdBy: row.created_by as string | undefined,
      createdAt: (row.created_at as Date)?.toISOString() || "",
    }))

    return NextResponse.json<ApiResponse<RockRetrospective[]>>({
      success: true,
      data: retrospectives,
    })
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch retrospectives" },
      { status: 500 }
    )
  }
})

export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const { workspaceId, quarter } = await validateBody(request, generateRockRetroSchema)

    // Credit check
    const creditCheck = await checkCreditsOrRespond({
      organizationId: auth.organization.id,
      userId: auth.user.id,
    })
    if (creditCheck instanceof NextResponse) return creditCheck as NextResponse<ApiResponse<null>>

    // Check if retrospective already exists for this quarter
    const existing = await sql`
      SELECT id FROM rock_retrospectives
      WHERE workspace_id = ${workspaceId} AND quarter = ${quarter}
    `
    if (existing.rows.length > 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Retrospective already exists for this quarter" },
        { status: 409 }
      )
    }

    // Fetch rocks for the quarter
    const allRocks = await db.rocks.findByOrganizationId(auth.organization.id)
    const quarterRocks = allRocks.filter(r => r.quarter === quarter)

    if (quarterRocks.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No rocks found for this quarter" },
        { status: 404 }
      )
    }

    // Get member names for owner lookup
    const members = await db.members.findWithUsersByOrganizationId(auth.organization.id)
    const memberMap = new Map(members.map(m => [m.id, m.name]))

    const rocksForAI = quarterRocks.map(r => ({
      title: r.title,
      owner: memberMap.get(r.userId || "") || undefined,
      status: r.status,
      progress: r.progress,
      milestones: r.milestones?.map(m => m.text) || [],
    }))

    const { result: analysis, usage } = await generateRockRetrospective(rocksForAI)

    const completedRocks = quarterRocks.filter(r => r.status === "completed").length
    const completionRate = (completedRocks / quarterRocks.length) * 100

    const id = generateId()
    await sql`
      INSERT INTO rock_retrospectives (id, org_id, workspace_id, quarter, ai_analysis, completion_rate, total_rocks, completed_rocks, created_by, created_at)
      VALUES (
        ${id},
        ${auth.organization.id},
        ${workspaceId},
        ${quarter},
        ${JSON.stringify(analysis)}::jsonb,
        ${completionRate},
        ${quarterRocks.length},
        ${completedRocks},
        ${auth.user.id},
        NOW()
      )
    `

    await recordUsage({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "rock-retrospective",
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    })

    const retrospective: RockRetrospective = {
      id,
      orgId: auth.organization.id,
      workspaceId,
      quarter,
      aiAnalysis: analysis,
      completionRate,
      totalRocks: quarterRocks.length,
      completedRocks,
      createdBy: auth.user.id,
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json<ApiResponse<RockRetrospective>>({
      success: true,
      data: retrospective,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to generate retrospective" },
      { status: 500 }
    )
  }
})
