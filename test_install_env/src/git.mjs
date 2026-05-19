import { execSync } from 'child_process';

export function getGitInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const status = execSync('git status --porcelain', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const isDirty = status.length > 0 ? '*' : '';
    return `(${branch}${isDirty})`;
  } catch (e) {
    return ''; // Not a git repo
  }
}
