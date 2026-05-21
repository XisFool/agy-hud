import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { BUNDLE_FILES, buildBundle, buildRemoteProgram } = require('../../scripts/diagnose-auth-remote.js');

test('remote auth diagnostic bundles the CLI and reused modules', () => {
  const bundle = buildBundle();
  const bundledPaths = bundle.files.map(file => file.path);

  assert.deepEqual(bundledPaths, BUNDLE_FILES);
  assert.ok(bundledPaths.includes('scripts/diagnose-auth.js'));
  assert.ok(bundledPaths.includes('extensions/quota.js'));
  assert.ok(bundledPaths.includes('extensions/paths.js'));
});

test('remote auth diagnostic program runs the bundled CLI instead of inline checks', () => {
  const program = buildRemoteProgram({
    files: [
      {
        path: 'scripts/diagnose-auth.js',
        content: Buffer.from('process.stdout.write("ok")').toString('base64'),
      },
    ],
  });

  assert.match(program, /scripts['"], ['"]diagnose-auth\.js/);
  assert.doesNotMatch(program, /oauth_creds\.json/);
  assert.doesNotMatch(program, /antigravity-oauth-token/);
});
