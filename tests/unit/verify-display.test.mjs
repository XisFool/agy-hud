import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { detectHudRender, renderTerminalScreen, stripAnsi } = require('../../scripts/verify-display.js');

test('detectHudRender accepts the current brandless unicode HUD', () => {
  const hud = [
    '\x1b[34m⎇ HEAD\x1b[0m \x1b[90m│\x1b[0m \x1b[32mUnknown Model\x1b[0m \x1b[90m│\x1b[0m \x1b[35mFree\x1b[0m',
    '\x1b[36m⚿ 0 ↑0 ↓0\x1b[0m \x1b[90m│\x1b[0m \x1b[36m⛁ 0/0\x1b[0m \x1b[36m[░░░░░░░░░░]\x1b[0m \x1b[36m0%\x1b[0m \x1b[90m│\x1b[0m \x1b[33m⚡ 0\x1b[0m \x1b[33m✓ 0\x1b[0m',
    '  Quota unavailable: not logged into Antigravity',
  ].join('\n');

  assert.equal(hud.includes('AGY-HUD'), false);
  assert.equal(detectHudRender(hud, renderTerminalScreen(hud), stripAnsi(hud)), true);
});

test('detectHudRender accepts the ASCII fallback HUD', () => {
  const hud = [
    '[B] fix/audit-findings | Unknown Model | Google AI Pro',
    '[Tk] 0 ^0 v0 | [C] 0/0 [----------] 0% | [S] 0 [T] 0',
    'Quota loading...',
  ].join('\n');

  assert.equal(detectHudRender(hud), true);
});

test('detectHudRender rejects empty and unrelated command output', () => {
  assert.equal(detectHudRender('', 'random output', 'Usage of agy:'), false);
  assert.equal(detectHudRender('[B] main only has a branch marker'), false);
});
