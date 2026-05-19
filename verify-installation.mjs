import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const testDir = './test_install_env';
const zipPath = './agy-hud.tgz';

async function verify() {
  console.log('🧪 Starting installation verification...');

  if (!fs.existsSync(zipPath)) {
    console.error('❌ agy-hud.tgz not found. Run release.sh first.');
    return;
  }

  // 1. Simulate extraction
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true });
  fs.mkdirSync(testDir);
  
  console.log('📦 Extracting package...');
  execSync(`tar -xzf ${zipPath} -C ${testDir}`);

  // 2. Validate extracted content
  console.log('🔍 Checking file structure...');
  const files = fs.readdirSync(testDir);
  console.log('Files found:', files);

  if (!files.includes('plugin.json')) {
    console.error('❌ plugin.json is missing in root!');
  }

  // 3. Run agy validation if available
  try {
    console.log('🤖 Running agy plugin validate...');
    const output = execSync(`agy plugin validate ${testDir}`).toString();
    console.log('Validation Output:\n', output);
  } catch (e) {
    console.error('❌ Official validation failed:', e.stderr?.toString() || e.message);
  }
}

verify();
