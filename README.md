# agy-hud

> Real-time statusline HUD plugin for **Antigravity CLI (`agy`)**. Refreshes after every step with session info, token usage, and **real account quota** (same numbers as `/usage`).

---

## What it looks like

```
AGY-HUD │ ⎇ main │ ❖ Plan: Pro │ ⚡ Steps: 42 │ ✓ Tasks: 3
⚿ Tokens: 85.2k │ ⛁ Ctx: 85.2k/200.0k [████░░░░░░] │ 🤖 Model: Claude Sonnet 4.6
  ───────────────────────────────────────────────────────────────────────────
  Gem 3.5 Flash(H) [████░░]  60% ~3h │ Gem 3.5 Flash(M) [████░░]  60% ~3h
  Claude 4.6(Th)   [██████] 100% ~5h │ Claude Opus(Th)  [██████] 100% ~5h
  GPT-OSS 120B     [██████] 100% ~5h │
```

- **Line 1**: branch, plan, step count, task count
- **Line 2**: token usage, context window bar, current model
- **Quota rows**: per-model account quota (matches `/usage` exactly) + reset countdown

---

## Install

One command, in a normal shell (NOT inside an active `agy` session):

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/icebear0828/agy-hud/main/scripts/install.sh)
```

This:
1. Cleanly re-installs the plugin (`agy plugin uninstall` + `agy plugin install`)
2. Downloads the HUD runtime to `~/.gemini/antigravity-cli/agy-hud-runtime/`
3. Writes `statusLine.command` into `~/.gemini/antigravity-cli/settings.json`

Open a fresh `agy` session — the HUD appears at the bottom of the terminal.

**Idempotent** — re-run the same command anytime to repair drift, upgrade, or clean stale files left by older versions.

### Why not a single `agy plugin install`?

`agy plugin install` only stages **declarative** plugin content (`plugin.json` + `skills/`); it never executes JavaScript and never touches `settings.json`. The HUD's statusLine command and renderer runtime are configured separately. `install.sh` does both pieces atomically.

### For forks / mirrors

```bash
AGY_HUD_REPO_RAW=https://raw.githubusercontent.com/your-fork/agy-hud/main \
AGY_HUD_REPO_URL=https://github.com/your-fork/agy-hud.git \
  bash <(curl -fsSL "$AGY_HUD_REPO_RAW/scripts/install.sh")
```

### Manual / advanced

If you prefer to run the two steps yourself:

```bash
agy plugin install https://github.com/icebear0828/agy-hud.git
bash <(curl -fsSL https://raw.githubusercontent.com/icebear0828/agy-hud/main/scripts/bootstrap.sh)
```

---

## Verify

After bootstrap:

```bash
# settings.statusLine should point at the runtime
cat ~/.gemini/antigravity-cli/settings.json | grep statusLine -A2

# Direct HUD invocation should print the AGY-HUD banner
node ~/.gemini/antigravity-cli/agy-hud-runtime/runtime/bin/agy-hud.js
```

If quota rows show `Antigravity token expired`, refresh your `agy` login. That is **not** a bootstrap failure.

Windows PowerShell:

```powershell
Get-Content "$env:USERPROFILE\.gemini\antigravity-cli\settings.json"
& "$env:USERPROFILE\.gemini\antigravity-cli\agy-hud-runtime\runtime\bin\agy-hud.cmd"
```

---

## Diagnose

```bash
# Inspect token + quota cache state
node scripts/diagnose-auth.js

# Tail agy's own statusLine runner errors
ls -t ~/.gemini/antigravity-cli/log/cli-*.log | head -1 | xargs tail -50 | grep statusline
```

The most common failure mode is `statusline_runner.go: failure N/30` — that means `statusLine.command` in `settings.json` points to a path that no longer exists. Re-run bootstrap.

---

## Uninstall

```bash
bash uninstall.sh        # macOS / Linux
.\uninstall.ps1          # Windows PowerShell
```

This:
1. Clears `settings.json` `statusLine` (with `.bak` of the original)
2. Removes `~/.gemini/antigravity-cli/agy-hud-runtime/`
3. Removes the staged plugin (`agy plugin uninstall agy-hud`)
4. Cleans tmp token mirror / quota cache files

---

## Configuration

Optional. Create `agy-hud.config.json` at the workspace root to override defaults. Without it the HUD uses `runtime/agy-hud.config.json` from the downloaded runtime:

```json
{
  "display": {
    "unicode": true,
    "nerdFont": false,
    "columnWidth": 35
  },
  "thresholds": {
    "warning": 30,
    "critical": 10
  },
  "theme": {
    "warning": "yellow",
    "critical": "red"
  }
}
```

---

## File structure

```
agy-hud/
├── plugin.json           # {"name":"agy-hud"} — agy plugin marker
├── skills/setup/         # SKILL.md — agent-facing setup runbook
├── runtime/              # downloaded by bootstrap to ~/.gemini/.../agy-hud-runtime/runtime/
│   ├── bin/agy-hud.js    # statusLine entry (stdin JSON → ANSI HUD)
│   ├── quota.js          # fetchAvailableModels client (matches /usage)
│   ├── statusline-installer.js
│   ├── uninstall.js
│   └── ...
├── scripts/
│   ├── bootstrap.sh      # one-shot installer
│   ├── bootstrap.js      # actual download + configure logic
│   ├── verify-display.js # E2E install + bootstrap + observe agy
│   └── diagnose-auth.js
├── tests/unit/           # node --test
└── release.sh
```

---

## Cross-platform notes

**Windows token refresh**: Antigravity CLI stores OAuth `refresh_token` + `access_token` in Credential Manager (`gemini:antigravity` / `LegacyGeneric:target=gemini:antigravity`). The HUD prefers a short-lived `agy-hud-token.json` mirror in tmp. When the fast path only sees a missing/expired file token, it triggers a detached background read; the next render uses the refreshed token. agy-hud does **not** swap RT for access tokens — if the Credential Manager access token is expired, refresh agy's login first.

**File token fallback paths** (searched in order):
- `~/.gemini/antigravity-cli/antigravity-oauth-token`
- `$XDG_DATA_HOME/antigravity-cli/antigravity-oauth-token`
- `$APPDATA/antigravity-cli/antigravity-oauth-token`
- `$LOCALAPPDATA/antigravity-cli/antigravity-oauth-token`

---

## License

MIT
