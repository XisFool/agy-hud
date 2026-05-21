---
description: Configure agy-hud as the Antigravity CLI statusLine after plugin install
allowed-tools: Bash, Read
---

# Configure agy-hud

Use this skill after the user installs the plugin with:

```bash
agy plugin install https://github.com/icebear0828/agy-hud.git
```

Do not use `scp`. Do not ask the user to clone this repository. The setup must
use the installed plugin state under the Antigravity CLI data directory,
especially `plugins/agy-hud/hooks.json`.

## Procedure

1. Verify that Node.js and Git are available in the current shell.
2. Find the Antigravity CLI data directory that contains
   `plugins/agy-hud/hooks.json`.
3. Validate the existing `settings.json` if it already exists.
4. Execute the installed `post_invocation_hooks` bootstrap command once.
5. Verify that `settings.statusLine.command` exists, `agy-hud-runtime` exists,
   and the configured statusLine command renders `AGY-HUD` with empty stdin.
6. Tell the user to restart or open a fresh `agy` session if the current
   session does not pick up the new statusLine immediately.

Run this Node script from the user's shell:

```bash
node <<'NODE'
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const home = os.homedir();
const roots = [
  path.join(home, '.gemini', 'antigravity-cli'),
  process.env.XDG_DATA_HOME && path.join(process.env.XDG_DATA_HOME, 'antigravity-cli'),
  process.env.APPDATA && path.join(process.env.APPDATA, 'antigravity-cli'),
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'antigravity-cli'),
].filter(Boolean);
const base = roots.find(root => fs.existsSync(path.join(root, 'plugins', 'agy-hud', 'hooks.json'))) || roots[0];
const hooksPath = path.join(base, 'plugins', 'agy-hud', 'hooks.json');
const settingsPath = path.join(base, 'settings.json');
const runtimePath = path.join(base, 'agy-hud-runtime');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireTool(bin, args) {
  try {
    cp.execFileSync(bin, args, { stdio: 'ignore' });
  } catch {
    fail(`${bin} is required for agy-hud setup. Install it, restart the shell, then rerun setup.`);
  }
}

requireTool('node', ['--version']);
requireTool('git', ['--version']);

if (!fs.existsSync(hooksPath)) {
  fail(`agy-hud is not installed at ${hooksPath}. Run: agy plugin install https://github.com/icebear0828/agy-hud.git`);
}

if (fs.existsSync(settingsPath)) {
  try {
    JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (error) {
    fail(`Refusing to edit invalid settings JSON at ${settingsPath}: ${error.message}`);
  }
}

const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
const hook = (hooks.post_invocation_hooks || []).find(item => item && item.name === 'agy-hud-configure-statusline')
  || (hooks.post_invocation_hooks || [])[0];
if (!hook || typeof hook.command !== 'string' || hook.command.trim() === '') {
  fail(`No executable post_invocation_hooks command found in ${hooksPath}`);
}

cp.execSync(hook.command, { stdio: 'inherit', shell: true });

const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
if (!settings.statusLine || settings.statusLine.type !== 'command' || typeof settings.statusLine.command !== 'string') {
  fail(`setup did not write settings.statusLine in ${settingsPath}`);
}
if (!fs.existsSync(runtimePath)) {
  fail(`setup did not create agy-hud-runtime at ${runtimePath}`);
}

const output = cp.execSync(settings.statusLine.command, {
  input: '',
  encoding: 'utf8',
  shell: true,
  timeout: 10000,
  env: { ...process.env, AGY_HUD_FORCE_ASCII: '1' },
});
if (!/AGY-HUD/.test(output)) {
  fail(`statusLine command ran but did not render agy-hud output:\n${output}`);
}

console.log(`agy-hud setup complete. settings.statusLine -> ${settings.statusLine.command}`);
NODE
```
