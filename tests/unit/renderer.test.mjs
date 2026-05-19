import { test } from 'node:test';
import assert from 'node:assert';
import { renderHUD } from '../../src/renderer.mjs';

test('renderHUD should contain breadcrumbs and status', () => {
  const state = {
    lastTool: 'write_file',
    status: 'BUSY',
    breadcrumb: ['list_dir', 'grep_search', 'write_file']
  };
  const config = { 
    theme: { primary: 'green', secondary: 'gray', critical: 'red', warning: 'yellow' },
    display: { showTokenBar: true, showBreadcrumbs: true },
    thresholds: { warning: 0.7, critical: 0.9 }
  };
  
  const output = renderHUD(state, config, 'en');
  assert.match(output, /BUSY/);
  assert.match(output, /list_dir ➜ grep_search ➜ write_file/);
});

test('renderHUD should support Chinese labels', () => {
  const state = { status: 'READY', breadcrumb: [] };
  const config = { 
    theme: { primary: 'green', secondary: 'gray', critical: 'red', warning: 'yellow' },
    display: { showTokenBar: true, showBreadcrumbs: true },
    thresholds: { warning: 0.7, critical: 0.9 }
  };
  const output = renderHUD(state, config, 'zh');
  assert.match(output, /就绪/); // READY in Chinese
});
