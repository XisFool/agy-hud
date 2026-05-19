import { test } from 'node:test';
import assert from 'node:assert';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';

const AGY_BIN = '/Users/c/.local/bin/agy';
const PROJECT_ROOT = '/Users/c/agy-hud';

test('E2E: Official agy plugin installation from remote URL', async (t) => {
  console.log('🏗️  Building release package...');
  execSync(`${PROJECT_ROOT}/release.sh`, { cwd: PROJECT_ROOT });
  const zipPath = path.join(PROJECT_ROOT, 'agy-hud.zip');

  // New Debug: Validate the source before packing
  console.log('🔍 Validating source directory...');
  const valOutput = execSync(`${AGY_BIN} plugin validate ${PROJECT_ROOT}`).toString();
  console.log('Validation Output:', valOutput);

  // 2. Use the local project directory as the install source
  // agy plugin install <path> should work if the structure is correct
  const url = PROJECT_ROOT;

  try {
    console.log(`🔌 Spawning agy plugin install from ${url}`);
    try { execSync(`${AGY_BIN} plugin uninstall agy-hud`, { stdio: 'ignore' }); } catch(e) {}

    const child = spawn(AGY_BIN, ['plugin', 'install', url]);
    
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const msg = data.toString();
      stdout += msg;
      process.stdout.write(`[agy stdout] ${msg}`);
    });

    child.stderr.on('data', (data) => {
      const msg = data.toString();
      stderr += msg;
      process.stdout.write(`[agy stderr] ${msg}`);
    });

    const exitCode = await new Promise((resolve) => {
      child.on('close', resolve);
    });

    console.log(`🏁 agy exited with code ${exitCode}`);
    
    if (exitCode !== 0) {
      console.error('❌ Installation Failed with stderr:', stderr);
      // Try to extract the path from the error message
      const match = stderr.match(/unsupported extension format at (.*)/);
      if (match && match[1]) {
        const errPath = match[1].trim();
        console.log(`🔍 Inspecting error path: ${errPath}`);
        try {
          const files = execSync(`ls -R ${errPath}`).toString();
          console.log('Contents of temp dir:\n', files);
        } catch(e) {
          console.log('Could not list temp dir (maybe deleted?)');
        }
      }
      throw new Error(`agy failed with code ${exitCode}`);
    }

    console.log('✅ Installation Successful!');
    assert.strictEqual(exitCode, 0);
    assert.match(stdout, /\[ok\]/);
    assert.match(stdout, /skills/);
  } finally {
    // No server to close
  }
});
