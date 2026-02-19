import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { withAuth } from "@/lib/api/middleware"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse, FileAttachment } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed file types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/x-icon",   // Added for favicon uploads
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]

export const POST = withAuth(async (request, auth) => {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `File type "${file.type}" is not supported` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "File size exceeds 10MB limit" },
        { status: 400 }
      )
    }

    // Generate unique filename with org/user prefix for organization
    const fileId = generateId()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const blobPath = `${auth.organization.id}/${auth.user.id}/${fileId}-${safeFileName}`

    // Upload to Vercel Blob
    const blob = await put(blobPath, file, {
      access: "public",
      addRandomSuffix: false,
    })

    const attachment: FileAttachment = {
      id: fileId,
      name: file.name,
      url: blob.url,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    }

    return NextResponse.json<ApiResponse<FileAttachment>>({
      success: true,
      data: attachment,
    })
  } catch (error) {
    logError(logger, "File upload error", error)

    // Check if Vercel Blob is not configured
    if (error instanceof Error && error.message.includes("BLOB_READ_WRITE_TOKEN")) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "File storage is not configured. Please set up Vercel Blob." },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to upload file" },
      { status: 500 }
    )
  }
})
