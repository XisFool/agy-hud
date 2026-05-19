#!/bin/bash

# agy-hud One-Click Setup Script
# Works for Antigravity CLI

set -e

echo "🚀 Starting agy-hud installation..."

# 1. Path detection
NODE_PATH=$(which node)
PROJECT_DIR=$(pwd)
SETTINGS_FILE="$HOME/.gemini/antigravity-cli/settings.json"

if [ -z "$NODE_PATH" ]; then
  echo "❌ Error: Node.js not found in PATH."
  exit 1
fi

# 2. Official Plugin Installation
echo "🔌 Installing as an official agy plugin..."
agy plugin install .

# 3. Backup and update settings.json (for statusLine specific rendering)
if [ -f "$SETTINGS_FILE" ]; then
  echo "💾 Backing up settings.json to settings.json.bak..."
  cp "$SETTINGS_FILE" "$SETTINGS_FILE.bak"
  
  echo "🔧 Updating statusLine command in settings.json..."
  # Use node to safely update JSON
  $NODE_PATH -e "
    const fs = require('fs');
    const settings = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf8'));
    settings.statusLine = {
      type: 'command',
      command: '$NODE_PATH $PROJECT_DIR/src/index.mjs'
    };
    fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(settings, null, 2));
  "
else
  echo "⚠️ Warning: Antigravity settings.json not found at $SETTINGS_FILE"
fi

echo "✅ Installation complete!"
echo "✨ Please restart your Antigravity CLI to see the HUD."
echo "💡 You can customize colors in agy-hud.config.json"
