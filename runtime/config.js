const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = { enabled: true, theme: 'default' };

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function loadConfig() {
  const localConfig = path.join(process.cwd(), 'agy-hud.config.json');
  const pluginConfig = path.join(__dirname, 'agy-hud.config.json');

  const configPath = fs.existsSync(localConfig) ? localConfig : pluginConfig;
  const fileConfig = fs.existsSync(configPath) ? readJsonFile(configPath) : null;
  const config = fileConfig
    ? { ...DEFAULT_CONFIG, ...fileConfig }
    : { ...DEFAULT_CONFIG };

  if (config.enabled === undefined) {
    config.enabled = true;
  }

  return config;
}

module.exports = { loadConfig };
