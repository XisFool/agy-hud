import { test } from 'node:test';
import assert from 'node:assert';
import { parseLogLine, getSessionState } from '../../src/parser.mjs';

test('parseLogLine should correctly identify model actions', () => {
  const line = JSON.stringify({
    source: 'MODEL',
    type: 'PLANNER_RESPONSE',
    tool_calls: [{ name: 'grep_search', args: {} }]
  });
  
  const result = parseLogLine(line);
  assert.strictEqual(result.tool, 'grep_search');
  assert.strictEqual(result.state, 'BUSY');
});

test('getSessionState should rebuild state from multiple lines', () => {
  const lines = [
    { source: 'USER_EXPLICIT', content: 'hello' },
    { source: 'MODEL', type: 'PLANNER_RESPONSE', tool_calls: [{ name: 'list_dir' }] },
    { source: 'SYSTEM', type: 'LIST_DIRECTORY', content: 'file list' }
  ].map(l => JSON.stringify(l));

  const state = getSessionState(lines, '/Users/c/agy-hud/tests/unit/parser.test.mjs');
  assert.strictEqual(state.lastTool, 'list_dir');
  assert.strictEqual(state.status, 'READY'); 
});
