/**
 * POST /api/migrations/import/[jobId]/process
 * Process a chunk of import data
 */

import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { withAuth } from '@/lib/api/middleware'
import type { RouteContext } from '@/lib/api/middleware'
import { isAdmin } from '@/lib/auth/middleware'
import type { ApiResponse } from '@/lib/types'
import type {
  ProcessChunkRequest,
  ProcessChunkResponse,
  NormalizedData,
} from '@/lib/migrations/types'
import { extract, normalize, map, load, calculateProgress } from '@/lib/migrations/pipeline'
import { logger } from '@/lib/logger'

export const POST = withAuth(
  async (request: NextRequest, auth, context?: RouteContext) => {
    try {
      // SECURITY: Only admins can process imports
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
      const body: ProcessChunkRequest = await request.json()
      const { offset, limit } = body

      // Validate chunk parameters
      if (offset < 0 || limit <= 0 || limit > 100) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Invalid chunk parameters. Limit must be 1-100.' },
          { status: 400 }
        )
      }

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

      // Check job is in correct state
      if (job.status !== 'mapping' && job.status !== 'importing') {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: `Cannot process import in status: ${job.status}`,
          },
          { status: 400 }
        )
      }

      // Update status to importing if first chunk
      if (offset === 0) {
        await db.migrations.importJobs.update(jobId, {
          status: 'importing',
        })
      }

      // Create logger function for pipeline
      const logFn = async (
        level: string,
        stage: string,
        message: string,
        metadata?: any
      ) => {
        await db.migrations.importLogs.create({
          importJobId: jobId,
          level: level as any,
          stage: stage as any,
          message,
          metadata,
        })
      }

      // Extract → Normalize → Map data
      const raw = await extract(job.fileUrl, job.provider)
      const normalized = await normalize(raw, job.provider)
      const mapped = map(normalized, job.config)

      // Load chunk
      const result = await load(
        mapped,
        jobId,
        auth.organization.id,
        job.provider,
        offset,
        limit,
        db,
        logFn
      )

      // Calculate progress
      const totalItems = mapped.tasks.length
      const processedItems = offset + result.processed
      const progress = calculateProgress(processedItems, totalItems)

      // Update job progress
      await db.migrations.importJobs.update(jobId, {
        progress,
        stats: {
          tasksCreated: (job.stats.tasksCreated || 0) + result.succeeded,
          tasksFailed: (job.stats.tasksFailed || 0) + result.failed,
        },
      })

      // Calculate estimated time remaining (assuming 100ms per task)
      const remainingItems = totalItems - processedItems
      const estimatedTimeRemaining = Math.ceil((remainingItems * 100) / 1000)

      return NextResponse.json<ApiResponse<ProcessChunkResponse>>({
        success: true,
        data: {
          processed: result.processed,
          succeeded: result.succeeded,
          failed: result.failed,
          hasMore: result.hasMore,
          nextOffset: result.nextOffset,
          errors: result.errors,
          progress,
          estimatedTimeRemaining: result.hasMore ? estimatedTimeRemaining : undefined,
        },
      })
    } catch (error) {
      logger.error({ error }, 'Import chunk processing failed')

      // Log error to import logs
      const jobId = context?.params ? (await context.params).jobId : 'unknown'
      try {
        await db.migrations.importLogs.create({
          importJobId: jobId,
          level: 'error',
          stage: 'task_import',
          message: 'Chunk processing failed: Unknown error',
        })
      } catch (logError) {
        logger.error({ logError }, 'Failed to log import error')
      }

      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Failed to process chunk',
        },
        { status: 500 }
      )
    }
  }
)
