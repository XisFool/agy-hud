#!/usr/bin/env node
'use strict';

const { spawn, spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const target = process.env.AGY_HUD_E2E_TARGET;
const providedZipUrl = process.env.AGY_HUD_E2E_ZIP_URL;
const observeTimeoutMs = process.env.AGY_HUD_E2E_OBSERVE_TIMEOUT_MS || '22000';
const agyBin = process.env.AGY_HUD_E2E_AGY_BIN;
const providedSetupScriptUrl = process.env.AGY_HUD_E2E_SETUP_SCRIPT_URL;
const providedSetupSourceBase = process.env.AGY_HUD_E2E_SETUP_SOURCE_BASE;
const remoteEnv = (process.env.AGY_HUD_E2E_REMOTE_ENV || '')
  .split(/\r?\n/)
  .map(entry => entry.trim())
  .filter(Boolean);

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: options.env || process.env,
    stdio: options.stdio || 'inherit',
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
  return result;
}

function pickLanHost() {
  if (process.env.AGY_HUD_E2E_HOST) return process.env.AGY_HUD_E2E_HOST;

  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) return entry.address;
    }
  }
  return '127.0.0.1';
}

function startReleaseServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['scripts/serve-release.js', '--host', '0.0.0.0', '--file', 'agy-hud.zip'],
      { cwd: projectRoot, encoding: 'utf8' }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
      const line = stdout.split(/\r?\n/).find(Boolean);
      if (!line) return;
      try {
        const info = JSON.parse(line);
        const host = pickLanHost();
        resolve({
          child,
          url: `http://${host}:${info.port}${info.route}`,
        });
      } catch (error) {
        reject(error);
      }
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('exit', code => {
      if (code !== 0) reject(new Error(stderr || `serve-release exited with ${code}`));
    });
  });
}

function startSourceServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['scripts/serve-source.js', '--host', '0.0.0.0'],
      { cwd: projectRoot, encoding: 'utf8' }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
      const line = stdout.split(/\r?\n/).find(Boolean);
      if (!line) return;
      try {
        const info = JSON.parse(line);
        const host = pickLanHost();
        resolve({
          child,
          url: `http://${host}:${info.port}`,
        });
      } catch (error) {
        reject(error);
      }
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('exit', code => {
      if (code !== 0) reject(new Error(stderr || `serve-source exited with ${code}`));
    });
  });
}

async function main() {
  if (!target) {
    fail([
      'AGY_HUD_E2E_TARGET is required.',
      'Import-only checks are not E2E for agy-hud.',
      'Example: AGY_HUD_E2E_TARGET=14323@192.168.10.5 npm run e2e',
    ].join('\n'));
  }

  let releaseServer = null;
  let sourceServer = null;
  let zipUrl = providedZipUrl;
  let setupScriptUrl = providedSetupScriptUrl;
  let setupSourceBase = providedSetupSourceBase;
  try {
    if (!zipUrl) {
      run('./release.sh', ['--local'], {
        env: { ...process.env, SKIP_GH_RELEASE: 'true' },
      });
      releaseServer = await startReleaseServer();
      zipUrl = releaseServer.url;
    }

    if (!setupScriptUrl || !setupSourceBase) {
      sourceServer = await startSourceServer();
      setupSourceBase = setupSourceBase || sourceServer.url;
      setupScriptUrl = setupScriptUrl || `${sourceServer.url}/scripts/setup-runtime.js`;
    }

    const verifierArgs = [
      'scripts/verify-setup-display-remote.js',
      target,
      zipUrl,
      setupScriptUrl,
      '--reset-hud',
      `--observe-timeout-ms=${observeTimeoutMs}`,
    ];
    if (setupSourceBase) verifierArgs.push(`--setup-source-base=${setupSourceBase}`);
    if (agyBin) verifierArgs.push(`--agy-bin=${agyBin}`);
    for (const entry of remoteEnv) verifierArgs.push(`--remote-env=${entry}`);

    run(process.execPath, verifierArgs);
  } finally {
    if (releaseServer) releaseServer.child.kill('SIGTERM');
    if (sourceServer) sourceServer.child.kill('SIGTERM');
  }
}

main().catch(error => {
  fail(error.stack || error.message);
});
