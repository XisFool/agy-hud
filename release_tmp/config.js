const fs = require('fs');
const path = require('path');

async function loadConfig() {
  const configPath = path.join(process.cwd(), 'agy-hud.config.json');
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  return { enabled: true, theme: 'default' };
}

module.exports = { loadConfig };
