#!/usr/bin/env node
'use strict';

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const args = process.argv.slice(2);
const target = args[0];
const agyBinArg = args.find(arg => arg.startsWith('--agy-bin='));
const agyBin = agyBinArg ? agyBinArg.slice('--agy-bin='.length) : 'agy';
const remoteEnv = args
  .filter(arg => arg.startsWith('--remote-env='))
  .map(arg => arg.slice('--remote-env='.length))
  .filter(Boolean);
const selected = new Set(
  args
    .slice(1)
    .filter(arg => arg.startsWith('--probe='))
    .map(arg => arg.slice('--probe='.length))
);

if (!target) {
  process.stderr.write(
    'Usage: node scripts/probe-agy-install-capabilities.js <ssh-target> [--probe=name] [--agy-bin=/path/to/agy] [--remote-env=KEY=VALUE]\n'
  );
  process.exit(1);
}

function markerScript(name) {
  const marker = name.replace(/[^a-z0-9-]/gi, '-');
  return [
    "const fs=require('fs')",
    "const os=require('os')",
    "const path=require('path')",
    "const dir=path.join(os.homedir(),'.gemini','antigravity-cli','agy-hud-probe')",
    "fs.mkdirSync(dir,{recursive:true})",
    `fs.writeFileSync(path.join(dir,${JSON.stringify(`${marker}.txt`)}),'ok '+Date.now())`,
  ].join(';');
}

function baseManifest(name) {
  return {
    name,
    version: '0.0.0',
    description: `agy-hud installer probe ${name}`,
  };
}

function hookCommand(name) {
  return `node -e ${JSON.stringify(markerScript(name))}`;
}

function mcpServer(name) {
  return {
    command: 'node',
    args: [
      '-e',
      `${markerScript(name)}; setTimeout(()=>{}, 15000)`,
    ],
  };
}

function statusLineCommand(name) {
  return `node -e ${JSON.stringify(`process.stdout.write(${JSON.stringify(`AGY-HUD-PROBE-${name}`)})`)}`;
}

function statusLineConfig(name) {
  return {
    type: 'command',
    command: statusLineCommand(name),
  };
}

function extensionEntrypoint(name) {
  return [
    "'use strict';",
    markerScript(name),
    'module.exports = async function agyHudProbeExtension() {',
    `  ${markerScript(`${name}-factory`)}`,
    '};',
    '',
  ].join('\n');
}

function commandConfig(name) {
  return {
    description: `Probe command ${name}`,
    command: hookCommand(name),
  };
}

function commandTemplateConfig(name) {
  return {
    description: `Probe command template ${name}`,
    commandTemplate: {
      command: 'node',
      args: ['-e', markerScript(name)],
    },
  };
}

function currentRootHooksJson(name) {
  return {
    [`agy-hud-probe-${name}`]: {
      SessionStart: [
        {
          type: 'command',
          command: hookCommand(name),
          timeout: 10,
        },
      ],
    },
  };
}

function officialHooksJson(name) {
  return {
    hooks: {
      SessionStart: [
        {
          matcher: '',
          hooks: [
            {
              type: 'command',
              command: hookCommand(name),
              timeout: 10,
            },
          ],
        },
      ],
    },
  };
}

function postInvocationHooksJson(name) {
  return {
    post_invocation_hooks: [
      {
        name: `agy-hud-probe-${name}`,
        command: hookCommand(name),
        timeout_ms: 10_000,
      },
    ],
  };
}

