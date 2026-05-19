import { test } from 'node:test';
import assert from 'node:assert';
import { renderHUD } from '../../renderer.js';

test('renderHUD should contain branch and steps', () => {
  const state = {
    step_count: 42,
    tokens: 15000,
  };
  const config = { enabled: true };
  const gitInfo = { branch: 'main' };

  const output = renderHUD(state, config, gitInfo);
  assert.match(output, /main/);
  assert.match(output, /42/);
  assert.match(output, /15\.0k/);
});
