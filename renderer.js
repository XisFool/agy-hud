/**
 * Renders the HUD string for the status line using native ANSI escape codes.
 * Features Dual Progress Bars for Context and Quota.
 * 
 * @param {Object} state 
 * @param {Object} agyData
 * @returns {string}
 */
function renderHUD(state, agyData) {
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

  const brand = `${bgBlue}${fgWhite}${bold} AGY-HUD ${reset}`;
  const branchName = `${blue}  ${state.branch} ${reset}`;
  
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
      // For usage: red if high
      if (percent > 80) finalColor = red;
      else if (percent > 50) finalColor = yellow;
    } else {
      // For remaining: red if low
      if (percent < 20) finalColor = red;
      else if (percent < 50) finalColor = yellow;
    }

    return `${finalColor}[${'█'.repeat(completed)}${'░'.repeat(remaining)}]${reset}`;
  };

  const line1 = [
    brand,
    branchName,
    `${gray}|${reset}`,
    `${magenta} 󰌢 ${plan} ${reset}`,
    `${gray}|${reset}`,
    `${yellow} Steps: ${state.steps} ${reset}`,
    `${yellow} Tasks: ${tasks} ${reset}`
  ].join('');

  const line2 = [
    `${cyan} 󰚩 Tokens: ${formatTokens(totalInput)}/${formatTokens(totalOutput)} ${reset}`,
    `${gray}|${reset}`,
    `${cyan} Ctx: ${ctxPercent.toFixed(1)}% ${reset}`,
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
