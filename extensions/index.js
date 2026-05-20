const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * @param {any} api 
 */
module.exports = async (api) => {
  // Extension entry point.
  // HUD display is now handled via bin/agy-hud.js and the statusLine configuration in settings.json.
  // This extension can be used for future interactive features or hooks.
  
  if (api && typeof api.registerHook === 'function') {
    // Registering a dummy hook for now to ensure the extension is loaded
    api.registerHook('on_session_start', async () => {
      // Session started
    });
  }
};
