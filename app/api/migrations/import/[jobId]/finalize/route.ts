/**
 * POST /api/migrations/import/[jobId]/finalize
 * Mark import job as completed
 */

import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { withAuth } from '@/lib/api/middleware'
import type { RouteContext } from '@/lib/api/middleware'
import { isAdmin } from '@/lib/auth/middleware'
import type { ApiResponse } from '@/lib/types'
import type { FinalizeImportResponse } from '@/lib/migrations/types'
import { logger } from '@/lib/logger'

export const POST = withAuth(
  async (request: NextRequest, auth, context?: RouteContext) => {
    try {
      // SECURITY: Only admins can finalize imports
      if (!isAdmin(auth)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Unauthorized: Admin access required' },
          { status: 403 }
        )
      }

      if (!context?.params) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Missing route parameters' },
          { status: 400 }
        )
      }

      const { jobId } = await context.params

      // Find import job
      const job = await db.migrations.importJobs.findById(jobId)

      if (!job) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Import job not found' },
          { status: 404 }
        )
      }

      // SECURITY: Verify job belongs to user's organization
      if (job.organizationId !== auth.organization.id) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Import job not found' },
          { status: 404 }
        )
      }

      // Check job is in importing state
      if (job.status !== 'importing') {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: `Cannot finalize import in status: ${job.status}`,
          },
          { status: 400 }
        )
      }

      // Mark as completed
      const now = new Date().toISOString()
      const completedJob = await db.migrations.importJobs.update(jobId, {
        status: 'completed',
        progress: 100,
        completedAt: now,
      })

      if (!completedJob) {
        throw new Error('Failed to update import job')
      }

      // Log completion
      await db.migrations.importLogs.create({
        importJobId: jobId,
        level: 'info',
        stage: 'finalization',
        message: 'Import completed successfully',
        metadata: {
          stats: completedJob.stats,
          duration: new Date(now).getTime() - new Date(job.startedAt).getTime(),
        },
      })

      logger.info({
        jobId,
        organizationId: auth.organization.id,
        stats: completedJob.stats,
      }, 'Import job completed')

      return NextResponse.json<ApiResponse<FinalizeImportResponse>>({
        success: true,
        data: {
          success: true,
          stats: completedJob.stats,
          errors: completedJob.errors,
          warnings: completedJob.warnings,
        },
      })
    } catch (error) {
      logger.error({ error }, 'Import finalization failed')

      // Try to mark job as failed
      const jobId = context?.params ? (await context.params).jobId : 'unknown'
      try {
        await db.migrations.importJobs.update(jobId, {
          status: 'failed',
          errors: [
            {
              code: 'FINALIZATION_ERROR',
              message: 'Unknown error',
            },
          ],
        })
      } catch (updateError) {
        logger.error({ updateError }, 'Failed to update job status')
      }

      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Failed to finalize import',
        },
        { status: 500 }
      )
    }
  }
)
