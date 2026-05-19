function renderHUD(state, config, gitInfo) {
  const branch = gitInfo.branch || 'unknown';
  const tokens = (state.tokens / 1000).toFixed(1) + 'k';
  
  return `\x1b[48;5;234m\x1b[38;5;255m AGY-HUD \x1b[0m \x1b[38;5;39m ${branch}\x1b[0m | \x1b[38;5;11mSteps: ${state.step_count}\x1b[0m | \x1b[38;5;214mTokens: ${tokens}\x1b[0m`;
}

module.exports = { renderHUD };
