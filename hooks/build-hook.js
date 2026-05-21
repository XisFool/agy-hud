#!/usr/bin/env node
// Compile hooks/inline-bootstrap.js into hooks/hooks.json.
//
// agy's hook runner ultimately invokes the `command` string in a shell.
// On Windows `cmd.exe` does NOT allow newlines inside double-quoted command
// arguments, so the inline source must be a single line. We strip comments
// and collapse whitespace to one line — every statement is already `;`-
// terminated in the source so the merged form stays valid JS.

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const HERE = __dirname;
const PROJECT_ROOT = path.resolve(HERE, '..');
const SOURCE = path.join(HERE, 'inline-bootstrap.js');
const TARGET = path.join(HERE, 'hooks.json');
const PKG = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));

// Normalize "git+https://..." to a clone-able URL; reject anything that isn't
// a real URL so we never ship a broken hook.
function getRepoUrl() {
  const raw = PKG.repository && PKG.repository.url;
  if (!raw) throw new Error('package.json is missing "repository.url"');
  const url = raw.replace(/^git\+/, '').replace(/\.git$/, '') + '.git';
  if (!/^https?:\/\//.test(url)) {
    throw new Error(`package.json repository.url must be an http(s) URL, got: ${raw}`);
  }
  return url;
}

function minify(source) {
  return source
    // strip whole-line `//` comments (only when they take a full line, to
    // avoid mangling `//` inside string literals — none in our source today)
    .split('\n')
    .filter(line => !/^\s*\/\//.test(line))
    .join('\n')
    // strip /* ... */ block comments (none inline-spanning right now)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // strip inline `// ...` trailing comments that don't sit in a string
    // (heuristic: keep it conservative — we don't use trailing comments in
    // inline-bootstrap.js so just skip this pass)
    // collapse all whitespace runs (incl. newlines) to a single space
    .replace(/\s+/g, ' ')
    .trim();
}

const rawSource = fs.readFileSync(SOURCE, 'utf8');
const repoUrl = getRepoUrl();
if (!rawSource.includes('__AGY_HUD_REPO_URL__')) {
  throw new Error('inline-bootstrap.js no longer contains the __AGY_HUD_REPO_URL__ placeholder');
}
const source = rawSource.replace(/__AGY_HUD_REPO_URL__/g, repoUrl);
const body = minify(source);
const encodedBody = zlib.deflateSync(Buffer.from(body, 'utf8')).toString('base64');
const loader = `eval(require('zlib').inflateSync(Buffer.from('${encodedBody}','base64')).toString('utf8'))`;

const hook = {
  post_invocation_hooks: [
    {
      name: 'agy-hud-configure-statusline',
      command: 'node -e ' + JSON.stringify(loader),
      timeout_ms: 60000,
    },
  ],
};

fs.writeFileSync(TARGET, JSON.stringify(hook, null, 2) + '\n', 'utf8');
console.log(`Wrote ${TARGET} (${body.length} bytes inline)`);
