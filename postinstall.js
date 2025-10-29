#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Check if this is a global install
function isGlobalInstall() {
  // Check if npm_config_global is set
  if (process.env.npm_config_global === 'true') {
    return true;
  }

  // Check if we're being installed in a global node_modules
  const installPath = __dirname;
  const globalPaths = require('module').globalPaths;

  for (const globalPath of globalPaths) {
    if (installPath.startsWith(globalPath)) {
      return true;
    }
  }

  return false;
}

// Check if already configured
function isAlreadyConfigured() {
  try {
    const settingsPath = path.join(require('os').homedir(), '.claude', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

    // Check if Stop hook exists with ccnudge-like commands
    if (settings.hooks && settings.hooks.Stop) {
      return true;
    }
  } catch {
    // Settings file doesn't exist or can't be read
  }

  return false;
}

async function runSetup() {
  console.log('\n🎉 Thanks for installing CCNudge!\n');

  // Check if already configured
  if (isAlreadyConfigured()) {
    console.log('✅ CCNudge is already configured.');
    console.log('\nCommands:');
    console.log('  ccnudge setup   - Reconfigure settings');
    console.log('  ccnudge status  - Check current status');
    console.log('  ccnudge stop    - Disable notifications');
    console.log('  ccnudge start   - Enable notifications\n');
    return;
  }

  console.log('Let\'s set up your notifications!\n');

  // Run the setup command
  const setupProcess = spawn('node', [path.join(__dirname, 'bin', 'cli.js'), 'setup'], {
    stdio: 'inherit',
    shell: true
  });

  setupProcess.on('error', (error) => {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\nYou can run setup manually anytime with: ccnudge setup\n');
  });
}

// Only run setup on global install
if (isGlobalInstall()) {
  // Use a small delay to let npm finish installing
  setTimeout(runSetup, 100);
} else {
  // Local install - just show a message
  console.log('\n📦 CCNudge installed locally.');
  console.log('Run "npx ccnudge setup" to configure notifications.\n');
}