const probes = [
  {
    name: 'gemini-settings-envvar',
    observe: false,
    files: () => ({
      'gemini-extension.json': {
        ...baseManifest('gemini-settings-envvar'),
        settings: [
          {
            name: 'Probe Value',
            description: 'Installer settings schema probe.',
            envVar: 'AGY_HUD_PROBE_VALUE',
            sensitive: false,
          },
        ],
      },
      'plugin.json': baseManifest('gemini-settings-envvar'),
    }),
  },
  {
    name: 'gemini-settings-key-value',
    observe: false,
    files: () => ({
      'gemini-extension.json': {
        ...baseManifest('gemini-settings-key-value'),
        settings: [
          {
            key: 'statusLine',
            value: {
              type: 'command',
              command: 'echo AGY-HUD-PROBE',
            },
          },
        ],
      },
      'plugin.json': baseManifest('gemini-settings-key-value'),
    }),
  },
  {
    name: 'root-settings-json',
    observe: false,
    files: () => ({
      'gemini-extension.json': baseManifest('root-settings-json'),
      'plugin.json': baseManifest('root-settings-json'),
      'settings.json': {
        statusLine: {
          type: 'command',
          command: 'echo AGY-HUD-PROBE',
        },
      },
    }),
  },
  {
    name: 'gemini-top-status-line',
    observe: true,
    files: () => ({
      'gemini-extension.json': {
        ...baseManifest('gemini-top-status-line'),
        statusLine: statusLineConfig('gemini-top-status-line'),
      },
      'plugin.json': baseManifest('gemini-top-status-line'),
    }),
  },
  {
    name: 'gemini-pi-status-line',
    observe: true,
    files: () => ({
      'gemini-extension.json': {
        ...baseManifest('gemini-pi-status-line'),
        pi: {
          statusLine: statusLineConfig('gemini-pi-status-line'),
        },
      },
      'plugin.json': baseManifest('gemini-pi-status-line'),
    }),
  },
  {
    name: 'plugin-settings-envvar',
    observe: false,
    files: () => ({
      'gemini-extension.json': baseManifest('plugin-settings-envvar'),
      'plugin.json': {
        ...baseManifest('plugin-settings-envvar'),
        settings: [
          {
            name: 'Probe Value',
            description: 'Installer settings schema probe.',
            envVar: 'AGY_HUD_PROBE_VALUE',
            sensitive: false,
          },
        ],
      },
    }),
  },
  {
    name: 'plugin-settings-key-value',
    observe: false,
    files: () => ({
      'gemini-extension.json': baseManifest('plugin-settings-key-value'),
      'plugin.json': {
        ...baseManifest('plugin-settings-key-value'),
        settings: [
          {
            key: 'statusLine',
            value: statusLineConfig('plugin-settings-key-value'),
          },
        ],
      },
    }),
  },
  {
    name: 'plugin-settings-object',
    observe: false,
    files: () => ({
      'gemini-extension.json': baseManifest('plugin-settings-object'),
      'plugin.json': {
        ...baseManifest('plugin-settings-object'),
        settings: {
          statusLine: statusLineConfig('plugin-settings-object'),
        },
      },
    }),
  },
  {
    name: 'plugin-top-status-line',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('plugin-top-status-line'),
      'plugin.json': {
        ...baseManifest('plugin-top-status-line'),
        statusLine: statusLineConfig('plugin-top-status-line'),
      },
    }),
  },
  {
    name: 'plugin-pi-status-line',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('plugin-pi-status-line'),
      'plugin.json': {
        ...baseManifest('plugin-pi-status-line'),
        pi: {
          statusLine: statusLineConfig('plugin-pi-status-line'),
        },
      },
    }),
  },
  {
    name: 'gemini-pi-string-extension',
    observe: true,
    files: () => ({
      'gemini-extension.json': {
        ...baseManifest('gemini-pi-string-extension'),
        pi: 'extensions/index.js',
      },
      'plugin.json': baseManifest('gemini-pi-string-extension'),
      'extensions/index.js': extensionEntrypoint('gemini-pi-string-extension'),
    }),
  },
  {
    name: 'plugin-pi-string-extension',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('plugin-pi-string-extension'),
      'plugin.json': {
        ...baseManifest('plugin-pi-string-extension'),
        pi: 'extensions/index.js',
      },
      'extensions/index.js': extensionEntrypoint('plugin-pi-string-extension'),
    }),
  },
  {
    name: 'gemini-pi-extensions-array',
    observe: true,
    files: () => ({
      'gemini-extension.json': {
        ...baseManifest('gemini-pi-extensions-array'),
        pi: {
          extensions: ['extensions/index.js'],
        },
      },
      'plugin.json': baseManifest('gemini-pi-extensions-array'),
      'extensions/index.js': extensionEntrypoint('gemini-pi-extensions-array'),
    }),
  },
  {
    name: 'plugin-pi-extensions-array',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('plugin-pi-extensions-array'),
      'plugin.json': {
        ...baseManifest('plugin-pi-extensions-array'),
        pi: {
          extensions: ['extensions/index.js'],
        },
      },
      'extensions/index.js': extensionEntrypoint('plugin-pi-extensions-array'),
    }),
  },
  {
    name: 'gemini-top-commands',
    observe: true,
    files: () => ({
      'gemini-extension.json': {
        ...baseManifest('gemini-top-commands'),
        commands: {
          probe: commandConfig('gemini-top-commands'),
        },
      },
      'plugin.json': baseManifest('gemini-top-commands'),
    }),
  },
  {
    name: 'gemini-pi-commands',
    observe: true,
    files: () => ({
      'gemini-extension.json': {
        ...baseManifest('gemini-pi-commands'),
        pi: {
          commands: {
            probe: commandConfig('gemini-pi-commands'),
          },
        },
      },
      'plugin.json': baseManifest('gemini-pi-commands'),
    }),
  },
  {
    name: 'plugin-top-commands',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('plugin-top-commands'),
      'plugin.json': {
        ...baseManifest('plugin-top-commands'),
        commands: {
          probe: commandConfig('plugin-top-commands'),
        },
      },
    }),
  },
  {
    name: 'plugin-pi-commands',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('plugin-pi-commands'),
      'plugin.json': {
        ...baseManifest('plugin-pi-commands'),
        pi: {
          commands: {
            probe: commandConfig('plugin-pi-commands'),
          },
        },
      },
    }),
  },
  {
    name: 'gemini-pi-commands-template',
    observe: true,
    files: () => ({
      'gemini-extension.json': {
        ...baseManifest('gemini-pi-commands-template'),
        pi: {
          commands: {
            probe: commandTemplateConfig('gemini-pi-commands-template'),
          },
        },
      },
      'plugin.json': baseManifest('gemini-pi-commands-template'),
    }),
  },
  {
    name: 'root-commands-json',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('root-commands-json'),
      'plugin.json': baseManifest('root-commands-json'),
      'commands.json': {
        probe: commandConfig('root-commands-json'),
      },
    }),
  },
  {
    name: 'commands-dir-json',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('commands-dir-json'),
      'plugin.json': baseManifest('commands-dir-json'),
      'commands/probe.json': commandConfig('commands-dir-json'),
    }),
  },
  {
    name: 'commands-dir-md',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('commands-dir-md'),
      'plugin.json': baseManifest('commands-dir-md'),
      'commands/probe.md': [
        '---',
        'description: Probe markdown command',
        '---',
        '',
        `Run this shell command: ${hookCommand('commands-dir-md')}`,
        '',
      ].join('\n'),
    }),
  },
  {
    name: 'agents-dir-md',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('agents-dir-md'),
      'plugin.json': baseManifest('agents-dir-md'),
      'agents/probe.md': [
        '---',
        'name: agy-hud-probe-agent',
        'description: Probe agent',
        '---',
        '',
        `When loaded, write marker with: ${hookCommand('agents-dir-md')}`,
        '',
      ].join('\n'),
    }),
  },
  {
    name: 'gemini-pi-agents',
    observe: true,
    files: () => ({
      'gemini-extension.json': {
        ...baseManifest('gemini-pi-agents'),
        pi: {
          agents: ['agents/*.md'],
        },
      },
      'plugin.json': baseManifest('gemini-pi-agents'),
      'agents/probe.md': [
        '---',
        'name: agy-hud-probe-agent',
        'description: Probe agent',
        '---',
        '',
        `When loaded, write marker with: ${hookCommand('gemini-pi-agents')}`,
        '',
      ].join('\n'),
    }),
  },
  {
    name: 'plugin-pi-agents',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('plugin-pi-agents'),
      'plugin.json': {
        ...baseManifest('plugin-pi-agents'),
        pi: {
          agents: ['agents/*.md'],
        },
      },
      'agents/probe.md': [
        '---',
        'name: agy-hud-probe-agent',
        'description: Probe agent',
        '---',
        '',
        `When loaded, write marker with: ${hookCommand('plugin-pi-agents')}`,
        '',
      ].join('\n'),
    }),
  },
  {
    name: 'rules-dir-md',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('rules-dir-md'),
      'plugin.json': baseManifest('rules-dir-md'),
      'rules/probe.md': [
        '# AGY-HUD-PROBE-rules-dir-md',
        '',
        `When loaded, write marker with: ${hookCommand('rules-dir-md')}`,
        '',
      ].join('\n'),
    }),
  },
  {
    name: 'gemini-pi-rules',
    observe: true,
    files: () => ({
      'gemini-extension.json': {
        ...baseManifest('gemini-pi-rules'),
        pi: {
          rules: ['rules/*.md'],
        },
      },
      'plugin.json': baseManifest('gemini-pi-rules'),
      'rules/probe.md': [
        '# AGY-HUD-PROBE-gemini-pi-rules',
        '',
        `When loaded, write marker with: ${hookCommand('gemini-pi-rules')}`,
        '',
      ].join('\n'),
    }),
  },
  {
    name: 'plugin-pi-rules',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('plugin-pi-rules'),
      'plugin.json': {
        ...baseManifest('plugin-pi-rules'),
        pi: {
          rules: ['rules/*.md'],
        },
      },
      'rules/probe.md': [
        '# AGY-HUD-PROBE-plugin-pi-rules',
        '',
        `When loaded, write marker with: ${hookCommand('plugin-pi-rules')}`,
        '',
      ].join('\n'),
    }),
  },
  {
    name: 'gemini-top-mcp-inline',
    observe: true,
    files: () => ({
      'gemini-extension.json': {
        ...baseManifest('gemini-top-mcp-inline'),
        mcpServers: {
          'agy-hud-probe': mcpServer('gemini-top-mcp-inline'),
        },
      },
      'plugin.json': baseManifest('gemini-top-mcp-inline'),
    }),
  },
  {
    name: 'plugin-top-mcp-inline',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('plugin-top-mcp-inline'),
      'plugin.json': {
        ...baseManifest('plugin-top-mcp-inline'),
        mcpServers: {
          'agy-hud-probe': mcpServer('plugin-top-mcp-inline'),
        },
      },
    }),
  },
  {
    name: 'root-mcp-config-json',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('root-mcp-config-json'),
      'plugin.json': baseManifest('root-mcp-config-json'),
      'mcp_config.json': {
        mcpServers: {
          'agy-hud-probe': mcpServer('root-mcp-config-json'),
        },
      },
    }),
  },
  {
    name: 'gemini-pi-mcp-inline',
    observe: true,
    files: () => ({
      'gemini-extension.json': {
        ...baseManifest('gemini-pi-mcp-inline'),
        pi: {
          mcpServers: {
            'agy-hud-probe': mcpServer('gemini-pi-mcp-inline'),
          },
        },
      },
      'plugin.json': {
        ...baseManifest('gemini-pi-mcp-inline'),
        pi: {
          mcpServers: {
            'agy-hud-probe': mcpServer('gemini-pi-mcp-inline'),
          },
        },
      },
    }),
  },
  {
    name: 'plugin-mcp-config-path',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('plugin-mcp-config-path'),
      'plugin.json': {
        ...baseManifest('plugin-mcp-config-path'),
        pi: {
          mcpServers: 'mcp_config.json',
        },
      },
      'mcp_config.json': {
        mcpServers: {
          'agy-hud-probe': mcpServer('plugin-mcp-config-path'),
        },
      },
    }),
  },
  {
    name: 'root-hooks-session-current',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('root-hooks-session-current'),
      'plugin.json': baseManifest('root-hooks-session-current'),
      'hooks.json': currentRootHooksJson('root-hooks-session-current'),
    }),
  },
  {
    name: 'root-hooks-session-official',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('root-hooks-session-official'),
      'plugin.json': baseManifest('root-hooks-session-official'),
      'hooks.json': officialHooksJson('root-hooks-session-official'),
    }),
  },
  {
    name: 'root-hooks-post-invocation',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('root-hooks-post-invocation'),
      'plugin.json': baseManifest('root-hooks-post-invocation'),
      'hooks.json': postInvocationHooksJson('root-hooks-post-invocation'),
    }),
  },
  {
    name: 'plugin-hooks-json-string',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('plugin-hooks-json-string'),
      'plugin.json': {
        ...baseManifest('plugin-hooks-json-string'),
        hooksJson: JSON.stringify(currentRootHooksJson('plugin-hooks-json-string')),
      },
    }),
  },
  {
    name: 'plugin-hooks-json-object',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('plugin-hooks-json-object'),
      'plugin.json': {
        ...baseManifest('plugin-hooks-json-object'),
        hooksJson: currentRootHooksJson('plugin-hooks-json-object'),
      },
    }),
  },
  {
    name: 'plugin-hooks-post-invocation-string',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('plugin-hooks-post-invocation-string'),
      'plugin.json': {
        ...baseManifest('plugin-hooks-post-invocation-string'),
        hooksJson: JSON.stringify(postInvocationHooksJson('plugin-hooks-post-invocation-string')),
      },
    }),
  },
  {
    name: 'hooks-session-current',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('hooks-session-current'),
      'plugin.json': baseManifest('hooks-session-current'),
      'hooks/hooks.json': {
        'agy-hud-probe-session': {
          SessionStart: [
            {
              type: 'command',
              command: hookCommand('hooks-session-current'),
              timeout: 10,
            },
          ],
        },
      },
    }),
  },
  {
    name: 'hooks-session-official',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('hooks-session-official'),
      'plugin.json': baseManifest('hooks-session-official'),
      'hooks/hooks.json': {
        hooks: {
          SessionStart: [
            {
              matcher: '',
              hooks: [
                {
                  type: 'command',
                  command: hookCommand('hooks-session-official'),
                  timeout: 10,
                },
              ],
            },
          ],
        },
      },
    }),
  },
  {
    name: 'hooks-post-invocation',
    observe: true,
    files: () => ({
      'gemini-extension.json': baseManifest('hooks-post-invocation'),
      'plugin.json': baseManifest('hooks-post-invocation'),
      'hooks/hooks.json': postInvocationHooksJson('hooks-post-invocation'),
    }),
  },
];

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function buildProbeZip(root, probe) {
  const dir = path.join(root, probe.name);
  const zipPath = path.join(root, `${probe.name}.zip`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  for (const [relativePath, content] of Object.entries(probe.files())) {
    const targetPath = path.join(dir, relativePath);
    if (typeof content === 'string') {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, content, 'utf8');
    } else {
      writeJson(targetPath, content);
    }
  }

  fs.rmSync(zipPath, { force: true });
  const zip = spawnSync('zip', ['-qr', zipPath, '.'], {
    cwd: dir,
    encoding: 'utf8',
  });
  if (zip.status !== 0) {
    throw new Error(`zip failed for ${probe.name}: ${zip.stderr || zip.stdout}`);
  }
  return zipPath;
}

