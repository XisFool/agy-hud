const fs = require('fs');
const { execFileSync } = require('child_process');
const { resolveSafeExecutable } = require('./paths.js');

/**
 * @typedef {Object} SessionState
 * @property {number} steps
 * @property {number} tokens
 * @property {string} branch
 * @property {Object} [usage]
 */

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isContextWindow(value) {
  return isObject(value) && (
    Object.hasOwn(value, 'total_input_tokens') ||
    Object.hasOwn(value, 'total_output_tokens') ||
    Object.hasOwn(value, 'context_window_size') ||
    Object.hasOwn(value, 'used_percentage') ||
    isObject(value.current_usage)
  );
}

function findContextWindow(value, depth = 0) {
  if (!isObject(value) || depth > 4) return null;
  if (isContextWindow(value.context_window)) return value.context_window;
  if (isContextWindow(value)) return value;

  for (const child of Object.values(value)) {
    const found = findContextWindow(child, depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * Parses the transcript log to count steps and get branch info.
 * @param {string} transcriptPath
 * @returns {Promise<SessionState>}
 */
async function getSessionState(transcriptPath) {
  let steps = 0;
  let branch = 'main';
  let usage;

  try {
    const fileContent = fs.readFileSync(transcriptPath, 'utf8');
    for (const line of fileContent.split('\n')) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        if (entry.step_index > steps) {
          steps = entry.step_index;
        }
        const contextWindow = findContextWindow(entry);
        if (contextWindow) {
          usage = contextWindow;
        }
      } catch {
        // Skip invalid JSON lines
      }
    }
  } catch {
    // File might not exist yet
  }

  try {
    const gitPath = resolveSafeExecutable('git');
    if (gitPath) {
      const gitBranch = execFileSync(gitPath, ['rev-parse', '--abbrev-ref', 'HEAD'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      branch = gitBranch;
    }
  } catch {
    // Not a git repo or git not found
  }

  return usage ? { steps, branch, usage } : { steps, branch };
}

/**
 * Parses the stdin JSON data provided by agy.
 * @param {string} jsonStr
 * @returns {Object|null}
 */
function parseAgyInput(jsonStr) {
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

module.exports = {
  getSessionState,
  parseAgyInput
};
