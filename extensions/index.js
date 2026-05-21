const { configureStatusLine } = require('./statusline.js');

module.exports = async (api) => {
  void api;

  // Local development entrypoint. Remote `agy plugin install <url>` does not
  // execute this module, so install verification must not depend on it.
  try {
    configureStatusLine(__dirname);
  } catch {
    // Fail silently
  }
};
