/**
 * POST /api/migrations/import
 * Create new import job and upload file to Vercel Blob
 */

import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import db from '@/lib/db'
import { withAuth } from '@/lib/api/middleware'
import { isAdmin } from '@/lib/auth/middleware'
import type { ApiResponse } from '@/lib/types'
import type { CreateImportJobResponse, ImportProvider } from '@/lib/migrations/types'
import { detectProvider } from '@/lib/migrations/importers'
import { validate } from '@/lib/migrations/pipeline'
import { logger } from '@/lib/logger'

export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    // SECURITY: Only admins can import data
    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const provider = formData.get('provider') as ImportProvider | null
    const workspaceId = formData.get('workspaceId') as string | null

    if (!file) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size (max 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      )
    }

    // Detect provider if not specified
    let detectedProvider = provider
    if (!detectedProvider) {
      const fileBuffer = Buffer.from(await file.arrayBuffer())
      detectedProvider = detectProvider(fileBuffer, file.name)

      if (!detectedProvider) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: 'Could not detect file format. Please specify provider.',
          },
          { status: 400 }
        )
      }
    }

    // Upload file to Vercel Blob
    const blob = await put(`imports/${auth.organization.id}/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    logger.info({
      organizationId: auth.organization.id,
      fileName: file.name,
      fileSize: file.size,
      blobUrl: blob.url,
    }, 'Import file uploaded to Vercel Blob')

    // Create import job
    const importJob = await db.migrations.importJobs.create({
      organizationId: auth.organization.id,
      workspaceId,
      createdBy: auth.user.id,
      provider: detectedProvider,
      fileUrl: blob.url,
      fileName: file.name,
      fileSize: file.size,
    })

    // Start async validation (background)
    validateImportJob(importJob.id, blob.url, detectedProvider).catch((error) => {
      logger.error({
        importJobId: importJob.id,
        error: error.message,
      }, 'Import validation failed')
    })

    return NextResponse.json<ApiResponse<CreateImportJobResponse>>(
      {
        success: true,
        data: {
          jobId: importJob.id,
          status: importJob.status,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error({ error }, 'Import job creation failed')
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to create import job',
      },
      { status: 500 }
    )
  }
})

/**
 * Background validation function
 * Validates file structure and updates job status
 */
async function validateImportJob(
  jobId: string,
  fileUrl: string,
  provider: ImportProvider
): Promise<void> {
  try {
    // Update status to validating
    await db.migrations.importJobs.update(jobId, {
      status: 'validating',
    })

    // Log validation start
    await db.migrations.importLogs.create({
      importJobId: jobId,
      level: 'info',
      stage: 'validation',
      message: 'Starting file validation',
    })

    // Fetch and parse file
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch import file: HTTP ${response.status}`)
    }
    const raw = await response.json()

    // Validate structure
    const validationResult = await validate(raw, provider)

    if (!validationResult.valid) {
      // Validation failed
      await db.migrations.importJobs.update(jobId, {
        status: 'failed',
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      })

      await db.migrations.importLogs.create({
        importJobId: jobId,
        level: 'error',
        stage: 'validation',
        message: `Validation failed: ${validationResult.errors[0]?.message}`,
        metadata: { errors: validationResult.errors },
      })

      return
    }

    // Validation succeeded
    await db.migrations.importJobs.update(jobId, {
      status: 'mapping',
      warnings: validationResult.warnings,
      estimatedDuration: validationResult.metadata?.estimatedItems
        ? Math.ceil((validationResult.metadata.estimatedItems * 100) / 1000)
        : undefined,
    })

    await db.migrations.importLogs.create({
      importJobId: jobId,
      level: 'info',
      stage: 'validation',
      message: `Validation complete. Found ${validationResult.metadata?.estimatedItems || 0} items.`,
      metadata: validationResult.metadata,
    })
  } catch {
    await db.migrations.importJobs.update(jobId, {
      status: 'failed',
      errors: [
        {
          code: 'VALIDATION_ERROR',
          message: 'Unknown validation error',
        },
      ],
    })

    await db.migrations.importLogs.create({
      importJobId: jobId,
      level: 'error',
      stage: 'validation',
      message: 'Validation error: Unknown error',
    })
  }
}
