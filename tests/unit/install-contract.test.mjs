import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

test('docs present setup skill as the explicit second install step', () => {
  const docs = [
    readText('README.md'),
    readText('README_zh.md'),
    readText('skills/setup/SKILL.md'),
  ].join('\n');

  assert.match(docs, /Use the agy-hud setup skill/i);
  assert.match(docs, /settings\.statusLine/);
  assert.match(docs, /agy-hud-runtime/);
  assert.match(docs, /scripts\/setup-runtime\.js/);
  assert.match(docs, /直接运行 HUD 命令/);
  assert.match(docs, /未登录页不是稳定验收标准/);
  assert.match(docs, /direct\s+HUD command check/);
  assert.match(docs, /signed-in `agy` observation/);
  assert.doesNotMatch(docs, /只执行这一条 `agy plugin install`，然后打开一个新的 `agy` 会话就能看到 `AGY-HUD`/);
  assert.doesNotMatch(docs, /Execute the installed `PostInvocation` bootstrap command once/);
  assert.doesNotMatch(docs, /安装后手动触发配置/);
  assert.doesNotMatch(docs, /setup did not write settings\.statusLine/);
  assert.doesNotMatch(docs, /MCP server.*启动时自动.*settings\.statusLine/i);
  assert.doesNotMatch(docs, /启动时自动准备 runtime 并写入 `settings\.statusLine`/);
});

test('docs record current agy 1.0.1 install-only limitation and setup-mode boundary', () => {
  const docs = [
    readText('README.md'),
    readText('README_zh.md'),
  ].join('\n');

  assert.match(docs, /1\.0\.0\/1\.0\.1/);
  assert.match(docs, /skills\/agents/);
  assert.match(docs, /`rules`、`commands`、`pi: "extensions\/index\.js"` 和 `pi\.extensions` 不会被处理/);
  assert.match(docs, /首次启动前写入 `settings\.statusLine`/);
  assert.match(docs, /setup skill/);
  assert.match(docs, /两步安装/);
  assert.match(docs, /已经配置好的机器不能作为干净安装证据/);
  assert.match(docs, /AGY_HUD_E2E_REMOTE_ENV='HOME=\/tmp\/agy-hud-clean'/);
});

test('docs explain Windows Credential Manager stores refresh token', () => {
  const docs = [
    readText('README.md'),
    readText('README_zh.md'),
  ].join('\n');

  assert.match(docs, /Windows Credential Manager/);
  assert.match(docs, /gemini:antigravity/);
  assert.match(docs, /LegacyGeneric:target=gemini:antigravity/);
  assert.match(docs, /refresh_token/);
  assert.match(docs, /RT/);
  assert.match(docs, /不会用 RT 换新的 access token/);
});

