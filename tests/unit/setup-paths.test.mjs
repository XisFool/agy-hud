import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import statuslineModule from '../../extensions/statusline.js';

const {
  createStatusLineCommand,
  buildCmdShimContents,
  buildShShimContents,
  writeCmdShim,
  ensureWindowsShShim,
  getWindowsAgyBinDirs,
} = statuslineModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

function readRemoteHook() {
  const hooks = JSON.parse(fs.readFileSync(path.join(projectRoot, 'hooks', 'hooks.json'), 'utf8'));
  const command = hooks.post_invocation_hooks[0].command;
  const match = command.match(/^node -e "eval\(require\('zlib'\)\.inflateSync\(Buffer\.from\('([^']+)','base64'\)\)\.toString\('utf8'\)\)"$/);
  assert.ok(match, `unexpected hook command: ${command}`);
  const body = inflateSync(Buffer.from(match[1], 'base64')).toString('utf8');
  return { command, body };
}

test('setup.sh runs install-statusline.js', () => {
  const setupScript = fs.readFileSync(path.join(projectRoot, 'setup.sh'), 'utf8');

  assert.match(setupScript, /extensions\/install-statusline\.js/);
});

test('setup.ps1 runs install-statusline.js', () => {
  const setupScript = fs.readFileSync(path.join(projectRoot, 'setup.ps1'), 'utf8');

  assert.match(setupScript, /extensions\/install-statusline\.js/);
});

test('install-statusline.js requires statusline.js and configures statusLine', () => {
  const installScript = fs.readFileSync(path.join(projectRoot, 'extensions', 'install-statusline.js'), 'utf8');
  assert.match(installScript, /configureStatusLine\(__dirname\)/);
});

