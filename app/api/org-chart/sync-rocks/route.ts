import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import type { Rock, RockMilestone } from "@/lib/types"

/**
 * Formats workspace rocks (with milestones) into the org chart string format
 * Format: "Rock 1: Title\n* task1\n* task2\nRock 2: Title..."
 */
function formatRocksForOrgChart(rocks: Rock[], milestonesByRockId: Map<string, RockMilestone[]>): string {
  if (rocks.length === 0) return ""

  return rocks.map((rock, index) => {
    const milestones = milestonesByRockId.get(rock.id) || []
    const bulletPoints = milestones.map(m => `* ${m.text}`).join("\n")
    const rockLine = `Rock ${index + 1}: ${rock.title}`
    return bulletPoints ? `${rockLine}\n${bulletPoints}` : rockLine
  }).join("\n\n")
}

/**
 * Determines the current quarter string (e.g., "Q1 2026")
 */
function getCurrentQuarter(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  let quarter: number
  if (month <= 3) quarter = 1
  else if (month <= 6) quarter = 2
  else if (month <= 9) quarter = 3
  else quarter = 4

  return `Q${quarter} ${year}`
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Admin check
    if (!isAdmin(auth)) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      )
    }

    const orgId = auth.organization.id
    const currentQuarter = getCurrentQuarter()

    // Get all team members with their user info
    const teamMembers = await db.members.findByOrganizationId(orgId)

    // Get all rocks for this organization, filtering by current quarter
    const allRocks = await db.rocks.findByOrganizationId(orgId)
    const quarterRocks = allRocks.filter(rock =>
      rock.quarter === currentQuarter || !rock.quarter
    )

    // Group rocks by userId
    const rocksByUserId = new Map<string, Rock[]>()
    for (const rock of quarterRocks) {
      const existing = rocksByUserId.get(rock.userId) || []
      existing.push(rock)
      rocksByUserId.set(rock.userId, existing)
    }

    // Get milestones for all rocks
    const milestonesByRockId = new Map<string, RockMilestone[]>()
    for (const rock of quarterRocks) {
      try {
        const milestones = await db.rockMilestones.findByRockId(rock.id)
        milestonesByRockId.set(rock.id, milestones.map(m => ({
          id: m.id,
          text: m.text,
          completed: m.completed,
          completedAt: m.completedAt || undefined,
        })))
      } catch {
        // No milestones table or rock has no milestones
        milestonesByRockId.set(rock.id, [])
      }
    }

    // Track sync results
    const results: {
      synced: { name: string; email: string; rockCount: number }[]
      notFound: { name: string; email: string }[]
      noRocks: { name: string; email: string }[]
    } = {
      synced: [],
      notFound: [],
      noRocks: [],
    }

    // For each team member, sync their rocks to the org chart
    for (const member of teamMembers) {
      if (!member.userId || member.status !== "active") continue

      const memberEmail = member.email
      const memberName = member.name

      // Get their rocks
      const userRocks = rocksByUserId.get(member.userId) || []

      if (userRocks.length === 0) {
        results.noRocks.push({ name: memberName, email: memberEmail })
        continue
      }

      // Find matching org chart employee by email
      const orgChartEmployee = await db.maEmployees.findByEmail(memberEmail)

      if (!orgChartEmployee) {
        results.notFound.push({ name: memberName, email: memberEmail })
        continue
      }

      // Format rocks for org chart
      const rocksText = formatRocksForOrgChart(userRocks, milestonesByRockId)

      // Update the org chart employee's rocks
      await db.maEmployees.updateRocks(orgChartEmployee.id, rocksText)

      results.synced.push({
        name: memberName,
        email: memberEmail,
        rockCount: userRocks.length,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Synced rocks for ${results.synced.length} employees`,
      quarter: currentQuarter,
      results,
    })
  } catch (error) {
    console.error("Rocks sync error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const orgId = auth.organization.id
    const currentQuarter = getCurrentQuarter()

    // Get team members
    const teamMembers = await db.members.findByOrganizationId(orgId)
    const activeMembers = teamMembers.filter(m => m.status === "active" && m.userId)

    // Get org chart employees
    const orgChartEmployees = await db.maEmployees.findAll()

    // Check which members are mapped
    const mappingStatus = await Promise.all(
      activeMembers.map(async (member) => {
        const orgChartEmployee = await db.maEmployees.findByEmail(member.email)
        const rocks = member.userId ? await db.rocks.findByUserId(member.userId, orgId) : []
        const quarterRocks = rocks.filter(r => r.quarter === currentQuarter || !r.quarter)

        return {
          name: member.name,
          email: member.email,
          isMapped: !!orgChartEmployee,
          orgChartName: orgChartEmployee?.fullName || null,
          workspaceRockCount: quarterRocks.length,
          orgChartHasRocks: !!orgChartEmployee?.rocks,
        }
      })
    )

    return NextResponse.json({
      success: true,
      quarter: currentQuarter,
      totalWorkspaceMembers: activeMembers.length,
      totalOrgChartEmployees: orgChartEmployees.length,
      mappingStatus,
    })
  } catch (error) {
    console.error("Rocks sync status error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to get status" },
      { status: 500 }
    )
  }
}
