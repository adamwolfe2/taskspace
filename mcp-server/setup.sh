#!/bin/bash
# Taskspace MCP Server - One Command Setup
# This script builds the server and generates the Claude Desktop config

set -e

echo "🚀 Taskspace MCP Server Setup"
echo "=============================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Install dependencies and build
echo "📦 Installing dependencies..."
cd "$SCRIPT_DIR"
npm install

echo "🔨 Building server..."
npm run build

echo "✅ Build complete!"
echo ""

# Determine config path based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_DIR="$HOME/Library/Application Support/Claude"
    CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    CONFIG_DIR="$HOME/.config/Claude"
    CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]]; then
    CONFIG_DIR="$APPDATA/Claude"
    CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
else
    echo "⚠️  Unknown OS. Please configure manually."
    CONFIG_FILE=""
fi

# Get API key from user
echo "🔑 Enter your Taskspace API Key (from Settings > API Keys):"
read -p "API Key: " API_KEY

if [[ -z "$API_KEY" ]]; then
    echo "❌ API key is required"
    exit 1
fi

# Get API URL
echo ""
echo "🌐 Enter your Taskspace API URL (press Enter for default):"
read -p "API URL [https://trytaskspace.com]: " API_URL
API_URL="${API_URL:-https://trytaskspace.com}"

# Generate config JSON
CONFIG_JSON=$(cat <<EOF
{
  "mcpServers": {
    "taskspace": {
      "command": "node",
      "args": ["$SCRIPT_DIR/dist/index.js"],
      "env": {
        "TASKSPACE_API_URL": "$API_URL",
        "TASKSPACE_API_KEY": "$API_KEY"
      }
    }
  }
}
EOF
)

echo ""
echo "📝 Generated Configuration:"
echo "----------------------------"
echo "$CONFIG_JSON"
echo "----------------------------"
echo ""

if [[ -n "$CONFIG_FILE" ]]; then
    echo "💾 Would you like to save this to Claude Desktop config?"
    echo "   Location: $CONFIG_FILE"
    read -p "Save config? (y/n): " SAVE_CONFIG

    if [[ "$SAVE_CONFIG" == "y" || "$SAVE_CONFIG" == "Y" ]]; then
        mkdir -p "$CONFIG_DIR"

        if [[ -f "$CONFIG_FILE" ]]; then
            echo "⚠️  Config file exists. Creating backup at ${CONFIG_FILE}.backup"
            cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"
        fi

        echo "$CONFIG_JSON" > "$CONFIG_FILE"
        echo "✅ Configuration saved!"
    else
        echo "ℹ️  Config not saved. Copy the JSON above manually."
    fi
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Restart Claude Desktop completely (quit and reopen)"
echo "2. Look for 'taskspace' in the connectors menu"
echo "3. Try asking: 'Check who has submitted their EOD today'"
echo ""
