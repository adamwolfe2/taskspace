# AIMS EOD Tracker MCP Server

This MCP (Model Context Protocol) server enables Claude to interact with the AIMS EOD Tracker platform.

## Features

Claude can use this server to:
- **Check EOD Status**: See who has/hasn't submitted their EOD report
- **Assign Tasks**: Create and assign tasks to team members
- **View Rocks**: Check quarterly goals and their progress
- **Get Insights**: Access AI-generated daily digests and blockers
- **Send Reminders**: Trigger EOD reminder emails

## Setup

### 1. Install Dependencies

```bash
cd mcp-server
npm install
```

### 2. Build the Server

```bash
npm run build
```

### 3. Configure Claude Desktop

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "aims-eod-tracker": {
      "command": "node",
      "args": ["/path/to/aimseod/mcp-server/dist/index.js"],
      "env": {
        "AIMS_API_URL": "https://your-aims-deployment.vercel.app",
        "AIMS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 4. Generate API Key

Create an API key in the AIMS platform settings for secure access.

## Available Tools

| Tool | Description |
|------|-------------|
| `get_team_members` | List all team members |
| `check_eod_status` | Check who has/hasn't submitted EOD |
| `assign_task` | Assign a task to a team member |
| `get_rocks` | View quarterly rocks and progress |
| `get_pending_tasks` | Get pending tasks |
| `get_eod_reports` | View EOD reports |
| `get_daily_digest` | Get AI-generated daily summary |
| `get_blockers` | See all reported blockers |
| `get_escalations` | View active escalations |
| `send_eod_reminder` | Send reminder emails |

## Example Usage in Claude

Once configured, you can ask Claude:

- "Who hasn't submitted their EOD today?"
- "Assign a high-priority task to Sarah to review the vendor contracts, due tomorrow"
- "Show me the team's rock progress"
- "What are the current blockers?"
- "Get me the daily digest for yesterday"

## Development

Run in development mode:
```bash
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AIMS_API_URL` | URL of your AIMS deployment | `http://localhost:3000` |
| `AIMS_API_KEY` | API key for authentication | (required) |
