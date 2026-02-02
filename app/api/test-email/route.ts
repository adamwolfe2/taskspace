import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// POST /api/test-email - Test email configuration
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
        { success: false, error: "Only admins can test email" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { testEmail } = body

    // Get environment variables
    const RESEND_API_KEY = process.env.RESEND_API_KEY || ""
    const EMAIL_FROM = process.env.EMAIL_FROM || "Taskspace <onboarding@resend.dev>"
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Debug info
    const debugInfo = {
      resendKeySet: !!RESEND_API_KEY,
      resendKeyPrefix: RESEND_API_KEY ? RESEND_API_KEY.substring(0, 10) + "..." : "not set",
      resendKeyValid: RESEND_API_KEY.startsWith("re_"),
      emailFrom: EMAIL_FROM,
      appUrl: APP_URL,
      appUrlConfigured: APP_URL !== "http://localhost:3000",
      testEmailTo: testEmail || auth.user.email,
    }

    if (!RESEND_API_KEY || !RESEND_API_KEY.startsWith("re_")) {
      return NextResponse.json({
        success: false,
        error: "RESEND_API_KEY not configured or invalid",
        debug: debugInfo,
      })
    }

    // Try sending a test email
    const toEmail = testEmail || auth.user.email

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [toEmail],
        subject: "Taskspace - Test Email",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1f2937;">Email Configuration Test</h1>
            <p>If you're reading this, your email configuration is working correctly!</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>From:</strong> ${EMAIL_FROM}</p>
              <p style="margin: 10px 0 0 0;"><strong>To:</strong> ${toEmail}</p>
              <p style="margin: 10px 0 0 0;"><strong>Time:</strong> ${new Date().toISOString()}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This is a test email from Taskspace.</p>
          </div>
        `,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: "Resend API error",
        resendError: data,
        debug: debugInfo,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${toEmail}`,
      resendResponse: data,
      debug: debugInfo,
    })
  } catch (error: any) {
    logError(logger, "Test email error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error.message || "Failed to send test email" },
      { status: 500 }
    )
  }
}

// GET /api/test-email - Get email configuration status (debug)
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
        { success: false, error: "Only admins can view email config" },
        { status: 403 }
      )
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY || ""
    const EMAIL_FROM = process.env.EMAIL_FROM || "Taskspace <onboarding@resend.dev>"
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    return NextResponse.json({
      success: true,
      config: {
        resendKeySet: !!RESEND_API_KEY,
        resendKeyPrefix: RESEND_API_KEY ? RESEND_API_KEY.substring(0, 10) + "..." : "not set",
        resendKeyValid: RESEND_API_KEY.startsWith("re_"),
        emailFrom: EMAIL_FROM,
        emailFromDefault: EMAIL_FROM === "Taskspace <onboarding@resend.dev>",
        appUrl: APP_URL,
        appUrlConfigured: APP_URL !== "http://localhost:3000",
      },
    })
  } catch (error: any) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
