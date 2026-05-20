const { execSync } = require('child_process');

async function getGitInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    return { branch };
  } catch (e) {
    return { branch: 'non-git' };
  }
}

module.exports = { getGitInfo };
