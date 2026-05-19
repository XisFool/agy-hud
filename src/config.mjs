import fs from 'fs';
import path from 'path';

const DEFAULT_CONFIG = {
  theme: {
    primary: 'green',
    secondary: 'gray',
    warning: 'yellow',
    critical: 'red'
  },
  display: {
    showTokenBar: true,
    showBreadcrumbs: true,
    showGitBranch: true,
    breadcrumbCount: 3
  },
  thresholds: {
    warning: 0.7,
    critical: 0.9
  },
  language: 'auto'
};

export function loadConfig(projectDir) {
  const configPath = path.join(projectDir, 'agy-hud.config.json');
  try {
    if (fs.existsSync(configPath)) {
      const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { ...DEFAULT_CONFIG, ...userConfig };
    }
  } catch (e) {
    console.error('Failed to load config, using defaults');
  }
  return DEFAULT_CONFIG;
}
