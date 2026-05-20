#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { getSessionState, parseAgyInput } = require('../parser.js');
const { renderHUD } = require('../renderer.js');
const { loadConfig } = require('../config.js');
const { getQuota } = require('../quota.js');

async function main() {
  const stdinData = [];
  
  // Set a timeout for stdin to avoid hanging if no data is piped
  const timeout = setTimeout(() => {
    process.exit(0);
  }, 1000);

  process.stdin.on('data', chunk => {
    stdinData.push(chunk);
    clearTimeout(timeout);
  });

  process.stdin.on('end', async () => {
    const inputStr = Buffer.concat(stdinData).toString();
    if (!inputStr.trim()) {
      process.exit(0);
    }

    const agyData = parseAgyInput(inputStr);
    
    // Fallback transcript path if not provided in stdin
    const transcriptPath = agyData?.transcript_path || 
      path.join(os.homedir(), '.gemini', 'antigravity-cli', 'brain',
      agyData?.conversation_id || '', '.system_generated', 'logs', 'transcript.jsonl');

    try {
      const stats = fs.existsSync(transcriptPath) ? fs.statSync(transcriptPath) : { size: 0 };
      const [state, config, quotaData] = await Promise.all([
        getSessionState(transcriptPath, stats.size),
        loadConfig(),
        getQuota().catch(() => []),
      ]);
      
      const hudOutput = renderHUD(state, agyData, config, quotaData);
      process.stdout.write(hudOutput);
    } catch (err) {
      // Quietly fail for HUD
    }
  });
}

main();
