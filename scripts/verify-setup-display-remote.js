#!/usr/bin/env node
'use strict';

const { spawn, spawnSync } = require('child_process');

const args = process.argv.slice(2);
const target = args[0];
const zipUrl = args[1];
const setupScriptUrl = args[2];
const setupSourceBaseArg = args.find(arg => arg.startsWith('--setup-source-base='));
const setupSourceBase = setupSourceBaseArg ? setupSourceBaseArg.slice('--setup-source-base='.length) : '';
const resetHud = args.includes('--reset-hud');
const timeoutArg = args.find(arg => arg.startsWith('--observe-timeout-ms='));
const observeTimeoutMs = timeoutArg ? Number(timeoutArg.split('=')[1]) : 12_000;
const agyBinArg = args.find(arg => arg.startsWith('--agy-bin='));
const agyBin = agyBinArg ? agyBinArg.slice('--agy-bin='.length) : 'agy';
const remoteEnv = args
  .filter(arg => arg.startsWith('--remote-env='))
  .map(arg => arg.slice('--remote-env='.length))
  .filter(Boolean);

if (!target || !zipUrl || !setupScriptUrl) {
  process.stderr.write(
    'Usage: node scripts/verify-setup-display-remote.js <ssh-target> <zip-url> <setup-script-url> [--setup-source-base=url] [--reset-hud] [--observe-timeout-ms=N] [--agy-bin=/path/to/agy] [--remote-env=KEY=VALUE]\n'
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

function runSshNode(script, scriptArgs = [], timeout = 180_000) {
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

const installSetupScript = String.raw`
'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function argValue(name) {
  const found = process.argv.find(arg => arg.startsWith(name + '='));
  return found ? found.slice(name.length + 1) : '';
}

const zipUrl = argValue('--zip-url');
const setupScriptUrl = argValue('--setup-script-url');
const setupSourceBase = argValue('--setup-source-base');
const resetHud = process.argv.includes('--reset-hud');
const agyBin = argValue('--agy-bin') || process.env.AGY_BIN || 'agy';
const base = path.join(os.homedir(), '.gemini', 'antigravity-cli');
const pluginDir = path.join(base, 'plugins', 'agy-hud');
const runtimeDir = path.join(base, 'agy-hud-runtime');
const settingsPath = path.join(base, 'settings.json');

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    timeout: options.timeout || 120_000,
    env: options.env || process.env,
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
  return {
    base,
    settingsExists: fs.existsSync(settingsPath),
    statusLine: settings && settings.statusLine ? settings.statusLine : null,
    pluginExists: fs.existsSync(pluginDir),
    setupSkillExists: fs.existsSync(path.join(pluginDir, 'skills', 'setup', 'SKILL.md')),
    runtimeExists: fs.existsSync(runtimeDir),
    runtimeHudExists: fs.existsSync(path.join(runtimeDir, 'extensions', 'bin', 'agy-hud.js')),
  };
}

function requestBuffer(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'http:' ? http : https;
    const req = client.get(parsed, response => {
      const status = response.statusCode || 0;
      if (status >= 300 && status < 400 && response.headers.location && redirectsLeft > 0) {
        response.resume();
        resolve(requestBuffer(new URL(response.headers.location, parsed).toString(), redirectsLeft - 1));
        return;
      }
      if (status < 200 || status >= 300) {
        response.resume();
        reject(new Error('download failed (' + status + '): ' + url));
        return;
      }
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.setTimeout(30_000, () => {
      req.destroy(new Error('download timed out: ' + url));
    });
    req.on('error', reject);
  });
}

async function runSetupScript() {
  const body = await requestBuffer(setupScriptUrl);
  const scriptPath = path.join(os.tmpdir(), 'agy-hud-setup-runtime.js');
  fs.writeFileSync(scriptPath, body);
  const env = { ...process.env };
  if (setupSourceBase) env.AGY_HUD_SETUP_SOURCE_BASE = setupSourceBase;
  return run(process.execPath, [scriptPath], { timeout: 180_000, env });
}

(async () => {
  const actions = [];
  if (!zipUrl || !setupScriptUrl) {
    process.stdout.write(JSON.stringify({ ok: false, error: 'zip url or setup script url missing' }));
    return;
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
  const setup = await runSetupScript();
  const afterSetup = collectState();
  const installPlain = stripAnsi(String(install.stdout || '') + '\n' + String(install.stderr || ''));

  process.stdout.write(JSON.stringify({
    ok: install.status === 0 && /\[ok\]/.test(install.stdout || '') && setup.status === 0,
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
    setup: {
      status: setup.status,
      signal: setup.signal,
      stdout: setup.stdout,
      stderr: setup.stderr,
      error: setup.error && setup.error.message,
    },
    afterSetup,
  }));
})().catch(error => {
  process.stdout.write(JSON.stringify({ ok: false, error: error.stack || error.message }));
});
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
try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch { /* missing */ }

process.stdout.write(JSON.stringify({
  base,
  settingsExists: fs.existsSync(settingsPath),
  statusLine: settings && settings.statusLine ? settings.statusLine : null,
  pluginExists: fs.existsSync(pluginDir),
  setupSkillExists: fs.existsSync(path.join(pluginDir, 'skills', 'setup', 'SKILL.md')),
  runtimeExists: fs.existsSync(runtimeDir),
  runtimeHudExists: fs.existsSync(path.join(runtimeDir, 'extensions', 'bin', 'agy-hud.js')),
}));
`;

const statusLineCommandScript = String.raw`
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const base = path.join(os.homedir(), '.gemini', 'antigravity-cli');
const settingsPath = path.join(base, 'settings.json');
let settings = null;
try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch { /* missing */ }

const command = settings && settings.statusLine && settings.statusLine.command;
if (!command) {
  process.stdout.write(JSON.stringify({ ok: false, error: 'settings.statusLine.command missing' }));
  process.exit(0);
}

const run = spawnSync(command, {
  shell: true,
  input: '',
  encoding: 'utf8',
  timeout: 15_000,
  env: { ...process.env, AGY_HUD_FORCE_ASCII: '1' },
});

process.stdout.write(JSON.stringify({
  ok: run.status === 0,
  command,
  status: run.status,
  signal: run.signal,
  stdout: run.stdout,
  stderr: run.stderr,
  error: run.error && run.error.message,
}));
`;

(async () => {
  const setupArgs = [
    `--zip-url=${zipUrl}`,
    `--setup-script-url=${setupScriptUrl}`,
    `--agy-bin=${agyBin}`,
  ];
  if (setupSourceBase) setupArgs.push(`--setup-source-base=${setupSourceBase}`);
  if (resetHud) setupArgs.push('--reset-hud');

  const setupResult = runSshNode(installSetupScript, setupArgs, 260_000);
  if (!setupResult.ok) {
    fail('agy plugin install + setup skill flow did not pass verification', setupResult);
  }

  const statusLineCommand = runSshNode(statusLineCommandScript, [], 60_000);
  const statusLineCommandPlain = stripAnsi(`${statusLineCommand.stdout || ''}\n${statusLineCommand.stderr || ''}`);
  const statusLineCommandVisible = /AGY-HUD/.test(statusLineCommandPlain);

  const observation = await observeAgy();
  const observedRaw = `${observation.stdout || ''}\n${observation.stderr || ''}`;
  const observedPlain = stripAnsi(observedRaw);
  const observedScreen = renderTerminalScreen(observedRaw);
  const afterObserve = runSshNode(stateScript, [], 60_000);
  const hudVisible = /AGY-HUD/.test(observedScreen);
  const streamHudPresent = /AGY-HUD/.test(observedPlain);
  const statusLineReady = Boolean(afterObserve.statusLine && /agy-hud/i.test(String(afterObserve.statusLine.command || '')));
  const runtimeReady = Boolean(afterObserve.runtimeHudExists);
  const commandReady = statusLineCommand.ok && statusLineCommandVisible;
  const displayReady = commandReady && statusLineReady && runtimeReady;

  const report = {
    ok: displayReady,
    target,
    zipUrl,
    setupScriptUrl,
    setupSourceBase,
    resetHud,
    install: {
      status: setupResult.install.status,
      processedSkills: /skills\s+:\s+\d+ processed/.test(setupResult.install.plain),
    },
    setup: {
      status: setupResult.setup.status,
      outputPreview: String(setupResult.setup.stdout || '').split(/\r?\n/).slice(0, 12),
    },
    statusLineCommand: {
      status: statusLineCommand.status,
      signal: statusLineCommand.signal,
      statusLineCommandVisible,
      commandReady,
      outputPreview: statusLineCommandPlain.split(/\r?\n/).slice(0, 12),
      error: statusLineCommand.error,
    },
    actionsBeforeInstall: setupResult.actions,
    afterInstall: setupResult.afterInstall,
    afterSetup: setupResult.afterSetup,
    observe: {
      status: observation.status,
      signal: observation.signal,
      timedOut: observation.timedOut,
      hudVisible,
      streamHudPresent,
      statusLineReady,
      runtimeReady,
      commandReady,
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
