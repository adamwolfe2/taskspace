import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAdmin } from "@/lib/api/middleware"
import { generateId } from "@/lib/auth/password"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { apiKeyCreateSchema } from "@/lib/validation/schemas"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { audit } from "@/lib/audit"

// GET /api/auth/api-key - List API keys for the organization
export const GET = withAdmin(async (request: NextRequest, auth) => {
  try {
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
})

// POST /api/auth/api-key - Create a new API key
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Validate request body
    const { name, scopes, workspaceId, expiresAt } = await validateBody(request, apiKeyCreateSchema)

    // Generate a secure API key
    const keyValue = `aims_${generateId()}_${generateId()}`

    const now = new Date().toISOString()
    const apiKey = {
      id: generateId(),
      organizationId: auth.organization.id,
      workspaceId: workspaceId || null,
      createdBy: auth.user.id,
      name,
      key: keyValue,
      scopes: scopes || ["read", "write"],
      createdAt: now,
      lastUsedAt: null,
      expiresAt: expiresAt || null,
    }

    await db.apiKeys.create(apiKey)

    audit(auth, request, "api_key.created", {
      resourceType: "api_key",
      resourceId: apiKey.id,
      newValues: { name: apiKey.name, scopes: apiKey.scopes },
    })

    // Return the full key only on creation (it won't be shown again)
    return NextResponse.json<ApiResponse<typeof apiKey>>({
      success: true,
      data: apiKey,
      message: "API key created. Save this key - it won't be shown again.",
    })
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    logError(logger, "Create API key error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create API key" },
      { status: 500 }
    )
  }
})

// DELETE /api/auth/api-key - Delete an API key
export const DELETE = withAdmin(async (request: NextRequest, auth) => {
  try {
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

    audit(auth, request, "api_key.deleted", {
      resourceType: "api_key",
      resourceId: keyId,
      oldValues: { name: existingKey.name },
    })

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
})
