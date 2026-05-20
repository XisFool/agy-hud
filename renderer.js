/**
 * Renders the HUD string for the status line using native ANSI escape codes.
 * Features Dual Progress Bars for Context and Quota with Nerd Font fallbacks.
 * 
 * @param {Object} state 
 * @param {Object} agyData
 * @param {Object} config
 * @returns {string}
 */
function renderHUD(state, agyData, config) {
  const useNerd = config?.display?.useNerdFonts === true;

  // ANSI escape sequences
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const gray = '\x1b[90m';
  const blue = '\x1b[34m';
  const magenta = '\x1b[35m';
  const yellow = '\x1b[33m';
  const cyan = '\x1b[36m';
  const green = '\x1b[32m';
  const red = '\x1b[31m';
  
  const bgBlue = '\x1b[44m';
  const fgWhite = '\x1b[37m';

  // Fallbacks for Nerd Fonts
  const branchIcon = useNerd ? '' : '⎇';
  const planIcon = useNerd ? '󰌢 ' : '';
  const tokenIcon = useNerd ? '󰚩 ' : '';
  const ctxIcon = useNerd ? '󱔐 ' : '';

  const brand = `${bgBlue}${fgWhite}${bold} AGY-HUD ${reset}`;
  const branchName = `${blue} ${branchIcon} ${state.branch} ${reset}`;
  
  // Data extraction
  const usage = agyData?.context_window || {};
  const totalInput = usage.total_input_tokens || 0;
  const totalOutput = usage.total_output_tokens || 0;
  const ctxPercent = usage.used_percentage || 0;
  const quotaPercent = usage.remaining_percentage || 0;
  const plan = agyData?.plan_tier || 'Free';
  const tasks = agyData?.task_count || 0;

  const formatTokens = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  };

  const createProgressBar = (percent, color, isRemaining = false) => {
    const width = 10;
    const completed = Math.round((percent / 100) * width);
    const remaining = width - completed;
    
    // Auto-color based on usage/remaining
    let finalColor = color;
    if (!isRemaining) {
      if (percent > 80) finalColor = red;
      else if (percent > 50) finalColor = yellow;
    } else {
      if (percent < 20) finalColor = red;
      else if (percent < 50) finalColor = yellow;
    }

    // Use solid blocks for progress bar
    return `${finalColor}[${'█'.repeat(completed)}${'░'.repeat(remaining)}]${reset}`;
  };

  const line1 = [
    brand,
    branchName,
    `${gray}|${reset}`,
    `${magenta} ${planIcon}Plan: ${plan} ${reset}`,
    `${gray}|${reset}`,
    `${yellow} Steps: ${state.steps} ${reset}`,
    `${yellow} Tasks: ${tasks} ${reset}`
  ].join('');

  const line2 = [
    `${cyan} ${tokenIcon}Tokens: ${formatTokens(totalInput)}/${formatTokens(totalOutput)} ${reset}`,
    `${gray}|${reset}`,
    `${cyan} ${ctxIcon}Ctx: ${ctxPercent.toFixed(1)}% ${reset}`,
    createProgressBar(ctxPercent, cyan),
    `${gray} | ${reset}`,
    `${green} Quota: ${quotaPercent.toFixed(1)}% ${reset}`,
    createProgressBar(quotaPercent, green, true)
  ].join('');

  return `\n${line1}\n${line2}\n`;
}

module.exports = {
  renderHUD
};
