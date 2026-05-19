import fs from 'fs';

/**
 * Parses a single JSONL log line from Antigravity transcript.
 */
export function parseLogLine(line) {
  try {
    const data = JSON.parse(line);
    if (data.source === 'MODEL') {
      if (data.type === 'PLANNER_RESPONSE' && data.tool_calls) {
        return { tool: data.tool_calls[0].name, state: 'BUSY' };
      }
      if (data.thinking) {
        return { tool: null, state: 'THINKING' };
      }
    }
    if (data.source === 'SYSTEM' || data.source === 'USER_EXPLICIT') {
      return { tool: null, state: 'READY' };
    }
  } catch (e) {
    // Ignore malformed lines
  }
  return { tool: null, state: 'IDLE' };
}

/**
 * Rebuilds the session state from an array of log lines.
 */
export function getSessionState(lines, logPath) {
  let state = {
    lastTool: null,
    status: 'IDLE',
    breadcrumb: []
  };

  // Calculate token estimation based on log size
  const stats = fs.statSync(logPath);
  const logSizeKb = stats.size / 1024;
  // Heuristic: 1KB of JSONL is roughly 0.5% - 1% of a standard context buffer
  state.tokenPercent = Math.min(0.99, logSizeKb / 512); 

  for (const line of lines) {
    const parsed = parseLogLine(line);
    if (parsed.state === 'BUSY') {
      state.lastTool = parsed.tool;
      state.status = 'BUSY';
      // Only push if different from last tool to keep it clean
      if (state.breadcrumb[state.breadcrumb.length - 1] !== parsed.tool) {
        state.breadcrumb.push(parsed.tool);
      }
    } else if (parsed.state === 'READY') {
      state.status = 'READY';
    } else if (parsed.state === 'THINKING') {
      state.status = 'THINKING';
    }
  }

  // Keep breadcrumb concise (last 3 unique tools)
  state.breadcrumb = state.breadcrumb.slice(-3);
  
  return state;
}
