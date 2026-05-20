const fs = require('fs');
const path = require('path');

async function loadConfig() {
  const localConfig = path.join(process.cwd(), 'agy-hud.config.json');
  const pluginConfig = path.join(__dirname, 'agy-hud.config.json');
  
  let config = { enabled: true, theme: 'default' };
  
  if (fs.existsSync(localConfig)) {
    try {
      const data = JSON.parse(fs.readFileSync(localConfig, 'utf8'));
      config = { ...config, ...data };
    } catch (e) {}
  } else if (fs.existsSync(pluginConfig)) {
    try {
      const data = JSON.parse(fs.readFileSync(pluginConfig, 'utf8'));
      config = { ...config, ...data };
    } catch (e) {}
  }
  
  // Ensure enabled defaults to true if not explicitly false
  if (config.enabled === undefined) config.enabled = true;
  
  return config;
}

module.exports = { loadConfig };
