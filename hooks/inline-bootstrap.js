// Source for hooks.json's post_invocation_hooks[0].command.
// After editing this file, regenerate hooks.json with:
//   node hooks/build-hook.js
// (Or hand-minify into a single-line string.)

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const home = os.homedir();
const runtime = process.env.AGY_HUD_RUNTIME_DIR
  || path.join(home, '.gemini', 'antigravity-cli', 'agy-hud-runtime');
// __AGY_HUD_REPO_URL__ is replaced by hooks/build-hook.js at build time with
// the `repository.url` field from package.json. Edit package.json, not here.
const repo = process.env.AGY_HUD_REPO_URL || '__AGY_HUD_REPO_URL__';

// settings.json lookup — same priority order as extensions/paths.js
const settingsPath = (() => {
  const candidates = [
    path.join(home, '.gemini', 'antigravity-cli', 'settings.json'),
    process.env.XDG_DATA_HOME && path.join(process.env.XDG_DATA_HOME, 'antigravity-cli', 'settings.json'),
    process.env.APPDATA && path.join(process.env.APPDATA, 'antigravity-cli', 'settings.json'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'antigravity-cli', 'settings.json'),
  ].filter(Boolean);
  return candidates.find(p => fs.existsSync(p)) || candidates[0];
})();

const hud = path.join(runtime, 'extensions', 'bin', 'agy-hud.js');
const isWin = process.platform === 'win32';
const shim = hud.replace(/\.js$/i, '.cmd');

const runGit = a => cp.execFileSync('git', a, { stdio: 'ignore' });

// Sync busy-wait — internal-only, the script can't `await`.
function sleepSync(ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) { /* spin */ }
}

// Windows file locks (Defender, lingering handles) can make rmSync+rename race.
// Retry with backoff up to ~600ms total.
function renameWithRetry(from, to) {
  for (let i = 0; i < 4; i++) {
    try {
      fs.rmSync(to, { recursive: true, force: true });
      fs.renameSync(from, to);
      return;
    } catch (e) {
      if (i === 3) throw e;
      sleepSync((i + 1) * 150);
    }
  }
}

function clone() {
  const tmp = runtime + '-' + process.pid + '-' + Date.now();
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(runtime), { recursive: true });
  runGit(['clone', '--depth=1', repo, tmp]);
  renameWithRetry(tmp, runtime);
}

try {
  if (fs.existsSync(path.join(runtime, '.git'))) {
    try {
      runGit(['-C', runtime, 'fetch', '--depth=1', 'origin', 'HEAD']);
      runGit(['-C', runtime, 'reset', '--hard', 'FETCH_HEAD']);
    } catch {
      clone();
    }
  } else {
    try { clone(); } catch { /* network/permission */ }
  }
} catch { /* swallow — best-effort */ }

if (!fs.existsSync(hud)) process.exit(0);

// On Windows, generate the .cmd shim alongside the HUD script so the
// statusLine command can survive missing-node-on-PATH and Program Files
// quoting issues. Must mirror buildCmdShimContents in extensions/statusline.js.
if (isWin) {
  const scriptName = path.basename(hud);
  const shimBody = [
    '@echo off',
    'setlocal',
    'node "%~dp0' + scriptName + '" %* 2>nul',
    'if %ERRORLEVEL%==0 exit /b 0',
    'if exist "%ProgramFiles%\\nodejs\\node.exe" "%ProgramFiles%\\nodejs\\node.exe" "%~dp0' + scriptName + '" %*',
    '',
  ].join('\r\n');
  try { fs.writeFileSync(shim, shimBody, 'utf8'); } catch { /* best-effort */ }
}

const cmd = isWin
  ? '"' + shim + '"'
  : '"' + process.execPath + '" "' + hud + '"';

let s = {};
try {
  if (fs.existsSync(settingsPath)) s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
} catch { /* keep empty */ }

if (!s.statusLine || s.statusLine.command !== cmd) {
  s.statusLine = { type: 'command', command: cmd };
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2));
}
