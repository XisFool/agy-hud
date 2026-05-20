/**
 * Antigravity HUD Extension
 * This extension registers hooks to interact with the agy lifecycle.
 * The main HUD display is handled via the statusLine command in settings.json.
 */

module.exports = async (api) => {
  if (api && api.registerHook) {
    // We can use hooks here to trigger HUD refreshes if needed, 
    // but agy calls the statusLine command automatically.
    api.registerHook('on_step_complete', async (context) => {
      // Step completed
    });
  }
};
