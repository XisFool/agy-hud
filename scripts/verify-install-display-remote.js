#!/usr/bin/env node
'use strict';

const { spawn, spawnSync } = require('child_process');

const args = process.argv.slice(2);
const target = args[0];
const zipUrl = args[1];
const resetHud = args.includes('--reset-hud');
const timeoutArg = args.find(arg => arg.startsWith('--observe-timeout-ms='));
const observeTimeoutMs = timeoutArg ? Number(timeoutArg.split('=')[1]) : 12_000;
const agyBinArg = args.find(arg => arg.startsWith('--agy-bin='));
const agyBin = agyBinArg ? agyBinArg.slice('--agy-bin='.length) : 'agy';
const remoteEnv = args
  .filter(arg => arg.startsWith('--remote-env='))
  .map(arg => arg.slice('--remote-env='.length))
  .filter(Boolean);

if (!target || !zipUrl) {
  process.stderr.write(
    'Usage: node scripts/verify-install-display-remote.js <ssh-target> <zip-url> [--reset-hud] [--observe-timeout-ms=N] [--agy-bin=/path/to/agy] [--remote-env=KEY=VALUE]\n'
  );
  process.exit(1);
}

function fail(message, details) {
  process.stderr.write(`${message}\n`);
  if (details) process.stderr.write(`${JSON.stringify(details, null, 2)}\n`);
  process.exit(1);
}

function stripAnsi(value) {
  return value.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
}

