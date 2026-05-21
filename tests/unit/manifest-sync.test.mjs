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

test('plugin.json and gemini-extension.json skills arrays stay in sync', () => {
  const plugin = readManifest('plugin.json');
  const gemini = readManifest('gemini-extension.json');

  assert.deepEqual(
    [...plugin.pi.skills].sort(),
    [...gemini.pi.skills].sort(),
    'skills arrays diverged - remote install reads gemini-extension.json strictly'
  );
});

test('manifests do not claim agy will import extension entrypoints', () => {
  const plugin = readManifest('plugin.json');
  const gemini = readManifest('gemini-extension.json');

  assert.equal(plugin.pi.extensions, undefined, 'agy plugin install does not stage pi.extensions as an install component');
  assert.equal(gemini.pi.extensions, undefined, 'agy plugin install does not stage pi.extensions as an install component');
});

test('manifests use skills instead of remote-ignored commands', () => {
  const plugin = readManifest('plugin.json');
  const gemini = readManifest('gemini-extension.json');

  assert.equal(plugin.commands, undefined, 'plugin.json must not rely on commands for remote install');
  assert.equal(gemini.commands, undefined, 'gemini-extension.json must not rely on commands for remote install');
  assert.equal(plugin.mcpServers, undefined, 'plugin.json must not rely on MCP startup as install-time setup');
  assert.equal(gemini.mcpServers, undefined, 'gemini-extension.json must not rely on MCP startup as install-time setup');
});

test('setup skill is packaged for remote installs', () => {
  const setupSkill = path.join(projectRoot, 'skills', 'setup', 'SKILL.md');
  assert.ok(fs.existsSync(setupSkill), 'skills/setup/SKILL.md must exist for agy-hud setup');

  const plugin = readManifest('plugin.json');
  assert.ok(plugin.pi.skills.includes('skills/*/SKILL.md'), 'plugin.json must list skills/*/SKILL.md');

  const gemini = readManifest('gemini-extension.json');
  assert.ok(gemini.pi.skills.includes('skills/*/SKILL.md'), 'gemini-extension.json must list skills/*/SKILL.md');

  const pkg = readManifest('package.json');
  assert.ok(pkg.files.includes('skills'), 'package.json files must include skills');

  const releaseScript = fs.readFileSync(path.join(projectRoot, 'release.sh'), 'utf8');
  assert.match(releaseScript, /cp -r skills release_tmp\//);
  assert.doesNotMatch(releaseScript, /cp -r commands release_tmp\//);
  assert.doesNotMatch(releaseScript, /mcp_config\.json/);
  assert.doesNotMatch(releaseScript, /cp -r mcp release_tmp\//);
  assert.doesNotMatch(releaseScript, /cp -r hooks release_tmp\//);
});

test('setup skill downloads runtime and configures statusLine without cloning the repo', () => {
  const setupSkill = fs.readFileSync(path.join(projectRoot, 'skills', 'setup', 'SKILL.md'), 'utf8');

  assert.match(setupSkill, /Configure agy-hud/i);
  assert.match(setupSkill, /scripts\/setup-runtime\.js/);
  assert.match(setupSkill, /settings\.statusLine/);
  assert.match(setupSkill, /agy-hud-runtime/);
  assert.doesNotMatch(setupSkill, /Execute the installed `PostInvocation`/);
  assert.doesNotMatch(setupSkill, /execSync/);
  assert.doesNotMatch(setupSkill, /git clone https:\/\/github\.com\/icebear0828\/agy-hud\.git/);
});

test('release package does not ship hook bootstrap as installation automation', () => {
  const pkg = readManifest('package.json');
  const releaseScript = fs.readFileSync(path.join(projectRoot, 'release.sh'), 'utf8');

  assert.ok(!pkg.files.includes('hooks'), 'remote hooks are not a valid install-time HUD setup path');
  assert.equal(pkg.scripts['build:hook'], undefined);
  assert.doesNotMatch(releaseScript, /hooks\/build-hook\.js/);
  assert.doesNotMatch(releaseScript, /hooks/);
});