function pickLanHost() {
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) return entry.address;
    }
  }
  return '127.0.0.1';
}

function startServer(fileMap) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const file = fileMap.get(req.url || '');
      if (!file) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/zip' });
      fs.createReadStream(file).pipe(res);
    });
    server.on('error', reject);
    server.listen(0, '0.0.0.0', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('server did not return a TCP address'));
        return;
      }
      resolve({ server, port: address.port });
    });
  });
}

function remoteCommand(command, commandArgs = []) {
  if (remoteEnv.length === 0) return [command, ...commandArgs];
  return ['env', ...remoteEnv, command, ...commandArgs];
}

function runRemoteNode(script, scriptArgs = [], timeout = 90_000) {
  const result = spawnSync('ssh', [target, ...remoteCommand('node', ['-', ...scriptArgs])], {
    input: script,
    encoding: 'utf8',
    timeout,
  });
  if (result.status !== 0) {
    return {
      ok: false,
      status: result.status,
      signal: result.signal,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.error && result.error.message,
    };
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }
}

function observeAgy(timeoutMs = 6000) {
  return new Promise(resolve => {
    const ssh = spawn('ssh', ['-tt', target, ...remoteCommand(agyBin)], { encoding: 'utf8' });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      ssh.kill('SIGTERM');
      setTimeout(() => ssh.kill('SIGKILL'), 1000).unref();
    }, timeoutMs);
    ssh.stdout.on('data', data => {
      stdout += data.toString();
    });
    ssh.stderr.on('data', data => {
      stderr += data.toString();
    });
    ssh.on('close', (status, signal) => {
      clearTimeout(timer);
      resolve({ status, signal, stdout, stderr });
    });
    ssh.on('error', error => {
      clearTimeout(timer);
      resolve({ status: null, signal: null, stdout, stderr, error: error.message });
    });
  });
}

