import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

function readManifest(name) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, name), 'utf8'));
}

test('plugin.json and gemini-extension.json extensions arrays stay in sync', () => {
  const plugin = readManifest('plugin.json');
  const gemini = readManifest('gemini-extension.json');

  assert.deepEqual(
    [...plugin.pi.extensions].sort(),
    [...gemini.pi.extensions].sort(),
    'extensions arrays diverged — keep plugin.json and gemini-extension.json in sync'
  );
});

test('every manifest-listed extension file exists on disk', () => {
  const plugin = readManifest('plugin.json');
  for (const rel of plugin.pi.extensions) {
    const abs = path.join(projectRoot, rel);
    assert.ok(fs.existsSync(abs), `manifest references missing file: ${rel}`);
  }
});
