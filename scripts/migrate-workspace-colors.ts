/**
 * Migration Script: Extract Colors from Existing Workspace Logos
 *
 * This script processes all workspaces that have logos but no brand colors set,
 * and automatically extracts colors from their logos to populate the branding.
 *
 * Usage:
 *   ts-node scripts/migrate-workspace-colors.ts
 *
 * Options:
 *   --dry-run    Preview changes without applying them
 *   --workspace  Process specific workspace ID only
 *   --force      Re-process even if colors already exist
 */

import { PrismaClient } from '@prisma/client'
import { extractColorsFromImage, analyzeColorQuality } from '../lib/utils/color-extractor'

const prisma = new PrismaClient()

interface MigrationOptions {
  dryRun: boolean
  workspaceId?: string
  force: boolean
}

interface MigrationResult {
  workspaceId: string
  workspaceName: string
  status: 'success' | 'skipped' | 'error'
  reason?: string
  colors?: {
    primary: string
    secondary: string
    accent: string
  }
  quality?: string
}

async function migrateWorkspaceColors(options: MigrationOptions): Promise<MigrationResult[]> {
  const results: MigrationResult[] = []

  try {
    console.log('🎨 Starting workspace color migration...\n')

    // Build query filters
    const whereClause: any = {}

    if (options.workspaceId) {
      whereClause.id = options.workspaceId
    }

    if (!options.force) {
      // Only process workspaces without colors
      whereClause.AND = [
        { logoUrl: { not: null } },
        {
          OR: [
            { primaryColor: null },
            { secondaryColor: null },
            { accentColor: null },
          ],
        },
      ]
    } else {
      // Force mode: process all workspaces with logos
      whereClause.logoUrl = { not: null }
    }

    // Fetch workspaces to process
    const workspaces = await prisma.workspace.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
      },
    })

    console.log(`Found ${workspaces.length} workspace(s) to process\n`)

    if (workspaces.length === 0) {
      console.log('✅ No workspaces need color extraction')
      return results
    }

    // Process each workspace
    for (const workspace of workspaces) {
      console.log(`Processing: ${workspace.name} (${workspace.id})`)

      try {
        // Skip if colors already exist and not forcing
        if (!options.force && workspace.primaryColor && workspace.secondaryColor && workspace.accentColor) {
          console.log('  ⏭️  Skipped - colors already exist\n')
          results.push({
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            status: 'skipped',
            reason: 'Colors already exist',
          })
          continue
        }

        if (!workspace.logoUrl) {
          console.log('  ⏭️  Skipped - no logo URL\n')
          results.push({
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            status: 'skipped',
            reason: 'No logo URL',
          })
          continue
        }

        // Extract colors from logo
        console.log(`  🎨 Extracting colors from: ${workspace.logoUrl}`)
        const extractedColors = await extractColorsFromImage(workspace.logoUrl)

        // Analyze quality
        const quality = analyzeColorQuality(extractedColors)
        console.log(`  📊 Color Quality: ${quality.overall}`)

        if (quality.issues.length > 0) {
          console.log(`  ⚠️  Issues:`)
          quality.issues.forEach((issue) => console.log(`     - ${issue}`))
        }

        console.log(`  ✨ Colors extracted:`)
        console.log(`     Primary:   ${extractedColors.primary}`)
        console.log(`     Secondary: ${extractedColors.secondary}`)
        console.log(`     Accent:    ${extractedColors.accent}`)

        if (extractedColors.personality) {
          console.log(`  🧬 Personality:`)
          console.log(`     Vibrancy: ${extractedColors.personality.vibrancy}`)
          console.log(`     Temperature: ${extractedColors.personality.temperature}`)
          console.log(`     Formality: ${extractedColors.personality.formality}`)
        }

        // Apply colors (unless dry run)
        if (!options.dryRun) {
          await prisma.workspace.update({
            where: { id: workspace.id },
            data: {
              primaryColor: extractedColors.primary,
              secondaryColor: extractedColors.secondary,
              accentColor: extractedColors.accent,
              updatedAt: new Date(),
            },
          })
          console.log('  ✅ Colors saved to database')
        } else {
          console.log('  🔍 DRY RUN - No changes made')
        }

        console.log('')

        results.push({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          status: 'success',
          colors: {
            primary: extractedColors.primary,
            secondary: extractedColors.secondary,
            accent: extractedColors.accent,
          },
          quality: quality.overall,
        })
      } catch (error) {
        console.error(`  ❌ Error processing workspace:`, error)
        console.log('')

        results.push({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('MIGRATION SUMMARY')
    console.log('='.repeat(60) + '\n')

    const successful = results.filter((r) => r.status === 'success').length
    const skipped = results.filter((r) => r.status === 'skipped').length
    const errors = results.filter((r) => r.status === 'error').length

    console.log(`Total Processed:  ${results.length}`)
    console.log(`✅ Successful:    ${successful}`)
    console.log(`⏭️  Skipped:       ${skipped}`)
    console.log(`❌ Errors:        ${errors}`)

    if (options.dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes were saved to database')
    }

    console.log('\n' + '='.repeat(60) + '\n')

    return results
  } catch (error) {
    console.error('Fatal error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Parse command line arguments
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2)

  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
  }

  const workspaceIndex = args.indexOf('--workspace')
  if (workspaceIndex !== -1 && args[workspaceIndex + 1]) {
    options.workspaceId = args[workspaceIndex + 1]
  }

  return options
}

// Main execution
if (require.main === module) {
  const options = parseArgs()

  console.log('Workspace Color Migration Script')
  console.log('================================\n')

  if (options.dryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be saved\n')
  }

  if (options.force) {
    console.log('⚠️  FORCE mode enabled - will re-process existing colors\n')
  }

  if (options.workspaceId) {
    console.log(`📌 Processing specific workspace: ${options.workspaceId}\n`)
  }

  migrateWorkspaceColors(options)
    .then((results) => {
      const hasErrors = results.some((r) => r.status === 'error')
      process.exit(hasErrors ? 1 : 0)
    })
    .catch((error) => {
      console.error('Migration failed:', error)
      process.exit(1)
    })
}

export { migrateWorkspaceColors, type MigrationOptions, type MigrationResult }
