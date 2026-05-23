#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveAntigravityPath, getAntigravityRoots } = require('./paths.js');

function isOurStatusLineCommand(command, runtimeDir) {
  if (!command) return false;
  // Match either the unix node-prefixed form or the windows .cmd shim form,
  // and only when the command points into our runtime tree.
  return command.includes(runtimeDir);
}

function clearStatusLine(settingsPath, runtimeDir) {
  if (!fs.existsSync(settingsPath)) {
    return { changed: false, reason: 'no_settings' };
  }
  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    return { changed: false, reason: 'parse_error' };
  }
  const current = settings && settings.statusLine && settings.statusLine.command;
  if (!current) return { changed: false, reason: 'no_status_line' };
  if (!isOurStatusLineCommand(current, runtimeDir)) {
    return { changed: false, reason: 'foreign_status_line' };
  }
  fs.copyFileSync(settingsPath, settingsPath + '.bak');
  delete settings.statusLine;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  return { changed: true };
}

function removeRuntimeDir(runtimeDir) {
  if (!fs.existsSync(runtimeDir)) return { removed: false, reason: 'not_present' };
  fs.rmSync(runtimeDir, { recursive: true, force: true });
  return { removed: true };
}

function removeTokenMirrors() {
  const removed = [];
  const candidates = [
    path.join(os.tmpdir(), 'agy-hud-token.json'),
    path.join(os.tmpdir(), 'agy-hud-quota-cache.json'),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        removed.push(file);
      } catch {
        // best-effort
      }
    }
  }
  return removed;
}

function uninstall(options = {}) {
  const env = options.env || process.env;
  const homeDir = options.homeDir || os.homedir();
  // Search all candidate roots — uninstall should clean any root we may have
  // touched, not just the first one we'd pick today.
  const roots = options.roots || getAntigravityRoots(env, homeDir);
  const settingsPath = options.settingsPath || resolveAntigravityPath('settings.json');

  const results = { settingsPath, statusLine: null, runtimes: [], tokenMirrors: [] };

  for (const root of roots) {
    const runtimeDir = path.join(root, 'agy-hud-runtime');
    const runtimeResult = removeRuntimeDir(runtimeDir);
    results.runtimes.push({ runtimeDir, ...runtimeResult });
    // Best-effort clear for each root's settings.json (most installs only have one).
    const rootSettings = path.join(root, 'settings.json');
    if (rootSettings !== settingsPath) {
      results.runtimes.push({ runtimeDir: rootSettings, ...clearStatusLine(rootSettings, runtimeDir) });
    }
  }

  // Primary settings.json cleared against the active runtime path.
  const activeRuntimeDir = path.join(path.dirname(settingsPath), 'agy-hud-runtime');
  results.statusLine = clearStatusLine(settingsPath, activeRuntimeDir);
  results.tokenMirrors = removeTokenMirrors();

  return results;
}

if (require.main === module) {
  const result = uninstall();
  process.stdout.write(`AGY-HUD uninstall complete\n`);
  process.stdout.write(`settings: ${result.settingsPath} (${result.statusLine.changed ? 'cleared' : result.statusLine.reason})\n`);
  for (const r of result.runtimes) {
    if (r.removed) process.stdout.write(`runtime removed: ${r.runtimeDir}\n`);
  }
  for (const f of result.tokenMirrors) {
    process.stdout.write(`token mirror removed: ${f}\n`);
  }
}

module.exports = {
  isOurStatusLineCommand,
  clearStatusLine,
  removeRuntimeDir,
  removeTokenMirrors,
  uninstall,
};
