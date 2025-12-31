/**
 * Database Seed Endpoint
 *
 * Seeds the current organization with initial team members and rocks.
 * Only works if the organization has no rocks currently.
 */

import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { generateId } from "@/lib/auth/password"
import { initialTeamMembers, initialRocks } from "@/lib/initial-data"

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdmin(auth)) {
      return NextResponse.json(
        { success: false, error: "Only admins can seed data" },
        { status: 403 }
      )
    }

    const orgId = auth.organization.id

    // Check if there's already data
    const { rows: existingRocks } = await sql`
      SELECT COUNT(*) as count FROM rocks WHERE organization_id = ${orgId}
    `
    const rockCount = parseInt(existingRocks[0]?.count || "0")

    if (rockCount > 0) {
      return NextResponse.json(
        { success: false, error: `Organization already has ${rockCount} rocks. Seed only works on empty organizations.` },
        { status: 400 }
      )
    }

    const results = {
      membersCreated: 0,
      rocksCreated: 0,
      errors: [] as string[],
    }

    // Create a mapping from initial user IDs to actual member IDs
    const userIdMapping: Record<string, string> = {}

    // First, get existing members to map by email
    const { rows: existingMembers } = await sql`
      SELECT om.id, om.email, om.user_id, u.email as user_email
      FROM organization_members om
      LEFT JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = ${orgId}
    `

    // Map the current user to adam-wolfe
    userIdMapping["adam-wolfe"] = auth.user.id

    // For other initial team members, create draft members if they don't exist
    for (const member of initialTeamMembers) {
      if (member.id === "adam-wolfe") {
        // Already mapped to current user
        continue
      }

      // Check if this email already exists in the org
      const existing = existingMembers.find(
        m => m.email?.toLowerCase() === member.email.toLowerCase() ||
             m.user_email?.toLowerCase() === member.email.toLowerCase()
      )

      if (existing) {
        userIdMapping[member.id] = existing.user_id || existing.id
        continue
      }

      // Create a draft member
      const memberId = generateId()
      const now = new Date().toISOString()

      try {
        await sql`
          INSERT INTO organization_members (
            id, organization_id, user_id, email, name, role, department,
            joined_at, invited_by, status, weekly_measurable
          )
          VALUES (
            ${memberId}, ${orgId}, NULL, ${member.email.toLowerCase()}, ${member.name},
            ${member.role}, ${member.department}, ${now}, ${auth.user.id},
            'pending', ${member.weeklyMeasurable || null}
          )
        `
        userIdMapping[member.id] = memberId
        results.membersCreated++
      } catch (e) {
        results.errors.push(`Failed to create member ${member.name}: ${e}`)
      }
    }

    // Now create rocks for the mapped users
    const now = new Date().toISOString()

    for (const rock of initialRocks) {
      const userId = userIdMapping[rock.userId]
      if (!userId) {
        results.errors.push(`No user mapping for rock: ${rock.title}`)
        continue
      }

      const rockId = generateId()

      try {
        await sql`
          INSERT INTO rocks (
            id, organization_id, user_id, title, description, bucket, outcome,
            done_when, progress, due_date, status, quarter, created_at, updated_at
          )
          VALUES (
            ${rockId}, ${orgId}, ${userId}, ${rock.title}, ${rock.description},
            ${rock.bucket || null}, ${rock.outcome || null},
            ${JSON.stringify(rock.doneWhen || [])}, ${rock.progress || 0},
            ${rock.dueDate}, ${rock.status || "on-track"}, ${"Q1 2025"},
            ${now}, ${now}
          )
        `
        results.rocksCreated++
      } catch (e) {
        results.errors.push(`Failed to create rock ${rock.title}: ${e}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${results.membersCreated} members and ${results.rocksCreated} rocks`,
      data: results,
    })
  } catch (error) {
    console.error("Seed error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Seed failed" },
      { status: 500 }
    )
  }
}
