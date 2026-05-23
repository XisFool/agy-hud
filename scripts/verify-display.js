#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { execFileSync, spawn, spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const zipPath = path.join(projectRoot, 'agy-hud.zip');
const agyBin = process.env.AGY_BIN || 'agy';
const currentHome = process.argv.includes('--current-home');
const timeoutArg = process.argv.find(arg => arg.startsWith('--observe-timeout-ms='));
const observeTimeoutMs = timeoutArg ? Number(timeoutArg.split('=')[1]) : 12_000;

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

function fail(message, details) {
  process.stderr.write(`${message}\n`);
  if (details) process.stderr.write(`${JSON.stringify(details, null, 2)}\n`);
  process.exit(1);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || projectRoot,
    env: options.env || process.env,
    encoding: 'utf8',
    timeout: options.timeout || 90_000,
  });
}

function startZipServer() {
  const server = http.createServer((req, res) => {
    if (req.url !== '/agy-hud.zip') {
      res.writeHead(404);
      res.end();
      return;
    }
    const stat = fs.statSync(zipPath);
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Length': stat.size,
    });
    fs.createReadStream(zipPath).pipe(res);
  });

  return new Promise(resolve => {
    server.listen(0, () => {
      resolve({
        server,
        url: `http://localhost:${server.address().port}/agy-hud.zip`,
      });
    });
  });
}

function buildEnv(tmpRoot) {
  if (currentHome) return process.env;
  const home = path.join(tmpRoot, 'home');
  const env = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
  };
  if (process.platform === 'win32') {
    env.APPDATA = path.join(home, 'AppData', 'Roaming');
    env.LOCALAPPDATA = path.join(home, 'AppData', 'Local');
  } else {
    env.XDG_DATA_HOME = path.join(tmpRoot, 'xdg');
  }
  return env;
}

function readInstallState(env) {
  const home = env.HOME || env.USERPROFILE || os.homedir();
  const base = path.join(home, '.gemini', 'antigravity-cli');
  const settingsPath = path.join(base, 'settings.json');
  const pluginDir = path.join(base, 'plugins', 'agy-hud');
  const runtimeDir = path.join(base, 'agy-hud-runtime');
  let settings = null;
  try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch { /* missing */ }
  return {
    base,
    settingsExists: fs.existsSync(settingsPath),
    statusLine: settings && settings.statusLine ? settings.statusLine : null,
    pluginExists: fs.existsSync(pluginDir),
    runtimeExists: fs.existsSync(runtimeDir),
    runtimeHudExists: fs.existsSync(path.join(runtimeDir, 'runtime', 'bin', 'agy-hud.js')),
  };
}

function observeLocalAgy(env) {
  return new Promise(resolve => {
    const useScript = process.platform !== 'win32' && fs.existsSync('/usr/bin/script');
    const command = useScript ? '/usr/bin/script' : agyBin;
    const args = useScript ? ['-q', '/dev/null', agyBin] : [];
    const child = spawn(command, args, {
      env,
      cwd: os.homedir(),
      encoding: 'utf8',
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 1000).unref();
    }, observeTimeoutMs);

    child.stdout.on('data', data => {
      stdout += data.toString();
    });
    child.stderr.on('data', data => {
      stderr += data.toString();
    });
    child.on('close', (status, signal) => {
      clearTimeout(timer);
      resolve({ status, signal, timedOut, stdout, stderr, mode: useScript ? 'script-tty' : 'plain' });
    });
    child.on('error', error => {
      clearTimeout(timer);
      resolve({ status: null, signal: null, timedOut, stdout, stderr, error: error.message, mode: useScript ? 'script-tty' : 'plain' });
    });
  });
}

(async () => {
  execFileSync('bash', ['release.sh', '--local'], {
    cwd: projectRoot,
    stdio: process.env.AGY_HUD_VERIFY_VERBOSE ? 'inherit' : 'ignore',
  });

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-hud-verify-'));
  const env = buildEnv(tmpRoot);
  const { server, url } = await startZipServer();
  try {
    const install = run(agyBin, ['plugin', 'install', url], { env, timeout: 120_000 });
    if (install.status !== 0 || !/\[ok\]/.test(install.stdout || '')) {
      fail('agy plugin install failed', {
        status: install.status,
        signal: install.signal,
        stdout: install.stdout,
        stderr: install.stderr,
        error: install.error && install.error.message,
      });
    }

    const afterInstall = readInstallState(env);

    // Two-step install: plugin install does not run JS. Bootstrap explicitly.
    const bootstrap = run(process.execPath, [path.join(projectRoot, 'scripts', 'bootstrap.js')], {
      env: { ...env, AGY_HUD_SETUP_SOURCE_DIR: projectRoot },
      timeout: 60_000,
    });
    if (bootstrap.status !== 0) {
      fail('agy-hud bootstrap failed', {
        status: bootstrap.status,
        stdout: bootstrap.stdout,
        stderr: bootstrap.stderr,
      });
    }

    const observation = await observeLocalAgy(env);
    const observedRaw = `${observation.stdout || ''}\n${observation.stderr || ''}`;
    const observedPlain = stripAnsi(observedRaw);
    const observedScreen = renderTerminalScreen(observedRaw);
    const afterObserve = readInstallState(env);
    const hudVisible = /AGY-HUD/.test(observedScreen);
    const streamHudPresent = /AGY-HUD/.test(observedPlain);
    const statusLineReady = Boolean(afterObserve.statusLine && /agy-hud/i.test(String(afterObserve.statusLine.command || '')));
    const runtimeReady = Boolean(afterObserve.runtimeHudExists);
    const displayReady = hudVisible && statusLineReady && runtimeReady;

    const report = {
      ok: displayReady,
      homeMode: currentHome ? 'current-home' : 'isolated-home',
      install: {
        status: install.status,
        processedSkills: /skills\s+:\s+\d+ processed/.test(stripAnsi(`${install.stdout}\n${install.stderr}`)),
      },
      bootstrap: {
        status: bootstrap.status,
      },
      afterInstall,
      observe: {
        mode: observation.mode,
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
    if (!displayReady) process.exit(1);
  } finally {
    server.close();
    if (!currentHome) fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
})().catch(error => {
  fail(error.stack || error.message);
});
