import chalk from 'chalk';

const i18n = {
  en: {
    READY: 'READY',
    BUSY: 'BUSY',
    THINKING: 'THINKING',
    IDLE: 'IDLE'
  },
  zh: {
    READY: '就绪',
    BUSY: '运行中',
    THINKING: '思考中',
    IDLE: '空闲'
  }
};

export function renderHUD(state, config, lang = 'en') {
  const labels = i18n[lang] || i18n.en;
  
  const statusColors = {
    READY: chalk.blue,
    BUSY: chalk[config.theme.primary] || chalk.green,
    THINKING: chalk[config.theme.warning] || chalk.yellow,
    IDLE: chalk[config.theme.secondary] || chalk.gray
  };

  const color = statusColors[state.status] || chalk.white;
  const statusText = color(labels[state.status] || state.status);
  
  const breadcrumb = state.breadcrumb.length > 0 
    ? ` ${chalk.gray(state.breadcrumb.join(' ➜ '))}`
    : '';

  // Context Health Bar (Dynamic based on log size)
  const progressBar = config.display.showTokenBar 
    ? ` | ${drawProgressBar(state.tokenPercent || 0, config)}` 
    : '';

  const breadcrumbsStr = config.display.showBreadcrumbs ? ` |${breadcrumb}` : '';
  const gitStr = config.display.showGitBranch && state.gitInfo ? ` | ${chalk.magenta(state.gitInfo)}` : '';

  return `\x1b[1mAGY\x1b[0m${gitStr} | ${statusText}${progressBar}${breadcrumbsStr}`;
}

function drawProgressBar(percent, config) {
  const width = 10;
  const filled = Math.round(width * percent);
  const empty = width - filled;
  
  let color = chalk[config.theme.primary] || chalk.green;
  if (percent >= config.thresholds.critical) color = chalk[config.theme.critical] || chalk.red;
  else if (percent >= config.thresholds.warning) color = chalk[config.theme.warning] || chalk.yellow;

  const bar = color('■'.repeat(filled)) + chalk.gray('□'.repeat(empty));
  return `[${bar}] ${Math.round(percent * 100)}%`;
}
