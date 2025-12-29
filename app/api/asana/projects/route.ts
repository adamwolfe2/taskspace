import { NextRequest, NextResponse } from "next/server"
import { asanaClient } from "@/lib/integrations/asana"
import { getServerSession } from "@/lib/auth"

/**
 * GET /api/asana/projects?workspace=<workspaceGid>
 * Get all projects in a workspace
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

    const projects = await asanaClient.getProjects(workspaceGid)

    return NextResponse.json({
      projects: projects.map((p) => ({
        gid: p.gid,
        name: p.name,
      })),
    })
  } catch (error) {
    console.error("Asana projects error:", error)
    return NextResponse.json(
      { error: "Failed to fetch Asana projects" },
      { status: 500 }
    )
  }
}
