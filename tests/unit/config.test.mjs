import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../../runtime/config.js';

function withCwd(cwd, fn) {
  const previous = process.cwd();
  process.chdir(cwd);
  try {
    return fn();
  } finally {
    process.chdir(previous);
  }
}

test('loadConfig reads project-local config before plugin defaults', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-hud-config-local-'));
  try {
    fs.writeFileSync(path.join(tmp, 'agy-hud.config.json'), JSON.stringify({
      display: { columnWidth: 45 },
      enabled: false,
    }));

    const config = await withCwd(tmp, () => loadConfig());

    assert.equal(config.enabled, false);
    assert.deepEqual(config.display, { columnWidth: 45 });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('loadConfig falls back to bundled plugin config when local config is absent', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-hud-config-plugin-'));
  try {
    const config = await withCwd(tmp, () => loadConfig());

    assert.equal(config.enabled, true);
    assert.equal(config.thresholds.warning, 0.7);
    assert.equal(config.thresholds.critical, 0.9);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
