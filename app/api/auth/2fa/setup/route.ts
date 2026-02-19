import { NextRequest, NextResponse } from "next/server"
import { generateSecret, generateURI } from "otplib"
import QRCode from "qrcode"
import { getUserAuthContext } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

/**
 * POST /api/auth/2fa/setup
 * Generate a TOTP secret and QR code for the user to scan.
 * Requires authentication. Does NOT enable 2FA yet — that happens in verify-setup.
 */
export async function POST(request: NextRequest) {
  try {
    const csrfHeader = request.headers.get("x-requested-with")
    if (csrfHeader !== "XMLHttpRequest") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden" },
        { status: 403 }
      )
    }

    const auth = await getUserAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (auth.user.totpEnabled) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Two-factor authentication is already enabled" },
        { status: 400 }
      )
    }

    // Generate a new TOTP secret
    const secret = generateSecret()
    const otpauth = generateURI({
      issuer: "TaskSpace",
      label: auth.user.email,
      secret,
      digits: 6,
      period: 30,
    })
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth)

    // Store the secret temporarily (not enabled yet)
    await db.users.update(auth.user.id, { totpSecret: secret })

    logger.info({ userId: auth.user.id }, "2FA setup initiated")

    return NextResponse.json<ApiResponse<{ qrCode: string; secret: string }>>({
      success: true,
      data: { qrCode: qrCodeDataUrl, secret },
    })
  } catch (error) {
    logError(logger, "2FA setup error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to set up two-factor authentication" },
      { status: 500 }
    )
  }
}
