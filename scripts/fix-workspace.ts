/**
 * Manual script to create default workspace and migrate data
 * Run this if auto-creation isn't working
 */

import { db } from "../lib/db"
import { sql } from "../lib/db/sql"
import { generateId } from "../lib/auth/password"

async function fixWorkspace() {
  try {
    // Get all organizations
    const { rows: orgs } = await sql`
      SELECT id, name FROM organizations
    `

    console.log(`Found ${orgs.length} organizations`)

    for (const org of orgs) {
      console.log(`\nChecking organization: ${org.name} (${org.id})`)

      // Check if org has any workspaces
      const existingWorkspaces = await db.workspaces.findByOrg(org.id)

      if (existingWorkspaces.length > 0) {
        console.log(`✓ Already has ${existingWorkspaces.length} workspace(s)`)
        continue
      }

      console.log(`Creating default workspace...`)

      // Create default workspace
      const now = new Date().toISOString()
      const defaultWorkspaceId = generateId()
      const defaultWorkspace = {
        id: defaultWorkspaceId,
        organizationId: org.id,
        name: "Default",
        slug: "default",
        type: "team" as const,
        description: "Default workspace for all organization members",
        isDefault: true,
        createdAt: now,
        updatedAt: now,
        settings: {},
      }

      await db.workspaces.create(defaultWorkspace)
      console.log(`✓ Created workspace: ${defaultWorkspaceId}`)

      // Add all org members to workspace
      const allMembers = await db.members.findByOrganizationId(org.id)
      console.log(`Adding ${allMembers.length} members...`)

      for (const member of allMembers) {
        const memberRole = member.role === "owner" || member.role === "admin" ? "admin" : "member"
        await db.workspaceMembers.create({
          id: generateId(),
          workspaceId: defaultWorkspaceId,
          userId: member.userId,
          role: memberRole,
          joinedAt: now,
        })
      }
      console.log(`✓ Added ${allMembers.length} members`)

      // Migrate existing data
      let migratedRecords = 0

      const tasksResult = await sql`
        UPDATE assigned_tasks SET workspace_id = ${defaultWorkspaceId}
        WHERE organization_id = ${org.id} AND workspace_id IS NULL
        RETURNING id
      `
      migratedRecords += tasksResult.rows.length

      const rocksResult = await sql`
        UPDATE rocks SET workspace_id = ${defaultWorkspaceId}
        WHERE organization_id = ${org.id} AND workspace_id IS NULL
        RETURNING id
      `
      migratedRecords += rocksResult.rows.length

      const eodResult = await sql`
        UPDATE eod_reports SET workspace_id = ${defaultWorkspaceId}
        WHERE organization_id = ${org.id} AND workspace_id IS NULL
        RETURNING id
      `
      migratedRecords += eodResult.rows.length

      const meetingsResult = await sql`
        UPDATE meetings SET workspace_id = ${defaultWorkspaceId}
        WHERE organization_id = ${org.id} AND workspace_id IS NULL
        RETURNING id
      `
      migratedRecords += meetingsResult.rows.length

      const focusBlocksResult = await sql`
        UPDATE focus_blocks SET workspace_id = ${defaultWorkspaceId}
        WHERE user_id IN (
          SELECT user_id FROM organization_members WHERE organization_id = ${org.id}
        ) AND workspace_id IS NULL
        RETURNING id
      `
      migratedRecords += focusBlocksResult.rows.length

      const energyResult = await sql`
        UPDATE daily_energy SET workspace_id = ${defaultWorkspaceId}
        WHERE user_id IN (
          SELECT user_id FROM organization_members WHERE organization_id = ${org.id}
        ) AND workspace_id IS NULL
        RETURNING id
      `
      migratedRecords += energyResult.rows.length

      const streaksResult = await sql`
        UPDATE user_streaks SET workspace_id = ${defaultWorkspaceId}
        WHERE user_id IN (
          SELECT user_id FROM organization_members WHERE organization_id = ${org.id}
        ) AND workspace_id IS NULL
        RETURNING id
      `
      migratedRecords += streaksResult.rows.length

      const focusScoreResult = await sql`
        UPDATE focus_score_history SET workspace_id = ${defaultWorkspaceId}
        WHERE user_id IN (
          SELECT user_id FROM organization_members WHERE organization_id = ${org.id}
        ) AND workspace_id IS NULL
        RETURNING id
      `
      migratedRecords += focusScoreResult.rows.length

      console.log(`✓ Migrated ${migratedRecords} existing records`)
      console.log(`\n✅ Organization ${org.name} is now fully set up!`)
    }

    console.log('\n🎉 All done!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

fixWorkspace()
