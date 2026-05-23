#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const os = require('os');
const path = require('path');

const DEFAULT_SOURCE_BASE = 'https://raw.githubusercontent.com/icebear0828/agy-hud/main';

const RUNTIME_FILES = [
  'package.json',
  'runtime/agy-hud.config.json',
  'runtime/bin/agy-hud.js',
  'runtime/config.js',
  'runtime/encoding.js',
  'runtime/parser.js',
  'runtime/paths.js',
  'runtime/quota.js',
  'runtime/renderer.js',
  'runtime/statusline-installer.js',
  'runtime/uninstall.js',
];

function getAntigravityRoots(env = process.env, homeDir = os.homedir()) {
  return [
    path.join(homeDir, '.gemini', 'antigravity-cli'),
    env.XDG_DATA_HOME ? path.join(env.XDG_DATA_HOME, 'antigravity-cli') : null,
    env.APPDATA ? path.join(env.APPDATA, 'antigravity-cli') : null,
    env.LOCALAPPDATA ? path.join(env.LOCALAPPDATA, 'antigravity-cli') : null,
  ].filter(Boolean);
}

function pickAntigravityRoot(env = process.env, homeDir = os.homedir()) {
  const roots = getAntigravityRoots(env, homeDir);
  for (const root of roots) {
    if (fs.existsSync(path.join(root, 'plugins', 'agy-hud', 'plugin.json'))) {
      return root;
    }
  }
  for (const root of roots) {
    if (fs.existsSync(path.join(root, 'settings.json'))) return root;
  }
  return roots[0];
}

function sourceUrl(sourceBase, relativePath) {
  return `${sourceBase.replace(/\/+$/, '')}/${relativePath}`;
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
        reject(new Error(`download failed (${status}): ${url}`));
        return;
      }

      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.setTimeout(30_000, () => {
      req.destroy(new Error(`download timed out: ${url}`));
    });
    req.on('error', reject);
  });
}

async function readRuntimeFile(relativePath, options) {
  if (options.sourceDir) {
    return fs.readFileSync(path.join(options.sourceDir, ...relativePath.split('/')));
  }
  return requestBuffer(sourceUrl(options.sourceBase, relativePath));
}

async function installRuntime(options = {}) {
  const env = options.env || process.env;
  const homeDir = options.homeDir || os.homedir();
  const sourceDir = options.sourceDir || env.AGY_HUD_SETUP_SOURCE_DIR || '';
  const sourceBase = options.sourceBase || env.AGY_HUD_REPO_RAW || env.AGY_HUD_SETUP_SOURCE_BASE || DEFAULT_SOURCE_BASE;
  const antigravityRoot = options.antigravityRoot || pickAntigravityRoot(env, homeDir);
  const runtimeDir = path.join(antigravityRoot, 'agy-hud-runtime');

  fs.rmSync(runtimeDir, { recursive: true, force: true });

  for (const relativePath of RUNTIME_FILES) {
    const body = await readRuntimeFile(relativePath, { sourceDir, sourceBase });
    const target = path.join(runtimeDir, ...relativePath.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, body);
  }

  const installerPath = path.join(runtimeDir, 'runtime', 'statusline-installer.js');
  delete require.cache[require.resolve(installerPath)];
  const { configureStatusLine } = require(installerPath);
  const result = configureStatusLine(path.join(runtimeDir, 'runtime'), {
    settingsPath: path.join(antigravityRoot, 'settings.json'),
  });
  const quotaRefresh = await refreshQuotaCache(runtimeDir, { env, homeDir });

  return {
    antigravityRoot,
    runtimeDir,
    settingsPath: result.settingsPath,
    command: result.command,
    files: RUNTIME_FILES,
    quotaRefresh,
  };
}

async function refreshQuotaCache(runtimeDir, options = {}) {
  try {
    const quotaPath = path.join(runtimeDir, 'runtime', 'quota.js');
    delete require.cache[require.resolve(quotaPath)];
    const { readToken, fetchQuotaFromCloud, writeCache, isTokenExpired } = require(quotaPath);
    const roots = getAntigravityRoots(options.env || process.env, options.homeDir || os.homedir());
    const token = readToken({ roots });
    if (!token) return { status: 'skipped', reason: 'not_logged_in' };
    if (isTokenExpired(token)) return { status: 'skipped', reason: 'expired_token' };

    const quota = await fetchQuotaFromCloud(token.accessToken);
    if (!Array.isArray(quota) || quota.length === 0) {
      return {
        status: 'skipped',
        reason: quota && quota.unavailableReason ? quota.unavailableReason : 'empty_quota',
      };
    }

    writeCache(quota, token);
    return { status: 'refreshed', count: quota.length };
  } catch (error) {
    return { status: 'failed', reason: error.message };
  }
}

if (require.main === module) {
  installRuntime()
    .then(result => {
      process.stdout.write(`AGY-HUD bootstrap complete\n`);
      process.stdout.write(`runtime: ${result.runtimeDir}\n`);
      process.stdout.write(`settings: ${result.settingsPath}\n`);
      process.stdout.write(`statusLine: ${result.command}\n`);
      if (result.quotaRefresh.status === 'refreshed') {
        process.stdout.write(`quota: refreshed ${result.quotaRefresh.count}\n`);
      } else {
        process.stdout.write(`quota: ${result.quotaRefresh.status} ${result.quotaRefresh.reason || ''}\n`);
      }
    })
    .catch(error => {
      process.stderr.write(`${error.stack || error.message}\n`);
      process.exit(1);
    });
}

module.exports = {
  DEFAULT_SOURCE_BASE,
  RUNTIME_FILES,
  getAntigravityRoots,
  pickAntigravityRoot,
  installRuntime,
  refreshQuotaCache,
};
