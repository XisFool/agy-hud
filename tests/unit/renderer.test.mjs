import { test } from 'node:test';
import assert from 'node:assert';
import { renderHUD } from '../../renderer.js';

test('renderHUD should contain branch and steps', () => {
  const state = {
    steps: 42,
    branch: 'main'
  };
  const agyData = {
    context_window: {
      total_input_tokens: 15000,
      total_output_tokens: 5000,
      used_percentage: 12.5
    },
    plan_tier: 'Google AI Pro',
    task_count: 3
  };

  const output = renderHUD(state, agyData);
  assert.match(output, /main/);
  assert.match(output, /42/);
  assert.match(output, /15\.0k\(I\)/);
  assert.match(output, /Google AI Pro/);
});
