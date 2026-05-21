const fs = require('fs');
const { execSync } = require('child_process');

/**
 * @typedef {Object} SessionState
 * @property {number} steps
 * @property {number} tokens
 * @property {string} branch
 * @property {Object} [usage]
 */

/**
 * Parses the transcript log to count steps and get branch info.
 * @param {string} transcriptPath
 * @returns {Promise<SessionState>}
 */
async function getSessionState(transcriptPath) {
  let steps = 0;
  let branch = 'main';

  try {
    const fileContent = fs.readFileSync(transcriptPath, 'utf8');
    for (const line of fileContent.split('\n')) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        if (entry.step_index > steps) {
          steps = entry.step_index;
        }
      } catch {
        // Skip invalid JSON lines
      }
    }
  } catch {
    // File might not exist yet
  }

  try {
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    branch = gitBranch;
  } catch {
    // Not a git repo or git not found
  }

  return { steps, branch };
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
