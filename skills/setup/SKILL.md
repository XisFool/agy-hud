---
description: Configure agy-hud after agy plugin install by preparing runtime files and writing settings.statusLine
allowed-tools: Bash, Read
---

# Configure agy-hud

Use this skill after the user has installed the plugin with:

```bash
agy plugin install https://github.com/icebear0828/agy-hud.git
```

The plugin installer imports this setup skill, but it does not execute
JavaScript or hooks automatically. This skill performs the explicit setup step:
download the agy-hud runtime files, write `settings.statusLine`, verify the HUD
command itself prints `AGY-HUD`, then verify a fresh signed-in `agy` session
shows `AGY-HUD`. Setup also attempts one quota-cache refresh; this is allowed
to skip when agy credentials are missing or expired.

## Rules

- Do not ask the user to clone this repository.
- Do not run installed hook commands as setup.
- Do not edit unrelated settings.
- Preserve existing `settings.json` keys; only replace `settings.statusLine`.
- Use `node`; if Node.js is missing, stop and report that Node.js is required.

## Setup

1. Confirm `agy plugin list` contains `agy-hud`.
2. Run this bootstrap. It downloads a small setup script, which then downloads
   the runtime files into `~/.gemini/antigravity-cli/agy-hud-runtime` and writes
   `settings.statusLine`.

```bash
node -e "const fs=require('fs'),https=require('https'),os=require('os'),path=require('path'),cp=require('child_process');const u=process.env.AGY_HUD_SETUP_SCRIPT_URL||'https://raw.githubusercontent.com/icebear0828/agy-hud/main/scripts/setup-runtime.js';const p=path.join(os.tmpdir(),'agy-hud-setup-runtime.js');https.get(u,r=>{let s='';r.on('data',c=>s+=c);r.on('end',()=>{if(r.statusCode!==200){console.error('download failed '+r.statusCode+': '+u);process.exit(1)}fs.writeFileSync(p,s);const o=cp.spawnSync(process.execPath,[p],{stdio:'inherit',env:process.env});process.exit(o.status||0)})}).on('error',e=>{console.error(e.stack||e);process.exit(1)})"
```

3. Read `~/.gemini/antigravity-cli/settings.json` and confirm
   `settings.statusLine.command` points at `agy-hud-runtime`.
4. Run the configured `settings.statusLine.command` directly and confirm stdout
   contains `AGY-HUD`. If the machine has valid agy OAuth credentials, this
   output should include quota rows. If it says `Antigravity token expired`,
   report that the local agy credential must be refreshed on that machine; do
   not treat it as a plugin path/install failure.
5. Open a fresh signed-in `agy` session and confirm the terminal output contains
   `AGY-HUD`.

Do not use the unauthenticated login screen as the only display check. The HUD
command does not require login, but agy's login TUI can redraw or clear the
statusline differently across macOS and Windows.

Report setup as successful only when the `settings.statusLine` check, direct
HUD command check, and signed-in `agy` observation pass.