function renderTerminalScreen(value, width = 160) {
  const rows = [[]];
  let row = 0;
  let col = 0;
  let i = 0;

  function ensureRow(index) {
    while (rows.length <= index) rows.push([]);
  }

  function clearLineFromCursor() {
    ensureRow(row);
    rows[row].length = Math.min(rows[row].length, col);
  }

  while (i < value.length) {
    const ch = value[i];

    if (ch === '\x1b') {
      if (value[i + 1] === ']') {
        const end = value.indexOf('\x07', i + 2);
        i = end === -1 ? value.length : end + 1;
        continue;
      }

      if (value[i + 1] === '[') {
        const match = value.slice(i).match(/^\x1b\[([0-9;?]*)([A-Za-z])/);
        if (match) {
          const params = match[1].replace(/\?/g, '').split(';').filter(Boolean).map(Number);
          const command = match[2];
          if (command === 'H' || command === 'f') {
            row = Math.max(0, (params[0] || 1) - 1);
            col = Math.max(0, (params[1] || 1) - 1);
            ensureRow(row);
          } else if (command === 'C') {
            col += params[0] || 1;
          } else if (command === 'D') {
            col = Math.max(0, col - (params[0] || 1));
          } else if (command === 'A') {
            row = Math.max(0, row - (params[0] || 1));
          } else if (command === 'B') {
            row += params[0] || 1;
            ensureRow(row);
          } else if (command === 'K') {
            clearLineFromCursor();
          } else if (command === 'J' && (params[0] || 0) === 2) {
            rows.length = 0;
            rows.push([]);
            row = 0;
            col = 0;
          }
          i += match[0].length;
          continue;
        }
      }

      i += 1;
      continue;
    }

    if (ch === '\r') {
      col = 0;
      i += 1;
      continue;
    }

    if (ch === '\n') {
      row += 1;
      col = 0;
      ensureRow(row);
      i += 1;
      continue;
    }

    ensureRow(row);
    if (col < width) rows[row][col] = ch;
    col += 1;
    i += 1;
  }

  return rows
    .map(chars => chars.join('').replace(/\s+$/g, ''))
    .join('\n');
}

function remoteCommand(command, commandArgs = []) {
  if (remoteEnv.length === 0) return [command, ...commandArgs];
  return ['env', ...remoteEnv, command, ...commandArgs];
}

function runSshNode(script, scriptArgs = [], timeout = 120_000) {
  const ssh = spawnSync('ssh', [target, ...remoteCommand('node', ['-', ...scriptArgs])], {
    input: script,
    encoding: 'utf8',
    timeout,
  });
  if (ssh.status !== 0) {
    fail('remote node step failed', {
      status: ssh.status,
      signal: ssh.signal,
      stdout: ssh.stdout,
      stderr: ssh.stderr,
      error: ssh.error && ssh.error.message,
    });
  }
  try {
    return JSON.parse(ssh.stdout);
  } catch (error) {
    fail('remote node step did not return JSON', {
      error: error.message,
      stdout: ssh.stdout,
      stderr: ssh.stderr,
    });
  }
}

function observeAgy() {
  return new Promise(resolve => {
    const ssh = spawn('ssh', ['-tt', target, ...remoteCommand(agyBin)], {
      encoding: 'utf8',
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      ssh.kill('SIGTERM');
      setTimeout(() => ssh.kill('SIGKILL'), 1000).unref();
    }, observeTimeoutMs);

    ssh.stdout.on('data', data => {
      stdout += data.toString();
    });
    ssh.stderr.on('data', data => {
      stderr += data.toString();
    });
    ssh.on('close', (status, signal) => {
      clearTimeout(timer);
      resolve({ status, signal, timedOut, stdout, stderr });
    });
    ssh.on('error', error => {
      clearTimeout(timer);
      resolve({ status: null, signal: null, timedOut, stdout, stderr, error: error.message });
    });
  });
}

const installScript = String.raw`
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const zipUrl = process.argv[2];
const resetHud = process.argv.includes('--reset-hud');
const agyBin = process.argv[4] || process.env.AGY_BIN || 'agy';
const base = path.join(os.homedir(), '.gemini', 'antigravity-cli');
const pluginDir = path.join(base, 'plugins', 'agy-hud');
const hooksPath = path.join(pluginDir, 'hooks.json');
const runtimeDir = path.join(base, 'agy-hud-runtime');
const settingsPath = path.join(base, 'settings.json');

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    timeout: options.timeout || 90_000,
    shell: Boolean(options.shell),
  });
}

function stripAnsi(value) {
  return value.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
}

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    return null;
  }
}

function writeSettingsIfHudWasRemoved(actions) {
  const settings = readSettings();
  if (!settings || !settings.statusLine) return;
  const command = String(settings.statusLine.command || '');
  if (!/agy-hud/i.test(command)) return;
  delete settings.statusLine;
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  actions.push('removed agy-hud statusLine before install');
}

function removeOwnedShShim(actions) {
  if (process.platform !== 'win32' || !process.env.LOCALAPPDATA) return;
  const agyBinDir = path.join(process.env.LOCALAPPDATA, 'agy', 'bin');
  for (const name of ['sh.cmd', 'sh.bat']) {
    const target = path.join(agyBinDir, name);
    let body = '';
    try { body = fs.readFileSync(target, 'utf8'); } catch { continue; }
    if (!body.includes('cmd.exe /d /s /c') || !body.includes('CMDLINE=%CMDLINE')) continue;
    fs.rmSync(target, { force: true });
    actions.push('removed agy-hud sh shim before install: ' + target);
  }
}

function collectState() {
  const settings = readSettings();
  let hooks = null;
  try { hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8')); } catch { /* missing */ }
  return {
    base,
    settingsExists: fs.existsSync(settingsPath),
    statusLine: settings && settings.statusLine ? settings.statusLine : null,
    pluginExists: fs.existsSync(pluginDir),
    hooksEvents: hooks ? Object.fromEntries(Object.entries(hooks).map(([name, value]) => [name, Object.keys(value)])) : null,
    runtimeExists: fs.existsSync(runtimeDir),
    runtimeHudExists: fs.existsSync(path.join(runtimeDir, 'extensions', 'bin', 'agy-hud.js')),
  };
}

const actions = [];
if (!zipUrl) {
  process.stdout.write(JSON.stringify({ ok: false, error: 'zip url missing' }));
  process.exit(0);
}

const before = collectState();

if (resetHud) {
  run(agyBin, ['plugin', 'uninstall', 'agy-hud'], { timeout: 60_000 });
  fs.rmSync(pluginDir, { recursive: true, force: true });
  fs.rmSync(runtimeDir, { recursive: true, force: true });
  actions.push('removed agy-hud plugin/runtime before install');
  writeSettingsIfHudWasRemoved(actions);
  removeOwnedShShim(actions);
}

const afterReset = collectState();
const install = run(agyBin, ['plugin', 'install', zipUrl], { timeout: 120_000 });
const afterInstall = collectState();
const installPlain = stripAnsi(String(install.stdout || '') + '\n' + String(install.stderr || ''));

process.stdout.write(JSON.stringify({
  ok: install.status === 0 && /\[ok\]/.test(install.stdout || ''),
  actions,
  before,
  afterReset,
  install: {
    status: install.status,
    signal: install.signal,
    stdout: install.stdout,
    stderr: install.stderr,
    plain: installPlain,
    error: install.error && install.error.message,
  },
  afterInstall,
}));
`;

const stateScript = String.raw`
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const base = path.join(os.homedir(), '.gemini', 'antigravity-cli');
const settingsPath = path.join(base, 'settings.json');
const pluginDir = path.join(base, 'plugins', 'agy-hud');
const runtimeDir = path.join(base, 'agy-hud-runtime');
let settings = null;
let hooks = null;
try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch { /* missing */ }
try { hooks = JSON.parse(fs.readFileSync(path.join(pluginDir, 'hooks.json'), 'utf8')); } catch { /* missing */ }

process.stdout.write(JSON.stringify({
  base,
  settingsExists: fs.existsSync(settingsPath),
  statusLine: settings && settings.statusLine ? settings.statusLine : null,
  pluginExists: fs.existsSync(pluginDir),
  hooksEvents: hooks ? Object.fromEntries(Object.entries(hooks).map(([name, value]) => [name, Object.keys(value)])) : null,
  runtimeExists: fs.existsSync(runtimeDir),
  runtimeHudExists: fs.existsSync(path.join(runtimeDir, 'extensions', 'bin', 'agy-hud.js')),
}));
`;

(async () => {
  const installResult = runSshNode(installScript, [zipUrl, resetHud ? '--reset-hud' : '--keep-hud', agyBin], 180_000);
  if (!installResult.ok) {
    fail('agy plugin install did not pass install-only verification', installResult);
  }

  const observation = await observeAgy();
  const observedRaw = `${observation.stdout || ''}\n${observation.stderr || ''}`;
  const observedPlain = stripAnsi(observedRaw);
  const observedScreen = renderTerminalScreen(observedRaw);
  const afterObserve = runSshNode(stateScript, [], 60_000);
  const hudVisible = /AGY-HUD/.test(observedScreen);
  const streamHudPresent = /AGY-HUD/.test(observedPlain);
  const statusLineReady = Boolean(afterObserve.statusLine && /agy-hud/i.test(String(afterObserve.statusLine.command || '')));
  const runtimeReady = Boolean(afterObserve.runtimeHudExists);
  const displayReady = hudVisible && statusLineReady && runtimeReady;

  const report = {
    ok: displayReady,
    target,
    zipUrl,
    resetHud,
    install: {
      status: installResult.install.status,
      processedHooks: /hooks\s+:\s+\d+ processed/.test(installResult.install.plain),
      processedSkills: /skills\s+:\s+\d+ processed/.test(installResult.install.plain),
    },
    actionsBeforeInstall: installResult.actions,
    afterInstall: installResult.afterInstall,
    observe: {
      status: observation.status,
      signal: observation.signal,
      timedOut: observation.timedOut,
      hudVisible,
      streamHudPresent,
      statusLineReady,
      runtimeReady,
      displayReady,
      outputPreview: observedScreen.split(/\r?\n/).slice(0, 24),
      streamPreview: observedPlain.split(/\r?\n/).slice(0, 24),
      error: observation.error,
    },
    afterObserve,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (!displayReady) {
    process.exit(1);
  }
})().catch(error => {
  fail(error.stack || error.message);
});
