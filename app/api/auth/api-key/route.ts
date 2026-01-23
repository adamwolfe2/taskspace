import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// GET /api/auth/api-key - List API keys for the organization
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can manage API keys" },
        { status: 403 }
      )
    }

    const keys = await db.apiKeys.findByOrganizationId(auth.organization.id)

    // Mask the actual key values
    const maskedKeys = keys.map(k => ({
      ...k,
      key: `${k.key.substring(0, 8)}...${k.key.substring(k.key.length - 4)}`,
    }))

    return NextResponse.json<ApiResponse<typeof maskedKeys>>({
      success: true,
      data: maskedKeys,
    })
  } catch (error) {
    logError(logger, "Get API keys error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get API keys" },
      { status: 500 }
    )
  }
}

// POST /api/auth/api-key - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can create API keys" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, scopes } = body

    if (!name) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Name is required" },
        { status: 400 }
      )
    }

    // Generate a secure API key
    const keyValue = `aims_${generateId()}_${generateId()}`

    const now = new Date().toISOString()
    const apiKey = {
      id: generateId(),
      organizationId: auth.organization.id,
      createdBy: auth.user.id,
      name,
      key: keyValue,
      scopes: scopes || ["read", "write"],
      createdAt: now,
      lastUsedAt: null,
    }

    await db.apiKeys.create(apiKey)

    // Return the full key only on creation (it won't be shown again)
    return NextResponse.json<ApiResponse<typeof apiKey>>({
      success: true,
      data: apiKey,
      message: "API key created. Save this key - it won't be shown again.",
    })
  } catch (error) {
    logError(logger, "Create API key error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create API key" },
      { status: 500 }
    )
  }
}

// DELETE /api/auth/api-key - Delete an API key
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can delete API keys" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get("id")

    if (!keyId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Key ID is required" },
        { status: 400 }
      )
    }

    // Verify the key belongs to this organization
    const existingKey = await db.apiKeys.findById(keyId)
    if (!existingKey || existingKey.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "API key not found" },
        { status: 404 }
      )
    }

    await db.apiKeys.delete(keyId)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
      message: "API key deleted",
    })
  } catch (error) {
    logError(logger, "Delete API key error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete API key" },
      { status: 500 }
    )
  }
}
