import { NextResponse } from "next/server"
import { asanaClient } from "@/lib/integrations/asana"
import { getServerSession } from "@/lib/auth"

/**
 * GET /api/asana/status
 * Check Asana connection status and get current user info
 */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if Asana is configured
    if (!asanaClient.isConfigured()) {
      return NextResponse.json({
        connected: false,
        configured: false,
        message: "Asana access token not configured",
      })
    }

    // Try to get current user to verify connection
    try {
      const me = await asanaClient.getMe()
      const workspaces = await asanaClient.getWorkspaces()

      return NextResponse.json({
        connected: true,
        configured: true,
        user: {
          gid: me.gid,
          name: me.name,
          email: me.email,
        },
        workspaces: workspaces.map((w) => ({
          gid: w.gid,
          name: w.name,
        })),
      })
    } catch (error) {
      return NextResponse.json({
        connected: false,
        configured: true,
        message: "Failed to connect to Asana - check access token",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  } catch (error) {
    console.error("Asana status error:", error)
    return NextResponse.json(
      { error: "Failed to check Asana status" },
      { status: 500 }
    )
  }
}
