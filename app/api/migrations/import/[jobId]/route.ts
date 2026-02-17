/**
 * GET /api/migrations/import/[jobId]
 * Get import job status and details
 */

import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { withAuth } from '@/lib/api/middleware'
import { isAdmin } from '@/lib/auth/middleware'
import type { ApiResponse } from '@/lib/types'
import type { GetImportJobResponse } from '@/lib/migrations/types'
import { logger } from '@/lib/logger'

export const GET = withAuth(
  async (request: NextRequest, auth, { params }: { params: { jobId: string } }) => {
    try {
      // SECURITY: Only admins can view import jobs
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

      // Get recent logs (last 20)
      const recentLogs = await db.migrations.importLogs.findByJob(jobId, { limit: 20 })

      // Get conflicts if any
      const conflicts = await db.migrations.importConflicts.findByJob(jobId)

      return NextResponse.json<ApiResponse<GetImportJobResponse>>({
        success: true,
        data: {
          job,
          conflicts: conflicts.length > 0 ? conflicts : undefined,
          recentLogs: recentLogs.length > 0 ? recentLogs : undefined,
        },
      })
    } catch (error) {
      logger.error('Failed to get import job', { error, jobId: params.jobId })
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get import job',
        },
        { status: 500 }
      )
    }
  }
)
