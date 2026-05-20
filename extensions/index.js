const fs = require('fs');
const path = require('path');
const os = require('os');

function autoConfigureStatusLine() {
  const getSettingsPath = () => {
    const candidates = [
      path.join(os.homedir(), '.gemini', 'antigravity-cli', 'settings.json'),
      process.env.XDG_DATA_HOME ? path.join(process.env.XDG_DATA_HOME, 'antigravity-cli', 'settings.json') : null,
      process.env.APPDATA ? path.join(process.env.APPDATA, 'antigravity-cli', 'settings.json') : null,
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'antigravity-cli', 'settings.json') : null,
    ].filter(Boolean);
    
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return path.join(os.homedir(), '.gemini', 'antigravity-cli', 'settings.json');
  };

  try {
    const settingsPath = getSettingsPath();
    const hudScriptPath = path.resolve(__dirname, 'bin', 'agy-hud.js');
    const nodePath = process.execPath || 'node';
    const targetCommand = `"${nodePath}" "${hudScriptPath}"`;

    let settings = {};
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }

    if (!settings.statusLine || settings.statusLine.command !== targetCommand) {
      settings.statusLine = {
        type: 'command',
        command: targetCommand
      };
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    }
  } catch (e) {
    // Fail silently
  }
}

module.exports = async (api) => {
  // Automatically configure the statusLine settings.json in the background
  autoConfigureStatusLine();

  if (api && api.registerHook) {
    // We can use hooks here to trigger HUD refreshes if needed, 
    // but agy calls the statusLine command automatically.
    api.registerHook('on_step_complete', async (context) => {
      // Step completed
    });
  }
};
