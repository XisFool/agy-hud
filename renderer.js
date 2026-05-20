/**
 * Renders the HUD string for the status line using native ANSI escape codes.
 * Features Dual Progress Bars for Context and Quota with Nerd Font fallbacks.
 * 
 * @param {Object} state 
 * @param {Object} agyData
 * @param {Object} config
 * @param {Array}  quotaData  — from quota.js getQuota()
 * @returns {string}
 */
function renderHUD(state, agyData, config, quotaData) {
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
  const branchIcon = useNerd ? '' : '⎇';
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
  const plan = agyData?.plan_tier || 'Free';
  const tasks = agyData?.task_count || 0;
  
  // Extract model information
  let modelName = agyData?.model?.display_name || agyData?.model?.id || 'Unknown Model';
  // Simplify model name for the status bar if it's too long
  if (modelName.length > 20) {
    modelName = modelName.replace(' (High)', '').replace(' (Low)', '');
  }

  const formatTokens = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  };

  /**
   * Format seconds into human-readable "Xh Ym" or "Ym" string.
   * @param {number} secs
   */
  const formatDuration = (secs) => {
    if (secs <= 0) return 'now';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const createProgressBar = (percent, color, width = 10) => {
    const completed = Math.round((percent / 100) * width);
    const remaining = width - completed;
    
    // Auto-color based on usage
    let finalColor = color;
    if (percent > 80) finalColor = red;
    else if (percent > 50) finalColor = yellow;

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
    `${cyan} ${ctxIcon}Ctx: ${formatTokens(totalInput)}/${formatTokens(usage.context_window_size || 0)} ${reset}`,
    createProgressBar(ctxPercent, cyan),
    `${gray} | ${reset}`,
    `${green} Model: ${modelName} ${reset}`
  ].join('');

  // Build quota lines
  let quotaLines = '';
  if (quotaData && quotaData.length > 0) {
    const now = Date.now();
    const parts = quotaData.map(q => {
      const pct = Math.round(q.remainingFraction * 100);
      const bar = createProgressBar(pct, green, 8);
      
      // Calculate time until reset
      let resetStr = '';
      if (q.resetTime) {
        const resetMs = new Date(q.resetTime).getTime();
        const secsLeft = Math.max(0, Math.round((resetMs - now) / 1000));
        resetStr = ` ${gray}~${formatDuration(secsLeft)}${reset}`;
      }
      
      // Shorten display name to fit
      let name = q.displayName || q.id;
      if (name.length > 22) name = name.substring(0, 21) + '…';
      
      const pctColor = pct <= 10 ? red : pct <= 30 ? yellow : green;
      return `${cyan}${name}${reset} ${bar} ${pctColor}${pct}%${reset}${resetStr}`;
    });

    // 2 per line
    const rows = [];
    for (let i = 0; i < parts.length; i += 2) {
      rows.push('  ' + parts.slice(i, i + 2).join(`  ${gray}|${reset}  `));
    }
    quotaLines = '\n' + rows.join('\n');
  }

  return `\n${line1}\n${line2}${quotaLines}\n`;
}

module.exports = {
  renderHUD
};
