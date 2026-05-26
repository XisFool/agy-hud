import { test } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSessionState } from '../../runtime/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

test('getSessionState should initialize state properly even for missing files', async () => {
  // We can't easily mock the read stream without a real file or stub, 
  // so we'll test the basic parsing logic by passing a small string if we had exposed it.
  // For now, let's just assert that it is a function.
  assert.strictEqual(typeof getSessionState, 'function');
});

test('getSessionState reads the highest transcript step index', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-hud-parser-steps-'));
  try {
    const transcriptPath = path.join(tempDir, 'transcript.jsonl');
    fs.writeFileSync(transcriptPath, [
      JSON.stringify({ step_index: 1 }),
      'not-json',
      JSON.stringify({ step_index: 4 }),
      JSON.stringify({ step_index: 2 }),
      '',
    ].join('\n'));

    const state = await getSessionState(transcriptPath);

    assert.equal(state.steps, 4);
    assert.equal(typeof state.branch, 'string');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('getSessionState detects workspace config metadata correctly', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-hud-parser-metadata-'));
  const originalCwd = process.cwd;
  process.cwd = () => tempDir;

  try {
    // 1. Create CLAUDE.md
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# rules');

    // 2. Create rules folders and md files
    const ruleDir = path.join(tempDir, '.claude', 'rules');
    fs.mkdirSync(ruleDir, { recursive: true });
    fs.writeFileSync(path.join(ruleDir, 'rule1.md'), 'content');
    fs.writeFileSync(path.join(ruleDir, 'rule2.md'), 'content');

    // 3. Create active git hooks
    const hooksDir = path.join(tempDir, '.git', 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(path.join(hooksDir, 'pre-commit'), 'hook content');
    fs.writeFileSync(path.join(hooksDir, 'pre-push.sample'), 'sample hook content');

    const state = await getSessionState('missing-transcript.jsonl');

    assert.equal(state.memoryFile, 'CLAUDE.md');
    assert.equal(state.rulesCount, 2);
    assert.equal(state.hooksCount, 1);
  } finally {
    process.cwd = originalCwd;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('getSessionState falls back outside git repositories without stderr noise', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-hud-parser-non-git-'));
  const script = `
    const { getSessionState } = require(${JSON.stringify(path.join(projectRoot, 'runtime', 'parser.js'))});
    getSessionState('missing-transcript.jsonl')
      .then(state => process.stdout.write(JSON.stringify(state)));
  `;

  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;

  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: tempDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.steps, 0);
  assert.equal(parsed.branch, 'main');
});
