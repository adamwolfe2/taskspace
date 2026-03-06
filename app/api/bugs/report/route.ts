import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { bugReportSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

/**
 * POST /api/bugs/report
 * Create a GitHub issue for bug reports
 */
export const POST = withAuth(async (request, auth) => {
  try {
    const { description, page, url, userAgent, timestamp } = await validateBody(request, bugReportSchema)

    // Build GitHub issue body
    const issueBody = `
## Bug Report

**Description:**
${description}

---

**Environment:**
- **Page:** ${page}
- **URL:** ${url}
- **User:** ${auth.user.email} (${auth.user.name})
- **Organization:** ${auth.organization.name}
- **Timestamp:** ${timestamp}
- **User Agent:** ${userAgent}

---

**Submitted via in-app bug reporter**
    `.trim()

    const issueTitle = `[User Bug] ${description.substring(0, 60)}${description.length > 60 ? '...' : ''}`

    // Create GitHub issue
    const githubToken = process.env.GITHUB_TOKEN
    const githubRepo = process.env.GITHUB_REPO || "adamwolfe2/taskspace"

    if (!githubToken) {
      // Fallback: just log the bug if GitHub token not configured
      logger.warn({ title: issueTitle }, "GitHub token not configured, bug report logged")

      return NextResponse.json<ApiResponse<{ issueNumber: number }>>({
        success: true,
        data: { issueNumber: 0 },
        message: "Bug report logged (GitHub not configured)",
      })
    }

    const githubResponse = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${githubToken}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: ["bug", "user-reported"],
      }),
    })

    if (!githubResponse.ok) {
      const errorData = await githubResponse.json()
      logger.error({ error: errorData }, "GitHub API error creating issue")
      throw new Error("Failed to create GitHub issue")
    }

    const issue = await githubResponse.json()

    return NextResponse.json<ApiResponse<{ issueNumber: number; issueUrl: string }>>({
      success: true,
      data: {
        issueNumber: issue.number,
        issueUrl: issue.html_url,
      },
      message: "Bug report submitted successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Bug report error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to submit bug report" },
      { status: 500 }
    )
  }
})