test('Windows statusLine command points at the .cmd shim, not raw node invocation', () => {
  const command = createStatusLineCommand(
    'C:\\Users\\testuser\\.gemini\\antigravity-cli\\agy-hud-runtime\\extensions\\bin\\agy-hud.js',
    'C:\\Program Files\\nodejs\\node.exe',
    'win32'
  );

  assert.equal(
    command,
    '"C:\\Users\\testuser\\.gemini\\antigravity-cli\\agy-hud-runtime\\extensions\\bin\\agy-hud.cmd"'
  );
  // The shim path replaces .js with .cmd — no inline node invocation.
  assert.doesNotMatch(command, /^node /);
  assert.doesNotMatch(command, /\.js"$/);
});

test('Unix statusLine command uses absolute process.execPath', () => {
  const command = createStatusLineCommand(
    '/Users/me/.gemini/antigravity-cli/agy-hud-runtime/extensions/bin/agy-hud.js',
    '/usr/local/bin/node',
    'darwin'
  );
  assert.equal(command, '"/usr/local/bin/node" "/Users/me/.gemini/antigravity-cli/agy-hud-runtime/extensions/bin/agy-hud.js"');
});

test('buildCmdShimContents includes node-on-PATH first then Program Files fallback', () => {
  const body = buildCmdShimContents('C:\\runtime\\extensions\\bin\\agy-hud.js');
  assert.match(body, /^@echo off/);
  assert.match(body, /node "%~dp0agy-hud\.js"/);
  assert.match(body, /%ProgramFiles%\\nodejs\\node\.exe/);
  // CRLF line endings for Windows .cmd files
  assert.match(body, /\r\n/);
});

test('buildShShimContents forwards agy sh -c calls to cmd.exe', () => {
  const body = buildShShimContents();

  assert.match(body, /^@echo off/);
  assert.match(body, /"%~1"=="-c"/);
  assert.match(body, /set "CMDLINE=%~2"/);
  assert.ok(body.includes('set "CMDLINE=%CMDLINE:\\"="%"'));
  assert.match(body, /cmd\.exe \/d \/s \/c "%CMDLINE%"/);
  assert.match(body, /\r\n/);
});

test('buildShShimContents normalizes agy escaped command quotes', () => {
  const body = buildShShimContents();

  assert.ok(body.includes('set "CMDLINE=%CMDLINE:\\"="%"'));
  assert.doesNotMatch(body, /cmd\.exe \/d \/s \/c "%~2"/);
});

test('getWindowsAgyBinDirs only returns LOCALAPPDATA agy bin and PATH dirs with agy.exe', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-bin-dirs-'));
  try {
    const localAppData = path.join(tmp, 'local');
    const appData = path.join(tmp, 'roaming');
    const userProfile = path.join(tmp, 'home');
    const pathAgyBin = path.join(tmp, 'path-bin');
    const pathOther = path.join(tmp, 'path-other');
    fs.mkdirSync(path.join(localAppData, 'agy', 'bin'), { recursive: true });
    fs.mkdirSync(pathAgyBin, { recursive: true });
    fs.mkdirSync(pathOther, { recursive: true });
    fs.writeFileSync(path.join(pathAgyBin, 'agy.exe'), '');

    const dirs = getWindowsAgyBinDirs({
      LOCALAPPDATA: localAppData,
      APPDATA: appData,
      USERPROFILE: userProfile,
      PATH: [pathAgyBin, pathOther].join(path.delimiter),
    });

    // Must include LOCALAPPDATA\agy\bin and the PATH dir that contains agy.exe.
    assert.deepEqual(dirs, [
      path.resolve(localAppData, 'agy', 'bin'),
      path.resolve(pathAgyBin),
    ]);
    // Must NOT include risky shared locations.
    assert.ok(!dirs.includes(path.resolve(localAppData, 'Microsoft', 'WindowsApps')));
    assert.ok(!dirs.includes(path.resolve(appData, 'npm')));
    assert.ok(!dirs.includes(path.resolve(userProfile, 'App')));
    // PATH dirs without agy.exe are skipped.
    assert.ok(!dirs.includes(path.resolve(pathOther)));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('ensureWindowsShShim writes sh.cmd into discovered agy bin dirs', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-sh-shim-'));
  try {
    const localAppData = path.join(tmp, 'local');
    const agyBin = path.join(localAppData, 'agy', 'bin');
    fs.mkdirSync(agyBin, { recursive: true });

    const written = ensureWindowsShShim('win32', {
      LOCALAPPDATA: localAppData,
      PATH: '',
    });

    assert.ok(written.includes(path.join(agyBin, 'sh.cmd')));
    assert.ok(written.includes(path.join(agyBin, 'sh.bat')));
    const body = fs.readFileSync(path.join(agyBin, 'sh.cmd'), 'utf8');
    assert.ok(body.includes('set "CMDLINE=%CMDLINE:\\"="%"'));
    assert.match(body, /cmd\.exe \/d \/s \/c "%CMDLINE%"/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('ensureWindowsShShim does not shadow a real sh.exe in the same dir', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-sh-real-'));
  try {
    const localAppData = path.join(tmp, 'local');
    const agyBin = path.join(localAppData, 'agy', 'bin');
    fs.mkdirSync(agyBin, { recursive: true });
    fs.writeFileSync(path.join(agyBin, 'sh.exe'), 'real-sh-binary');

    const written = ensureWindowsShShim('win32', {
      LOCALAPPDATA: localAppData,
      PATH: '',
    });

    assert.deepEqual(written, []);
    assert.ok(!fs.existsSync(path.join(agyBin, 'sh.cmd')));
    assert.ok(!fs.existsSync(path.join(agyBin, 'sh.bat')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('ensureWindowsShShim does not overwrite a third-party sh.cmd', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-sh-tp-'));
  try {
    const localAppData = path.join(tmp, 'local');
    const agyBin = path.join(localAppData, 'agy', 'bin');
    fs.mkdirSync(agyBin, { recursive: true });
    const thirdParty = '@echo off\r\necho some other sh shim\r\n';
    fs.writeFileSync(path.join(agyBin, 'sh.cmd'), thirdParty);

    const written = ensureWindowsShShim('win32', {
      LOCALAPPDATA: localAppData,
      PATH: '',
    });

    assert.ok(!written.includes(path.join(agyBin, 'sh.cmd')));
    assert.equal(fs.readFileSync(path.join(agyBin, 'sh.cmd'), 'utf8'), thirdParty);
    // sh.bat was missing, so it is safe to create.
    assert.ok(written.includes(path.join(agyBin, 'sh.bat')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('ensureWindowsShShim skips writes when on-disk content already matches', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-sh-idem-'));
  try {
    const localAppData = path.join(tmp, 'local');
    const agyBin = path.join(localAppData, 'agy', 'bin');
    fs.mkdirSync(agyBin, { recursive: true });

    const first = ensureWindowsShShim('win32', { LOCALAPPDATA: localAppData, PATH: '' });
    assert.ok(first.length > 0);

    const second = ensureWindowsShShim('win32', { LOCALAPPDATA: localAppData, PATH: '' });
    assert.deepEqual(second, []);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('writeCmdShim is a no-op on non-Windows', () => {
  const result = writeCmdShim('/tmp/whatever/agy-hud.js', 'linux');
  assert.equal(result, null);
});

test('remote install hook writes a Windows-safe statusLine command', () => {
  const { body } = readRemoteHook();

  // Hook generates .cmd shim on Windows + branches on process.platform
  assert.match(body, /process\.platform/);
  assert.match(body, /isWin/);
  // ".cmd" shim path is referenced in the inline script
  assert.match(body, /\.cmd/);
  // agy 1.0.0 launches statusLine through `sh -c` on Windows, so the hook
  // must also install the compatibility shim and normalize escaped quotes.
  assert.match(body, /shShimBody/);
  assert.match(body, /CMDLINE=%CMDLINE/);
  assert.match(body, /cmd\.exe \/d \/s \/c/);
  assert.match(body, /CredRead/);
  assert.match(body, /gemini:antigravity/);
  assert.match(body, /Text\.Encoding\]::UTF8/);
  // Regression: never write into WindowsApps or %APPDATA%\npm — those shadow
  // unrelated tools' `sh` on PATH.
  assert.doesNotMatch(body, /WindowsApps/);
  assert.doesNotMatch(body, /APPDATA[^A-Za-z0-9_]+.*npm/);
  // Guard against shadowing a real sh.exe.
  assert.match(body, /sh\.exe/);
});

test('remote install hook command is safe to pass through POSIX shell', () => {
  const { command } = readRemoteHook();

  // The inline bootstrap contains PowerShell fragments with `$tokens`, `$()`,
  // and Windows `%...%` variables. Keep those out of the shell-visible command
  // string so /bin/sh or cmd.exe cannot expand them before Node starts.
  assert.doesNotMatch(command, /\$\(|\$[A-Za-z_]/);
  assert.doesNotMatch(command, /%[A-Za-z0-9_~]+%/);
});

test('remote install hook executes through shell without expansion warnings', () => {
  const { command } = readRemoteHook();
  const tempWork = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-hud-shell-hook-'));

  try {
    const tempHome = path.join(tempWork, 'home');
    const tempRuntime = path.join(tempWork, 'runtime');
    const sourceRepo = path.join(tempWork, 'source');
    const tempSettingsDir = path.join(tempHome, '.gemini', 'antigravity-cli');
    const sourceHudDir = path.join(sourceRepo, 'extensions', 'bin');

    fs.mkdirSync(tempSettingsDir, { recursive: true });
    fs.mkdirSync(sourceHudDir, { recursive: true });
    fs.writeFileSync(path.join(tempSettingsDir, 'settings.json'), '{}\n');
    fs.writeFileSync(path.join(sourceHudDir, 'agy-hud.js'), 'process.stdout.write("AGY-HUD-SHELL");\n');

    execSync('git init', { cwd: sourceRepo, stdio: 'ignore' });
    execSync('git add .', { cwd: sourceRepo, stdio: 'ignore' });
    execSync('git -c user.name=agy-hud-test -c user.email=agy-hud-test@example.com commit -m "init"', {
      cwd: sourceRepo,
      stdio: 'ignore',
    });

    const result = spawnSync(command, {
      shell: true,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: tempHome,
        USERPROFILE: tempHome,
        AGY_HUD_RUNTIME_DIR: tempRuntime,
        AGY_HUD_REPO_URL: sourceRepo,
      },
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(result.stderr, '');

    const settings = JSON.parse(fs.readFileSync(path.join(tempSettingsDir, 'settings.json'), 'utf8'));
    assert.match(settings.statusLine.command, /extensions[/\\]bin[/\\]agy-hud\.js/);
    assert.match(execSync(settings.statusLine.command).toString(), /AGY-HUD-SHELL/);
  } finally {
    fs.rmSync(tempWork, { recursive: true, force: true });
  }
});

test('remote install hook implements rename-with-retry for Windows file locks', () => {
  const { body } = readRemoteHook();

  assert.match(body, /renameWithRetry/);
  // Backoff loop runs multiple attempts
  assert.match(body, /i < 4/);
});
