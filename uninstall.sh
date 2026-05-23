#!/usr/bin/env bash
# Remove agy-hud from this machine.
# 1. Run runtime/uninstall.js (clears settings.statusLine, removes runtime dir, tmp tokens)
# 2. Run `agy plugin uninstall agy-hud` (removes the staged plugin dir)
set -uo pipefail

RUNTIME_UNINSTALL="$HOME/.gemini/antigravity-cli/agy-hud-runtime/runtime/uninstall.js"

if command -v node >/dev/null 2>&1 && [ -f "$RUNTIME_UNINSTALL" ]; then
  node "$RUNTIME_UNINSTALL"
else
  echo "agy-hud uninstall: runtime not found at $RUNTIME_UNINSTALL — skipping settings cleanup" >&2
fi

if command -v agy >/dev/null 2>&1; then
  agy plugin uninstall agy-hud || true
else
  echo "agy-hud uninstall: agy CLI not on PATH — skipping plugin uninstall" >&2
fi

echo "agy-hud uninstall complete"
