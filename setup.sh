#!/bin/bash

# agy-hud One-Click Setup Script
# Works for Antigravity CLI

set -e

echo "🚀 Starting agy-hud installation..."

# 1. Detect paths
NODE_PATH=$(which node)
PROJECT_DIR=$(pwd)
HUD_SCRIPT="$PROJECT_DIR/extensions/bin/agy-hud.js"
SETTINGS_FILE="$HOME/.gemini/antigravity-cli/settings.json"

if [ -z "$NODE_PATH" ]; then
  echo "❌ Error: Node.js not found in PATH."
  exit 1
fi

if [ ! -f "$HUD_SCRIPT" ]; then
  echo "❌ Error: HUD script not found at $HUD_SCRIPT"
  exit 1
fi

# 2. Official Plugin Installation
echo "🔌 Installing as an official agy plugin..."
agy plugin uninstall agy-hud >/dev/null 2>&1 || true
agy plugin install .

# 3. Update settings.json for statusLine — pass paths via env vars so quotes
# or special chars in $NODE_PATH / $HUD_SCRIPT can't break the inline script.
if [ -f "$SETTINGS_FILE" ]; then
  echo "🔧 Updating statusLine configuration in settings.json..."
  AGY_HUD_NODE="$NODE_PATH" AGY_HUD_SCRIPT="$HUD_SCRIPT" AGY_HUD_SETTINGS="$SETTINGS_FILE" \
  "$NODE_PATH" -e '
    const fs = require("fs");
    const settingsPath = process.env.AGY_HUD_SETTINGS;
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    settings.statusLine = {
      type: "command",
      command: `"${process.env.AGY_HUD_NODE}" "${process.env.AGY_HUD_SCRIPT}"`,
    };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  '
else
  echo "⚠️ Warning: Antigravity settings.json not found at $SETTINGS_FILE"
fi

echo "✅ Installation complete!"
echo "✨ Please restart your Antigravity CLI to see the HUD."
echo "💡 You can customize colors in extensions/agy-hud.config.json"
