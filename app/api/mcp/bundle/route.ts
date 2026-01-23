/**
 * AIMS EOD Tracker - MCPB Bundle Generator
 *
 * Generates a downloadable .mcpb file for drag-and-drop installation
 * in Claude Desktop. The bundle contains a pre-configured MCP server
 * with the user's API key embedded.
 *
 * Format: ZIP archive containing:
 * - manifest.json (extension metadata)
 * - server/index.js (MCP server code)
 * - icon.png (optional extension icon)
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import JSZip from "jszip"
import { logger, logError } from "@/lib/logger"

// MCP Server code template - this runs locally but connects to our remote API
const getMcpServerCode = (apiUrl: string, apiKey: string) => `#!/usr/bin/env node
/**
 * AIMS EOD Tracker - MCP Server for Claude Desktop
 * Auto-generated with pre-configured API key
 *
 * This server connects to your AIMS organization and provides
 * Claude with tools to manage your team's EOD reports, tasks, and rocks.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_URL = "${apiUrl}";
const API_KEY = "${apiKey}";

// Helper to make authenticated API calls
async function apiCall(endpoint, options = {}) {
  const response = await fetch(\`\${API_URL}\${endpoint}\`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": \`Bearer \${API_KEY}\`,
      ...options.headers,
    },
  });
  if (!response.ok) {
    throw new Error(\`API error: \${response.status} \${response.statusText}\`);
  }
  return response.json();
}

// MCP Server setup
const server = new Server(
  { name: "aims-eod-tracker", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

// Define available tools
const tools = [
  {
    name: "get_team_members",
    description: "Get all team members in your AIMS organization",
    inputSchema: {
      type: "object",
      properties: {
        department: { type: "string", description: "Filter by department" },
      },
    },
  },
  {
    name: "check_eod_status",
    description: "Check who has/hasn't submitted their EOD report today",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date (YYYY-MM-DD), defaults to today" },
      },
    },
  },
  {
    name: "get_rocks",
    description: "View quarterly rocks (goals) and their progress",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["on-track", "at-risk", "blocked", "completed"],
          description: "Filter by status",
        },
      },
    },
  },
  {
    name: "get_pending_tasks",
    description: "Get pending tasks for the team",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_team_overview",
    description: "Get a quick overview of team status, EOD submissions, and key metrics",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_blockers",
    description: "Get current blockers and escalations from team",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_member_analysis",
    description: "Get comprehensive analysis of a team member",
    inputSchema: {
      type: "object",
      properties: {
        memberName: { type: "string", description: "Name or partial name of the team member" },
        days: { type: "number", description: "Number of days of history (default 30)" },
      },
      required: ["memberName"],
    },
  },
  {
    name: "get_eod_report_details",
    description: "Get the complete EOD report for a specific user and date",
    inputSchema: {
      type: "object",
      properties: {
        memberName: { type: "string", description: "Name or partial name" },
        date: { type: "string", description: "Date (YYYY-MM-DD)" },
      },
      required: ["memberName"],
    },
  },
  {
    name: "get_all_eod_reports",
    description: "Get ALL EOD reports from the entire team for a specific date",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date (YYYY-MM-DD)" },
      },
    },
  },
  {
    name: "assign_task",
    description: "Create and assign a task to a team member",
    inputSchema: {
      type: "object",
      properties: {
        assigneeName: { type: "string", description: "Name of team member" },
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task description" },
        priority: { type: "string", enum: ["high", "medium", "normal"] },
        dueDate: { type: "string", description: "Due date (YYYY-MM-DD)" },
        rockTitle: { type: "string", description: "Optional: Link to a rock" },
      },
      required: ["assigneeName", "title", "dueDate"],
    },
  },
  {
    name: "get_workload_analysis",
    description: "Analyze team workload and find who has capacity",
    inputSchema: {
      type: "object",
      properties: {
        taskType: { type: "string", description: "Type of task" },
      },
    },
  },
  {
    name: "generate_daily_digest",
    description: "Generate a comprehensive daily digest",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date (YYYY-MM-DD)" },
        format: { type: "string", enum: ["summary", "detailed", "executive"] },
      },
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// Call tool handler - routes to MCP endpoint
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Call our remote MCP endpoint with the tool request
    const response = await fetch(\`\${API_URL}/api/mcp\`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${API_KEY}\`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name, arguments: args || {} },
      }),
    });

    const data = await response.json();

    if (data.error) {
      return {
        content: [{ type: "text", text: \`Error: \${data.error.message || JSON.stringify(data.error)}\` }],
        isError: true,
      };
    }

    return data.result || { content: [{ type: "text", text: "Success" }] };
  } catch (error) {
    return {
      content: [{ type: "text", text: \`Error: \${error.message}\` }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AIMS EOD Tracker MCP Server running");
}

main().catch(console.error);
`

// Manifest template for the MCPB bundle
const getManifest = (orgName: string) => ({
  schema_version: "1.0",
  name: "aims-eod-tracker",
  display_name: `AIMS EOD Tracker${orgName ? ` - ${orgName}` : ""}`,
  description: "Track your team's EOD reports, manage tasks, and view quarterly rocks directly from Claude Desktop.",
  version: "2.0.0",
  author: {
    name: "AI Managing Services",
    url: "https://eod.aimanagingservices.com",
  },
  server: {
    type: "node",
    entry: "server/index.js",
  },
  tools: [
    { name: "get_team_members", description: "List all team members" },
    { name: "check_eod_status", description: "Check EOD submission status" },
    { name: "get_rocks", description: "View quarterly goals" },
    { name: "get_pending_tasks", description: "Get pending tasks" },
    { name: "get_team_overview", description: "Get team overview" },
    { name: "get_blockers", description: "View blockers and escalations" },
    { name: "get_member_analysis", description: "Analyze team member performance" },
    { name: "get_eod_report_details", description: "Get detailed EOD report" },
    { name: "get_all_eod_reports", description: "Get all team EOD reports" },
    { name: "assign_task", description: "Assign a task to a team member" },
    { name: "get_workload_analysis", description: "Analyze team workload" },
    { name: "generate_daily_digest", description: "Generate daily summary" },
  ],
  permissions: {
    network: ["https://eod.aimanagingservices.com"],
  },
})

// Simple icon as base64 (a colored square with "AIMS" text - placeholder)
const getIcon = () => {
  // This is a simple 128x128 PNG icon placeholder
  // In production, you'd want a proper icon file
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAA8lJREFUeJzt3V1u2zAQBOCZ9P1vXPeHOLYly6T4M7uz3xsQBDGlWQ5Jyerx+fn5AgC/H/75AOB9/3YPAPid3z9fAAD8kAkAAJggAABgggAAgAkCAAAm+D0TIIDPv/7u1/0H4P/xCAAwQQAAwAQBAAAT/Pk3AADI+/n7a+YJQBFfGwA+kQkAAJggAABgggAAgAkCAAAm+PV3AMjr+PfuMwBF/EMmAABgggAAgAkCAAAm+PVvALDL6+HffHY9A1BE5glAEV8bAD6RCQAA2C4TAACwXSYAAGC7TAAAYIJfPwfIz7z67Hp9B6CIn8kEAABMEAAAMEEAAMAEAQAAE/z6NQBqef78evUcQBFfkwkAAJggAABgggAAgAkCAAAm+PM1ADXw/Pm5eh+giJ/JBAAAT/q4CgCo0sdVAECVPq4CACq1+jkAsF2vVwEAtXu9CgCo3avPAIDdXq8CAHb79fUBmSDwx9fXBxSC4E+v5wDAdt1eBQBU6/Y6AKBaXQ8AgLq9HgQAdOs6CECVXn8RAGzX7VUAgN2+PgYAtun2GACgdreDAMBq//v6+oBC0POWT0EAJb58fR3AJN/4+joAk5zvvgEEbO+3BAEU75ufXwUQ0L1f3x9Q/O7VpwBAH95dBYD0Y3+8vB9QxY+vvwJAfvL1GQBueMcTANjt17sAwDa9ngUAdPZ6FQCwzb9XAYDt+r0KAKjd8zcABDaZAPCHr+8BGKX7OYBJup4DmKTrOYBJOp8DGKXrOYBJul4IANjt39cA+CeZAICHul8IVL3uFwJVqvMLgWp1vhConv/9/wMAbfr64wGKBCYAAB8kAhT59CIAQJFPLwIAFLn6GABQos8PAYBqff8SAMj59P8AAO+b/xgAUOTTiwAARb6+DQBQ5OsjAECRT68CAJb79DIA2O3TywCgWl8/BQC2++kHIgLUrvMfBwCqdfwNQNU+/XEAoFqdPwYAqtX5YwCgWp0/BgCq1fFvAQCqdXwOAOxW9zUAZer+KQCg2tdfAQB2u/sKgNp9egEAUKSu5wBmO/4OAFB0fAwAbPP1bQDAMrdPAQDbdX4bALDMrccAwDbdHwMA1fn6PABQt+7HAIBqdf0pALBdx98CAFWr8/cAwDJd7wIA2/X9LQCwVcdXAYBq/fv5AO06vgoAqFXXnwMAy3W+CQBs1/nzAMByd28BAKp1+yQAsErPH4EAKtf1WACgZt2fAQDbe70AAFBJ73sAoJZezwEAJfT9KACg2tfXAACVvPoYAGq5/0AEQImvjwAAJPz8GABQRq9PAQCV9PoUAFBJr28BAEp6vgsAKOn0DwFApU8fAgFKfPsIAFBC/wCQ0D8AgIACAA==",
    "base64"
  )
}

export async function GET(request: NextRequest) {
  try {
    // Get authentication context
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get query parameters
    const url = new URL(request.url)
    const apiKeyId = url.searchParams.get("keyId")

    if (!apiKeyId) {
      return NextResponse.json(
        { success: false, error: "API key ID required" },
        { status: 400 }
      )
    }

    // Get the API key
    const apiKeys = await db.apiKeys.findByOrganizationId(auth.organization.id)
    const apiKey = apiKeys.find(k => k.id === apiKeyId)

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "API key not found" },
        { status: 404 }
      )
    }

    // Get organization name for display
    const org = await db.organizations.findById(auth.organization.id)
    const orgName = org?.name || ""

    // Build the API URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://eod.aimanagingservices.com"

    // Create the ZIP bundle
    const zip = new JSZip()

    // Add manifest.json
    zip.file("manifest.json", JSON.stringify(getManifest(orgName), null, 2))

    // Add server code
    zip.file("server/index.js", getMcpServerCode(appUrl, apiKey.key))

    // Add icon
    zip.file("icon.png", getIcon())

    // Add package.json for the server
    zip.file("server/package.json", JSON.stringify({
      name: "aims-eod-tracker-mcp",
      version: "2.0.0",
      type: "module",
      main: "index.js",
      dependencies: {
        "@modelcontextprotocol/sdk": "^1.0.0",
      },
    }, null, 2))

    // Generate the ZIP file
    const content = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    })

    // Return the file (convert Buffer to Uint8Array for NextResponse compatibility)
    return new NextResponse(new Uint8Array(content), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="aims-eod-tracker.mcpb"`,
        "Content-Length": content.length.toString(),
      },
    })
  } catch (error: any) {
    logError(logger, "Error generating MCPB bundle", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate bundle" },
      { status: 500 }
    )
  }
}