function installAgyPlugin(zipUrl, timeoutMs = 15_000) {
  return new Promise(resolve => {
    const ssh = spawn('ssh', ['-tt', target, ...remoteCommand(agyBin, ['plugin', 'install', zipUrl])], {
      encoding: 'utf8',
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      ssh.kill('SIGTERM');
      setTimeout(() => ssh.kill('SIGKILL'), 1000).unref();
    }, timeoutMs);
    ssh.stdout.on('data', data => {
      stdout += data.toString();
    });
    ssh.stderr.on('data', data => {
      stderr += data.toString();
    });
    ssh.on('close', (status, signal) => {
      clearTimeout(timer);
      resolve({ status, signal, timedOut, stdout, stderr });
    });
    ssh.on('error', error => {
      clearTimeout(timer);
      resolve({ status: null, signal: null, timedOut, stdout, stderr, error: error.message });
    });
  });
}

const remoteScript = String.raw`
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const probeName = process.argv[2];
const zipUrl = process.argv[3];
const action = process.argv[4] || 'install';
const base = path.join(os.homedir(), '.gemini', 'antigravity-cli');
const settingsPath = path.join(base, 'settings.json');
const pluginDir = path.join(base, 'plugins', probeName);
const markerDir = path.join(base, 'agy-hud-probe');
const markerPath = path.join(markerDir, probeName + '.txt');
const backupPath = path.join(base, '.agy-hud-probe-settings-backup.json');

function run(command, args, timeout = 60_000) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    input: '',
    killSignal: 'SIGKILL',
    timeout,
  });
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function listFiles(dir) {
  const out = [];
  function walk(current, prefix) {
    let entries = [];
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const rel = prefix ? path.join(prefix, entry.name) : entry.name;
      out.push(rel);
      if (entry.isDirectory()) walk(path.join(current, entry.name), rel);
    }
  }
  walk(dir, '');
  return out.slice(0, 80);
}

function snapshot() {
  const settings = readJson(settingsPath);
  const manifest = readJson(path.join(base, 'import_manifest.json'));
  let manifestEntry = null;
  if (manifest && manifest.plugins) {
    manifestEntry = manifest.plugins[probeName] || null;
  } else if (manifest && Array.isArray(manifest.imports)) {
    manifestEntry = manifest.imports.find(entry => entry && entry.name === probeName) || null;
  }
  return {
    settingsExists: fs.existsSync(settingsPath),
    statusLine: settings && settings.statusLine ? settings.statusLine : null,
    pluginExists: fs.existsSync(pluginDir),
    pluginFiles: listFiles(pluginDir),
    markerExists: fs.existsSync(markerPath),
    marker: fs.existsSync(markerPath) ? fs.readFileSync(markerPath, 'utf8') : null,
    manifestEntry,
  };
}

function saveSettingsBackup() {
  fs.mkdirSync(base, { recursive: true });
  if (fs.existsSync(settingsPath)) {
    fs.writeFileSync(backupPath, fs.readFileSync(settingsPath));
  } else {
    fs.rmSync(backupPath, { force: true });
  }
}

function restoreSettingsBackup() {
  if (fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, fs.readFileSync(backupPath));
  } else {
    fs.rmSync(settingsPath, { force: true });
  }
}

function clean() {
  fs.rmSync(pluginDir, { recursive: true, force: true });
  fs.rmSync(markerPath, { force: true });
  const manifestPath = path.join(base, 'import_manifest.json');
  const manifest = readJson(manifestPath);
  if (manifest && manifest.plugins && manifest.plugins[probeName]) {
    delete manifest.plugins[probeName];
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  } else if (manifest && Array.isArray(manifest.imports)) {
    const nextImports = manifest.imports.filter(entry => !entry || entry.name !== probeName);
    if (nextImports.length !== manifest.imports.length) {
      fs.writeFileSync(
        manifestPath,
        JSON.stringify({ ...manifest, imports: nextImports }, null, 2),
        'utf8',
      );
    }
  }
}

if (action === 'prepare') {
  saveSettingsBackup();
  clean();
  process.stdout.write(JSON.stringify({ ok: true, state: snapshot() }));
  process.exit(0);
}

if (action === 'restore') {
  clean();
  restoreSettingsBackup();
  fs.rmSync(backupPath, { force: true });
  process.stdout.write(JSON.stringify({ ok: true, state: snapshot() }));
  process.exit(0);
}

if (action === 'snapshot') {
  process.stdout.write(JSON.stringify({ ok: true, state: snapshot() }));
  process.exit(0);
}

const before = snapshot();
const install = run('agy', ['plugin', 'install', zipUrl], 90_000);
const afterInstall = snapshot();
process.stdout.write(JSON.stringify({
  ok: true,
  before,
  install: {
    status: install.status,
    signal: install.signal,
    stdout: install.stdout,
    stderr: install.stderr,
    error: install.error && install.error.message,
  },
  afterInstall,
}));
`;

