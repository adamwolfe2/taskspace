import { NextRequest, NextResponse } from "next/server"
import { asanaClient } from "@/lib/integrations/asana"
import { getServerSession } from "@/lib/auth"

/**
 * GET /api/asana/users?workspace=<workspaceGid>
 * Get all users in a workspace for mapping
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceGid = searchParams.get("workspace")

    if (!workspaceGid) {
      return NextResponse.json(
        { error: "Workspace GID is required" },
        { status: 400 }
      )
    }

    if (!asanaClient.isConfigured()) {
      return NextResponse.json(
        { error: "Asana not configured" },
        { status: 400 }
      )
    }

    const users = await asanaClient.getWorkspaceUsers(workspaceGid)

    return NextResponse.json({
      users: users.map((u) => ({
        gid: u.gid,
        name: u.name,
        email: u.email,
      })),
    })
  } catch (error) {
    console.error("Asana users error:", error)
    return NextResponse.json(
      { error: "Failed to fetch Asana users" },
      { status: 500 }
    )
  }
}
