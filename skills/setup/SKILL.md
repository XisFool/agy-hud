---
name: agy-hud-setup
description: Re-run agy-hud bootstrap when the HUD is missing, stale, or settings.json statusLine points to a broken path. Downloads runtime and rewrites settings.statusLine.
---

# agy-hud setup

This skill runs the agy-hud bootstrap. Use it when:

- HUD is not visible after `agy plugin install`.
- `settings.json` `statusLine.command` points to a missing path (e.g. an expired tmp directory).
- The user wants to re-pin the runtime after pulling a new release.

## Bootstrap

Run this single command in a normal shell (not from inside an active `agy` session — `agy` rewrites `settings.json` from in-memory state on exit, which can overwrite the change):

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/icebear0828/agy-hud/main/scripts/bootstrap.sh)
```

It is idempotent. Re-running repairs path drift.

## Verify

After the bootstrap completes:

1. `cat ~/.gemini/antigravity-cli/settings.json` — `statusLine.command` should reference `~/.gemini/antigravity-cli/agy-hud-runtime/runtime/bin/agy-hud.js` (or the equivalent `.cmd` shim on Windows). It must NOT contain `/var/folders/...` or any other tmp path.
2. Run the configured command directly with empty stdin: output should contain the `AGY-HUD` banner.
3. Start a fresh `agy` session: the HUD line should appear in the terminal.

If quota rows show `Antigravity token expired`, the local agy credentials need refreshing — that is not a bootstrap failure.

## Requirements

- `node` and `curl` on PATH.
- `agy plugin install https://github.com/icebear0828/agy-hud.git` already ran (the bootstrap places files under that plugin's antigravity-cli root).
