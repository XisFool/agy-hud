const fs = require('fs');
const path = require('path');
const { getSessionState } = require('../parser.js');
const { renderHUD } = require('../renderer.js');
const { loadConfig } = require('../config.js');
const { getGitInfo } = require('../git.js');

const os = require('os');

/**
 * @param {any} api 
 */
module.exports = async (api) => {
  const BASE_DIR = path.join(os.homedir(), '.gemini', 'antigravity-cli');
  const BRAIN_DIR = path.join(BASE_DIR, 'brain');

  async function updateHUD() {
    try {
      const config = await loadConfig();
      if (!config.enabled) return;

      const convId = process.env.ANTIGRAVITY_CONVERSATION_ID || path.basename(process.cwd());
      const transcriptPath = path.join(BRAIN_DIR, convId, '.system_generated', 'logs', 'transcript.jsonl');

      if (!fs.existsSync(transcriptPath)) return;

      const stats = fs.statSync(transcriptPath);
      const state = await getSessionState(transcriptPath, stats.size);
      const gitInfo = await getGitInfo();

      const hud = renderHUD(state, config, gitInfo);
      
      process.stdout.write('\x1b[2J\x1b[0;0H'); 
      process.stdout.write(hud + '\n');
    } catch (err) {
      // Silent fail
    }
  }

  if (api && typeof api.registerHook === 'function') {
    api.registerHook('on_step_complete', updateHUD);
  } else {
    updateHUD();
  }
};
