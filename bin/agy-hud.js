#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { getSessionState, parseAgyInput } = require('../parser.js');
const { renderHUD } = require('../renderer.js');

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
      path.join(process.env.HOME, '.gemini/antigravity-cli/brain', 
      agyData?.conversation_id || '', '.system_generated/logs/transcript.jsonl');

    try {
      const stats = fs.existsSync(transcriptPath) ? fs.statSync(transcriptPath) : { size: 0 };
      const state = await getSessionState(transcriptPath, stats.size);
      
      const hudOutput = renderHUD(state, agyData);
      process.stdout.write(hudOutput);
    } catch (err) {
      // Quietly fail for HUD
    }
  });
}

main();