async function main() {
  const activeProbes = selected.size > 0
    ? probes.filter(probe => selected.has(probe.name))
    : probes;

  if (activeProbes.length === 0) {
    throw new Error('no probes selected');
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-hud-probes-'));
  const fileMap = new Map();
  for (const probe of activeProbes) {
    const zipPath = buildProbeZip(root, probe);
    fileMap.set(`/${probe.name}.zip`, zipPath);
  }

  const { server, port } = await startServer(fileMap);
  const host = pickLanHost();
  const reports = [];

  try {
    for (const probe of activeProbes) {
      const url = `http://${host}:${port}/${probe.name}.zip`;
      const prepare = runRemoteNode(remoteScript, [probe.name, url, 'prepare'], 90_000);
      const installRun = await installAgyPlugin(url);
      const install = {
        run: installRun,
        state: runRemoteNode(remoteScript, [probe.name, url, 'snapshot'], 60_000),
      };
      let observe = null;
      let afterObserve = null;
      if (probe.observe) {
        observe = await observeAgy();
        afterObserve = runRemoteNode(remoteScript, [probe.name, url, 'snapshot'], 60_000);
      }
      const restore = runRemoteNode(remoteScript, [probe.name, url, 'restore'], 90_000);
      reports.push({ name: probe.name, url, prepare, install, observe, afterObserve, restore });
    }
  } finally {
    server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }

  process.stdout.write(`${JSON.stringify(reports, null, 2)}\n`);
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
