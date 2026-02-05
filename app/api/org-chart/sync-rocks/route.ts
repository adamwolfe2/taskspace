import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import type { Rock, RockMilestone } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

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

    // Get workspaceId from request body
    const body = await request.json()
    const workspaceId = body.workspaceId

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    const orgId = auth.organization.id
    const currentQuarter = getCurrentQuarter()

    // Get all team members with their user info
    const teamMembers = await db.members.findByOrganizationId(orgId)

    // Pre-fetch all users for members that might need email lookup (batch query)
    const userIds = teamMembers
      .filter(m => m.userId && !m.email)
      .map(m => m.userId!)
    const usersMap = new Map<string, { email: string }>()
    if (userIds.length > 0) {
      const users = await Promise.all(userIds.map(id => db.users.findById(id)))
      users.forEach((user, idx) => {
        if (user?.email) {
          usersMap.set(userIds[idx], { email: user.email })
        }
      })
    }

    // Pre-fetch all org chart employees for this workspace (single query instead of per-member)
    const allOrgChartEmployees = await db.maEmployees.findByWorkspace(workspaceId)
    const employeesByEmail = new Map(
      allOrgChartEmployees
        .filter(e => e.email)
        .map(e => [e.email!.toLowerCase(), e])
    )
    const employeesByName = new Map(
      allOrgChartEmployees.map(e => [e.fullName.toLowerCase(), e])
    )

    // Get all rocks for this organization, filtering by current quarter
    const allRocks = await db.rocks.findByOrganizationId(orgId)
    const quarterRocks = allRocks.filter(rock =>
      rock.quarter === currentQuarter || !rock.quarter
    )

    // Group rocks by userId (skip draft member rocks without userId)
    const rocksByUserId = new Map<string, Rock[]>()
    for (const rock of quarterRocks) {
      if (!rock.userId) continue // Skip rocks for draft members who haven't accepted invitation
      const existing = rocksByUserId.get(rock.userId) || []
      existing.push(rock)
      rocksByUserId.set(rock.userId, existing)
    }

    // Batch fetch all milestones for all rocks (fix N+1 query)
    const milestonesByRockId = new Map<string, RockMilestone[]>()
    if (quarterRocks.length > 0) {
      try {
        // Fetch all milestones in parallel batches
        const rockIds = quarterRocks.map(r => r.id)
        const allMilestones = await Promise.all(
          rockIds.map(rockId => db.rockMilestones.findByRockId(rockId).catch(() => []))
        )
        rockIds.forEach((rockId, idx) => {
          milestonesByRockId.set(rockId, allMilestones[idx].map(m => ({
            id: m.id,
            text: m.text,
            completed: m.completed,
            completedAt: m.completedAt || undefined,
          })))
        })
      } catch {
        // No milestones table - initialize empty maps
        quarterRocks.forEach(rock => milestonesByRockId.set(rock.id, []))
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
    // Note: Uses pre-fetched data to avoid N+1 queries
    for (const member of teamMembers) {
      if (!member.userId || member.status !== "active") continue

      // Use cached user data instead of individual DB queries
      let memberEmail = member.email
      const memberName = member.name

      // If member email is missing, use pre-fetched user data
      if (!memberEmail && member.userId) {
        const cachedUser = usersMap.get(member.userId)
        if (cachedUser?.email) {
          memberEmail = cachedUser.email
        }
      }

      // Get their rocks
      const userRocks = rocksByUserId.get(member.userId) || []

      if (userRocks.length === 0) {
        results.noRocks.push({ name: memberName, email: memberEmail || "unknown" })
        continue
      }

      if (!memberEmail) {
        results.notFound.push({ name: memberName, email: "no email found" })
        continue
      }

      // Find matching org chart employee using pre-fetched maps (no DB query)
      let orgChartEmployee = employeesByEmail.get(memberEmail.toLowerCase())

      // If not found by exact email, try matching by name as fallback
      if (!orgChartEmployee) {
        orgChartEmployee = employeesByName.get(memberName.toLowerCase())
        // Also try first name match
        if (!orgChartEmployee) {
          const firstName = memberName.split(' ')[0]?.toLowerCase()
          if (firstName) {
            orgChartEmployee = allOrgChartEmployees.find(emp =>
              emp.firstName.toLowerCase() === firstName
            )
          }
        }
      }

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
    logError(logger, "Rocks sync error", error)
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

    // Get workspaceId from query params
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    const orgId = auth.organization.id
    const currentQuarter = getCurrentQuarter()

    // Get team members
    const teamMembers = await db.members.findByOrganizationId(orgId)
    const activeMembers = teamMembers.filter(m => m.status === "active" && m.userId)

    // Pre-fetch all users for email lookup (batch instead of N queries)
    const userIdsNeedingEmail = activeMembers
      .filter(m => !m.email && m.userId)
      .map(m => m.userId!)
    const usersMap = new Map<string, string>()
    if (userIdsNeedingEmail.length > 0) {
      const users = await Promise.all(userIdsNeedingEmail.map(id => db.users.findById(id)))
      users.forEach((user, idx) => {
        if (user?.email) {
          usersMap.set(userIdsNeedingEmail[idx], user.email)
        }
      })
    }

    // Get org chart employees for this workspace (single query)
    const allOrgChartEmployees = await db.maEmployees.findByWorkspace(workspaceId)
    const employeesByEmail = new Map(
      allOrgChartEmployees.filter(e => e.email).map(e => [e.email!.toLowerCase(), e])
    )
    const employeesByName = new Map(
      allOrgChartEmployees.map(e => [e.fullName.toLowerCase(), e])
    )

    // Pre-fetch all rocks for the organization (single query instead of per-member)
    const allRocks = await db.rocks.findByOrganizationId(orgId)
    const rocksByUserId = new Map<string, typeof allRocks>()
    for (const rock of allRocks) {
      if (!rock.userId) continue // Skip rocks for draft members who haven't accepted invitation
      const existing = rocksByUserId.get(rock.userId) || []
      existing.push(rock)
      rocksByUserId.set(rock.userId, existing)
    }

    // Check which members are mapped (no more DB queries in loop)
    const mappingStatus = activeMembers.map((member) => {
      let email: string | undefined = member.email
      // Fallback to user email if member email is missing (use pre-fetched data)
      if (!email && member.userId) {
        email = usersMap.get(member.userId)
      }

      // Try to find by email first (using pre-fetched maps)
      let orgChartEmployee = email ? employeesByEmail.get(email.toLowerCase()) : undefined

      // Fallback to name match
      if (!orgChartEmployee) {
        orgChartEmployee = employeesByName.get(member.name.toLowerCase())
        if (!orgChartEmployee) {
          const firstName = member.name.split(' ')[0]?.toLowerCase()
          if (firstName) {
            orgChartEmployee = allOrgChartEmployees.find(emp =>
              emp.firstName.toLowerCase() === firstName
            )
          }
        }
      }

      // Use pre-fetched rocks data
      const rocks = member.userId ? (rocksByUserId.get(member.userId) || []) : []
      const quarterRocks = rocks.filter(r => r.quarter === currentQuarter || !r.quarter)

      return {
        name: member.name,
        email: email || "unknown",
        isMapped: !!orgChartEmployee,
        orgChartName: orgChartEmployee?.fullName || null,
        workspaceRockCount: quarterRocks.length,
        orgChartHasRocks: !!orgChartEmployee?.rocks,
      }
    })

    return NextResponse.json({
      success: true,
      quarter: currentQuarter,
      totalWorkspaceMembers: activeMembers.length,
      totalOrgChartEmployees: allOrgChartEmployees.length,
      mappingStatus,
    })
  } catch (error) {
    logError(logger, "Rocks sync status error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to get status" },
      { status: 500 }
    )
  }
}
