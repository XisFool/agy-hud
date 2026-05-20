#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getSessionState } = require('../parser.js');
const { renderHUD } = require('../renderer.js');
const { loadConfig } = require('../config.js');
const { getGitInfo } = require('../git.js');

const BASE_DIR = path.join(os.homedir(), '.gemini', 'antigravity-cli');
const BRAIN_DIR = path.join(BASE_DIR, 'brain');

async function run() {
  try {
    const config = await loadConfig();
    if (config.enabled === false) return;

    let convId = process.env.ANTIGRAVITY_CONVERSATION_ID || path.basename(process.cwd());
    let transcriptPath = path.join(BRAIN_DIR, convId, '.system_generated', 'logs', 'transcript.jsonl');

    if (!fs.existsSync(transcriptPath)) {
      // Fallback: try to find the most recently modified transcript in BRAIN_DIR
      const sessions = fs.readdirSync(BRAIN_DIR);
      let latestTime = 0;
      let latestPath = null;
      
      for (const s of sessions) {
        const p = path.join(BRAIN_DIR, s, '.system_generated', 'logs', 'transcript.jsonl');
        if (fs.existsSync(p)) {
          const mtime = fs.statSync(p).mtimeMs;
          if (mtime > latestTime) {
            latestTime = mtime;
            latestPath = p;
          }
        }
      }
      if (latestPath) transcriptPath = latestPath;
      else return;
    }

    const stats = fs.statSync(transcriptPath);
    const state = await getSessionState(transcriptPath, stats.size);
    const gitInfo = await getGitInfo();

    const hud = renderHUD(state, config, gitInfo);
    process.stdout.write(hud);
  } catch (err) {
    // Silent fail
  }
}

run();
