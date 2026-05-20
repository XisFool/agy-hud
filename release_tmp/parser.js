const fs = require('fs');
const readline = require('readline');

async function getSessionState(logPath, fileSize) {
  const stream = fs.createReadStream(logPath, { start: Math.max(0, fileSize - 50000) });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let state = {
    step_count: 0,
    tokens: 0,
    last_action: 'Idle',
    current_task: 'N/A'
  };

  for await (const line of rl) {
    try {
      const entry = JSON.parse(line);
      if (entry.type === 'PLANNER_RESPONSE') state.step_count++;
      if (entry.tokens) state.tokens += entry.tokens;
    } catch (e) {}
  }

  return state;
}

module.exports = { getSessionState };
