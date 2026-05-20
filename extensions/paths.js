'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Return all candidate antigravity-cli data roots, ordered by priority:
 *   1. ~/.gemini/antigravity-cli         (standard macOS/Linux install)
 *   2. $XDG_DATA_HOME/antigravity-cli    (Linux XDG override)
 *   3. $APPDATA/antigravity-cli          (Windows roaming)
 *   4. $LOCALAPPDATA/antigravity-cli     (Windows local)
 *
 * Unset env vars are filtered out so the list only contains usable paths.
 *
 * @returns {string[]}
 */
function getAntigravityRoots() {
  const candidates = [
    path.join(os.homedir(), '.gemini', 'antigravity-cli'),
    process.env.XDG_DATA_HOME
      ? path.join(process.env.XDG_DATA_HOME, 'antigravity-cli')
      : null,
    process.env.APPDATA
      ? path.join(process.env.APPDATA, 'antigravity-cli')
      : null,
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'antigravity-cli')
      : null,
  ];
  return candidates.filter(Boolean);
}

/**
 * Resolve a relative path under any of the candidate antigravity roots.
 * Returns the first candidate whose joined path exists on disk; if none exist,
 * returns the joined path under the first (highest-priority) candidate so
 * callers can still use it as a write target.
 *
 * @param {string} relativePath
 * @returns {string}
 */
function resolveAntigravityPath(relativePath) {
  const roots = getAntigravityRoots();
  for (const root of roots) {
    const candidate = path.join(root, relativePath);
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(roots[0], relativePath);
}

module.exports = {
  getAntigravityRoots,
  resolveAntigravityPath,
};
