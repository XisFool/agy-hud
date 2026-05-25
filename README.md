# agy-hud

[![E2E](https://github.com/icebear0828/agy-hud/actions/workflows/e2e.yml/badge.svg?branch=main)](https://github.com/icebear0828/agy-hud/actions/workflows/e2e.yml)
[![Release](https://img.shields.io/github/v/release/icebear0828/agy-hud)](https://github.com/icebear0828/agy-hud/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)

> Real-time statusline HUD plugin for **Antigravity CLI (`agy`)**. Refreshes after every step with session info, token usage, and **real account quota** (matches `/usage` numbers).
>
> CI verifies install + HUD render on **macOS, Linux, Windows** on every push — green badge above means it works.

[简体中文](./README_zh.md)

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

**macOS / Linux**:
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/icebear0828/agy-hud/main/scripts/install.sh)
```

**Windows PowerShell**:
```powershell
irm https://raw.githubusercontent.com/icebear0828/agy-hud/main/scripts/install.ps1 | iex
```

**Windows CMD**:
```cmd
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/icebear0828/agy-hud/main/scripts/install.ps1 | iex"
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

**macOS / Linux**:
```bash
AGY_HUD_REPO_RAW=https://raw.githubusercontent.com/your-fork/agy-hud/main \
AGY_HUD_REPO_URL=https://github.com/your-fork/agy-hud.git \
  bash <(curl -fsSL "$AGY_HUD_REPO_RAW/scripts/install.sh")
```

**Windows PowerShell**:
```powershell
$env:AGY_HUD_REPO_RAW = 'https://raw.githubusercontent.com/your-fork/agy-hud/main'
$env:AGY_HUD_REPO_URL = 'https://github.com/your-fork/agy-hud.git'
irm "$env:AGY_HUD_REPO_RAW/scripts/install.ps1" | iex
```

### Manual / advanced

If you prefer to run the two steps yourself:

**macOS / Linux**:
```bash
agy plugin install https://github.com/icebear0828/agy-hud.git
bash <(curl -fsSL https://raw.githubusercontent.com/icebear0828/agy-hud/main/scripts/bootstrap.sh)
```

**Windows PowerShell**:
```powershell
agy plugin install https://github.com/icebear0828/agy-hud.git
$t = Join-Path $env:TEMP "agy-hud-bootstrap.js"
Invoke-WebRequest -Uri https://raw.githubusercontent.com/icebear0828/agy-hud/main/scripts/bootstrap.js -OutFile $t -UseBasicParsing
node $t; Remove-Item $t
```

**Windows CMD**:
```cmd
agy plugin install https://github.com/icebear0828/agy-hud.git
powershell -Command "Invoke-WebRequest -Uri https://raw.githubusercontent.com/icebear0828/agy-hud/main/scripts/bootstrap.js -OutFile %TEMP%\agy-hud-bootstrap.js -UseBasicParsing"
node %TEMP%\agy-hud-bootstrap.js
del %TEMP%\agy-hud-bootstrap.js
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

**macOS / Linux**:
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/icebear0828/agy-hud/main/uninstall.sh)
```

**Windows PowerShell**:
```powershell
irm https://raw.githubusercontent.com/icebear0828/agy-hud/main/uninstall.ps1 | iex
```

**Windows CMD**:
```cmd
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/icebear0828/agy-hud/main/uninstall.ps1 | iex"
```

Or, if you have the repo cloned: `bash uninstall.sh` / `.\uninstall.ps1`.

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
    "useNerdFonts": false,
    "columnWidth": 37
  },
  "thresholds": {
    "warning": 0.7,
    "critical": 0.9
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
├── plugin.json                # {"name":"agy-hud"} — agy plugin marker
├── gemini-extension.json      # required by agy's remote-install validator
├── skills/setup/SKILL.md      # agent-facing "re-run bootstrap" runbook
├── runtime/                   # downloaded by bootstrap to ~/.gemini/.../agy-hud-runtime/runtime/
│   ├── bin/agy-hud.js         # statusLine entry (stdin JSON → ANSI HUD)
│   ├── quota.js               # fetchAvailableModels client (matches /usage)
│   ├── statusline-installer.js
│   ├── uninstall.js
│   └── ...
├── scripts/
│   ├── install.sh             # one-command installer — macOS/Linux
│   ├── install.ps1            # one-command installer — Windows PowerShell
│   ├── bootstrap.sh           # repair-only entry (called by install.sh)
│   ├── bootstrap.js           # actual download + configure logic
│   ├── verify-display.js      # E2E: install + bootstrap + PTY-spawn agy + assert HUD
│   └── diagnose-auth.js
├── tests/unit/                # node --test
├── .github/workflows/e2e.yml  # cross-platform CI matrix
└── release.sh                 # npm test → E2E gate → zip → gh release
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

## Verified by CI

Every push to `main` runs [.github/workflows/e2e.yml](./.github/workflows/e2e.yml) against a 3-OS matrix:

| OS | install.sh runs | bootstrap writes settings.json | HUD command renders `AGY-HUD` |
|----|------|------|------|
| ubuntu-latest | ✅ | ✅ | ✅ |
| macos-latest  | ✅ | ✅ | ✅ |
| windows-latest | ✅ | ✅ | ✅ |

Each run uploads (14-day retention):

| Artifact | Per-OS | Contents |
|---|---|---|
| `e2e-<os>` | all 3 | `e2e-report.json` (diagnostic: `ok`, `hudVisible`, `staleCleaned`, …) + `agy-hud-pty-*.log` (raw ANSI bytes — `cat` to see the HUD render with colors) |
| `hud-screenshot-<os>` | ubuntu + macos | `hud-ascii-<os>.png` + `hud-unicode-<os>.png` rendered via [charm.sh `freeze`](https://github.com/charmbracelet/freeze). PNG visual evidence — download and open. |

CI runs in **no-auth mode**: it asserts the standalone HUD command renders the banner. The full "HUD visible inside a live `agy` session with model-step trigger" check runs on dev machines (with real OAuth) via `release.sh`'s built-in E2E gate.

---

## Known issues

- **Windows PNG screenshot**: every CI run uploads `hud-ascii-*.png` and `hud-unicode-*.png` for macOS + Linux via [charm.sh `freeze`](https://github.com/charmbracelet/freeze). Windows is skipped — `freeze v0.2.2` errors `No input` for every invocation form (positional file, `--execute`, UTF-8 file via `.WriteAllText`) we tried; it's an upstream Windows bug. Windows reviewers still get the raw ANSI bytes via the `e2e-windows-latest` artifact (`cat` it to see the HUD with colors).

> **Note for Windows users**: The HUD auto-detects your active console codepage. If it's a non-UTF-8 codepage like `cp936` (GBK) or `cp1252`, the progress bar will fall back to ASCII characters (`#`) to prevent encoding corruption.
>
> If you force Unicode rendering (e.g. by setting `display.unicode: true` in your configuration) while the active codepage is not UTF-8, you may see garbled text or `?` replacement characters.
>
> **How to enable beautiful Unicode progress bars and borders on Windows:**
> 1. **Per Session (Recommended)**: Run `chcp 65001` once in your Command Prompt / PowerShell window before opening `agy`.
> 2. **System-wide UTF-8 (Permanent)**: 
>    - Go to Windows Settings -> **Time & language** -> **Language & region** -> **Administrative language settings**.
>    - Click **Change system locale**.
>    - Check **"Beta: Use Unicode UTF-8 for worldwide language support"** and restart your computer.
>    - This forces all terminal sessions to use UTF-8 (`cp65001`) natively.

---

## License

MIT
