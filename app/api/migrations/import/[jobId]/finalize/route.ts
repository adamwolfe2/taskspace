/**
 * POST /api/migrations/import/[jobId]/finalize
 * Mark import job as completed
 */

import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { withAuth } from '@/lib/api/middleware'
import { isAdmin } from '@/lib/auth/middleware'
import type { ApiResponse } from '@/lib/types'
import type { FinalizeImportResponse } from '@/lib/migrations/types'
import { logger } from '@/lib/logger'

export const POST = withAuth(
  async (request: NextRequest, auth, { params }: { params: { jobId: string } }) => {
    try {
      // SECURITY: Only admins can finalize imports
      if (!isAdmin(auth)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Unauthorized: Admin access required' },
          { status: 403 }
        )
      }

      const { jobId } = params

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

      logger.info('Import job completed', {
        jobId,
        organizationId: auth.organization.id,
        stats: completedJob.stats,
      })

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
      logger.error('Import finalization failed', { error, jobId: params.jobId })

      // Try to mark job as failed
      try {
        await db.migrations.importJobs.update(params.jobId, {
          status: 'failed',
          errors: [
            {
              code: 'FINALIZATION_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          ],
        })
      } catch (updateError) {
        logger.error('Failed to update job status', { updateError })
      }

      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to finalize import',
        },
        { status: 500 }
      )
    }
  }
)
