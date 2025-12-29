# AIMS EOD Tracker MCP Server

This MCP (Model Context Protocol) server enables Claude Desktop to interact with the AIMS EOD Tracker platform.

## Features

Claude can use this server to:
- **Check EOD Status**: See who has/hasn't submitted their EOD report
- **Assign Tasks**: Create and assign tasks to team members
- **View Rocks**: Check quarterly goals and their progress
- **Get Insights**: Access AI-generated daily digests and blockers
- **Send Reminders**: Trigger EOD reminder emails

## Quick Setup Guide

### Step 1: Generate an API Key

1. Log into your AIMS EOD Tracker dashboard
2. Go to **Settings** (gear icon in sidebar)
3. Scroll down to **API Keys** section
4. Click **Generate API Key**
5. Give it a name like "Claude Desktop"
6. Copy the key (starts with `aims_...`) - you'll need this!

### Step 2: Build the MCP Server

```bash
cd mcp-server
npm install
npm run build
```

### Step 3: Configure Claude Desktop

Find your Claude Desktop config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

If the file doesn't exist, create it. Add this configuration:

```json
{
  "mcpServers": {
    "aims-eod-tracker": {
      "command": "node",
      "args": ["/FULL/PATH/TO/aimseod/mcp-server/dist/index.js"],
      "env": {
        "AIMS_API_URL": "https://eod.aimanagingservices.com",
        "AIMS_API_KEY": "aims_your_api_key_here"
      }
    }
  }
}
```

**Important**: Replace:
- `/FULL/PATH/TO/aimseod` with the actual full path to your project
- `aims_your_api_key_here` with your actual API key from Step 1

### Step 4: Restart Claude Desktop

Completely quit Claude Desktop and reopen it. The AIMS connector should now appear in the connectors menu.

## Troubleshooting

### "Connection Failed" Error

1. **Check the path**: Make sure the path to `dist/index.js` is correct and absolute
2. **Check the API key**: Verify your API key is valid and starts with `aims_`
3. **Check the URL**: Ensure `AIMS_API_URL` points to your AIMS deployment
4. **Check the build**: Run `npm run build` in the mcp-server folder again

### Testing the Server Locally

You can test the server directly:

```bash
cd mcp-server
AIMS_API_URL="https://eod.aimanagingservices.com" AIMS_API_KEY="aims_..." npm run dev
```

If it starts without errors, the server is working.

### Viewing Logs

On macOS, check Claude's logs:
```bash
tail -f ~/Library/Logs/Claude/mcp*.log
```

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

## Example Config (macOS)

Here's a complete example for macOS:

```json
{
  "mcpServers": {
    "aims-eod-tracker": {
      "command": "node",
      "args": ["/Users/yourname/Projects/aimseod/mcp-server/dist/index.js"],
      "env": {
        "AIMS_API_URL": "https://eod.aimanagingservices.com",
        "AIMS_API_KEY": "aims_abc123def456..."
      }
    }
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AIMS_API_URL` | URL of your AIMS deployment | `http://localhost:3000` |
| `AIMS_API_KEY` | API key for authentication | (required) |
