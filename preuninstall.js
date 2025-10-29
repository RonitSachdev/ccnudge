#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Check if this is a global uninstall
function isGlobalUninstall() {
  // Check if npm_config_global is set
  if (process.env.npm_config_global === 'true') {
    return true;
  }

  // Check if we're being uninstalled from a global node_modules
  const installPath = __dirname;
  const globalPaths = require('module').globalPaths;

  for (const globalPath of globalPaths) {
    if (installPath.startsWith(globalPath)) {
      return true;
    }
  }

  return false;
}

function cleanupSettings() {
  try {
    const settingsPath = path.join(require('os').homedir(), '.claude', 'settings.json');

    // Check if settings file exists
    if (!fs.existsSync(settingsPath)) {
      return;
    }

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

    // List of all CCNudge-managed events (official Claude Code events)
    const ccnudgeEvents = ['Stop', 'SubagentStop', 'PostToolUse', 'PreToolUse', 'UserPromptSubmit', 'Notification', 'SessionStart', 'SessionEnd', 'PreCompact'];
    let removedCount = 0;

    // Check if there are any CCNudge hooks
    if (settings.hooks) {
      console.log('\n🧹 Cleaning up CCNudge configuration...');

      // Remove all CCNudge-managed events
      for (const event of ccnudgeEvents) {
        if (settings.hooks[event]) {
          delete settings.hooks[event];
          removedCount++;
        }
      }

      // Clean up empty hooks object
      if (Object.keys(settings.hooks).length === 0) {
        delete settings.hooks;
      }

      if (removedCount > 0) {
        // Write updated settings
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
        console.log(`✅ CCNudge configuration removed from Claude Code settings (${removedCount} event(s))`);
      }
    }

    // Remove backup file
    const backupPath = path.join(require('os').homedir(), '.claude', '.ccnudge-backup.json');
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }

  } catch (error) {
    // Silently fail - don't want to block uninstall
    console.error('Note: Could not clean up CCNudge settings:', error.message);
  }
}

// Only clean up on global uninstall
if (isGlobalUninstall()) {
  cleanupSettings();
  console.log('\n👋 Thanks for using CCNudge!\n');
}
