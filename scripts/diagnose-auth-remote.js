#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const BUNDLE_FILES = [
  'scripts/diagnose-auth.js',
  'extensions/quota.js',
  'extensions/paths.js',
  'extensions/config.js',
  'package.json',
];

function readBundleFile(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  return {
    path: relativePath,
    content: fs.readFileSync(absolutePath).toString('base64'),
  };
}

function buildBundle() {
  return {
    files: BUNDLE_FILES.map(readBundleFile),
  };
}

function buildRemoteProgram(bundle) {
  return `'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const bundle = ${JSON.stringify(bundle)};
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-hud-diagnose-'));
try {
  for (const file of bundle.files) {
    const target = path.join(root, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.from(file.content, 'base64'));
  }
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'diagnose-auth.js')], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status === null ? 1 : result.status);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
`;
}

function runRemoteDiagnostic(target) {
  const result = spawnSync('ssh', [target, 'node', '-'], {
    input: buildRemoteProgram(buildBundle()),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return result;
}

function main() {
  const target = process.argv[2];
  if (!target || process.argv.includes('--help') || process.argv.includes('-h')) {
    process.stderr.write('Usage: node scripts/diagnose-auth-remote.js <ssh-target>\n');
    process.exit(target ? 0 : 2);
  }

  const result = runRemoteDiagnostic(target);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status === null ? 1 : result.status);
}

if (require.main === module) main();

module.exports = {
  BUNDLE_FILES,
  buildBundle,
  buildRemoteProgram,
  runRemoteDiagnostic,
};