test('verification scripts do not execute installed hooks or statusLine commands as setup', () => {
  const scripts = [
    readText('scripts/verify-install-display.js'),
    readText('scripts/verify-install-display-remote.js'),
    readText('scripts/verify-setup-display-remote.js'),
  ].join('\n');

  assert.doesNotMatch(scripts, /cp\.execSync\(hook\.command/);
  assert.doesNotMatch(scripts, /spawn\(hookCommand/);
  assert.doesNotMatch(scripts, /execSync\(tempSettings\.statusLine\.command/);
  assert.doesNotMatch(scripts, /run\(settings\.statusLine\.command/);
  assert.doesNotMatch(scripts, /--no-assert-hud/);
});

test('npm e2e runs setup-mode display verification instead of import-only checks', () => {
  const pkg = readJson('package.json');
  const runner = readText('scripts/run-e2e.js');

  assert.equal(pkg.scripts.e2e, 'node scripts/run-e2e.js');
  assert.equal(pkg.scripts['setup:runtime'], 'node scripts/setup-runtime.js');
  assert.equal(pkg.scripts['verify:setup-display:remote'], 'node scripts/verify-setup-display-remote.js');
  assert.equal(pkg.scripts['serve:source'], 'node scripts/serve-source.js');
  assert.match(runner, /AGY_HUD_E2E_TARGET/);
  assert.match(runner, /verify-setup-display-remote\.js/);
  assert.match(runner, /serve-source\.js/);
  assert.match(runner, /AGY_HUD_E2E_SETUP_SOURCE_BASE/);
  assert.match(runner, /AGY_HUD_E2E_SETUP_SCRIPT_URL/);
  assert.match(runner, /--reset-hud/);
  assert.match(runner, /Import-only checks are not E2E/);
  assert.match(runner, /AGY_HUD_E2E_AGY_BIN/);
  assert.match(runner, /AGY_HUD_E2E_REMOTE_ENV/);
  assert.doesNotMatch(runner, /tests\/e2e/);
});

test('remote display verifier observes agy instead of requiring print-mode auth', () => {
  const remoteVerifier = [
    readText('scripts/verify-install-display-remote.js'),
    readText('scripts/verify-setup-display-remote.js'),
  ].join('\n');

  assert.doesNotMatch(remoteVerifier, /\['-p',/);
  assert.doesNotMatch(remoteVerifier, /Authentication required.*cannot verify/i);
  assert.match(remoteVerifier, /ssh.*-tt/s);
});

test('remote display verifier can run against an isolated remote HOME', () => {
  const remoteVerifier = [
    readText('scripts/verify-install-display-remote.js'),
    readText('scripts/verify-setup-display-remote.js'),
  ].join('\n');

  assert.match(remoteVerifier, /--remote-env=KEY=VALUE/);
  assert.match(remoteVerifier, /--agy-bin=\/path\/to\/agy/);
  assert.match(remoteVerifier, /function remoteCommand/);
  assert.doesNotMatch(remoteVerifier, /setup\.sh/);
  assert.doesNotMatch(remoteVerifier, /install-statusline\.js/);
});

test('display verifiers require HUD output and installed statusLine state', () => {
  const verifiers = [
    readText('scripts/verify-install-display.js'),
    readText('scripts/verify-install-display-remote.js'),
    readText('scripts/verify-setup-display-remote.js'),
  ].join('\n');

  assert.match(verifiers, /hudVisible/);
  assert.match(verifiers, /statusLineCommandVisible/);
  assert.match(verifiers, /commandReady/);
  assert.match(verifiers, /statusLineReady/);
  assert.match(verifiers, /runtimeReady/);
  assert.match(verifiers, /displayReady/);
  assert.match(
    readText('scripts/verify-setup-display-remote.js'),
    /const displayReady = hudVisible && commandReady && statusLineReady && runtimeReady;/
  );
});

test('installer capability probes cover commands and post-invocation hooks', () => {
  const probeScript = readText('scripts/probe-agy-install-capabilities.js');

  assert.match(probeScript, /name: 'gemini-pi-commands'/);
  assert.match(probeScript, /name: 'commands-dir-json'/);
  assert.match(probeScript, /name: 'commands-dir-md'/);
  assert.match(probeScript, /name: 'gemini-pi-string-extension'/);
  assert.match(probeScript, /name: 'gemini-pi-extensions-array'/);
  assert.match(probeScript, /name: 'agents-dir-md'/);
  assert.match(probeScript, /name: 'gemini-pi-agents'/);
  assert.match(probeScript, /name: 'rules-dir-md'/);
  assert.match(probeScript, /name: 'gemini-pi-rules'/);
  assert.match(probeScript, /name: 'hooks-post-invocation'/);
  assert.match(probeScript, /post_invocation_hooks/);
});

test('installer capability probes support isolated remote env and custom agy binary', () => {
  const probeScript = readText('scripts/probe-agy-install-capabilities.js');

  assert.match(probeScript, /--remote-env=KEY=VALUE/);
  assert.match(probeScript, /--agy-bin=\/path\/to\/agy/);
  assert.match(probeScript, /function remoteCommand/);
});
