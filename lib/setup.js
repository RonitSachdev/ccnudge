const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const notifier = require('node-notifier');

const execAsync = promisify(exec);

// Available Claude Code events (official from Claude docs)
const AVAILABLE_EVENTS = [
  { name: 'Stop - When Claude finishes responding', value: 'Stop' },
  { name: 'SubagentStop - When subagent tasks complete', value: 'SubagentStop' },
  { name: 'PostToolUse - After tool calls complete', value: 'PostToolUse' },
  { name: 'PreToolUse - Before tool calls (advanced)', value: 'PreToolUse' },
  { name: 'UserPromptSubmit - When user submits a prompt', value: 'UserPromptSubmit' },
  { name: 'Notification - When Claude sends notifications', value: 'Notification' },
  { name: 'SessionStart - When session starts/resumes', value: 'SessionStart' },
  { name: 'SessionEnd - When session ends', value: 'SessionEnd' },
  { name: 'PreCompact - Before compact operations', value: 'PreCompact' }
];

// Platform-specific sound configurations
const PLATFORM_CONFIGS = {
  darwin: {
    command: 'afplay',
    defaultSound: '/System/Library/Sounds/Glass.aiff',
    soundsPath: '/System/Library/Sounds',
    extension: '.aiff'
  },
  linux: {
    command: 'paplay', // fallback to aplay if paplay not available
    defaultSound: '/usr/share/sounds/freedesktop/stereo/complete.oga',
    soundsPath: '/usr/share/sounds',
    extension: '.oga'
  },
  win32: {
    command: 'powershell -c (New-Object Media.SoundPlayer',
    defaultSound: 'C:\\Windows\\Media\\Windows Notify System Generic.wav',
    soundsPath: 'C:\\Windows\\Media',
    extension: '.wav',
    commandSuffix: ').PlaySync()'
  }
};

function getPlatformConfig() {
  const platform = os.platform();
  const config = PLATFORM_CONFIGS[platform];

  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return config;
}

function getSettingsPath() {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

function getBackupPath() {
  return path.join(os.homedir(), '.claude', '.ccnudge-backup.json');
}

async function readSettings() {
  const settingsPath = getSettingsPath();

  try {
    const content = await fs.readFile(settingsPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty settings
      return {};
    }
    throw error;
  }
}

async function writeSettings(settings) {
  const settingsPath = getSettingsPath();
  const settingsDir = path.dirname(settingsPath);

  // Ensure .claude directory exists
  await fs.mkdir(settingsDir, { recursive: true });

  // Write settings with pretty formatting
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

async function backupCurrentConfig() {
  const settings = await readSettings();
  const backupPath = getBackupPath();

  // Backup all ccnudge-managed hooks
  if (settings.hooks) {
    const ccnudgeHooks = {};
    const eventNames = AVAILABLE_EVENTS.map(e => e.value);

    for (const event of eventNames) {
      if (settings.hooks[event]) {
        ccnudgeHooks[event] = settings.hooks[event];
      }
    }

    if (Object.keys(ccnudgeHooks).length > 0) {
      await fs.writeFile(backupPath, JSON.stringify(ccnudgeHooks, null, 2), 'utf-8');
      return true;
    }
  }

  return false;
}

async function getBackupConfig() {
  const backupPath = getBackupPath();

  try {
    const content = await fs.readFile(backupPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function buildSoundCommand(soundPath) {
  const platform = os.platform();
  const config = getPlatformConfig();

  if (platform === 'win32') {
    return `${config.command} '${soundPath}'${config.commandSuffix}`;
  }

  return `${config.command} ${soundPath}`;
}

function buildDesktopNotifyCommand() {
  const platform = os.platform();

  if (platform === 'darwin') {
    // Use sound name "" to suppress the default notification beep
    return `osascript -e 'display notification "Claude Code has finished" with title "CCNudge" sound name ""'`;
  } else if (platform === 'linux') {
    return `notify-send "CCNudge" "Claude Code has finished"`;
  } else if (platform === 'win32') {
    return `powershell -c "New-BurntToastNotification -Text 'CCNudge', 'Claude Code has finished'"`;
  }
}

async function setupNotification(event, soundPath, enableDesktopNotify = false) {
  const config = getPlatformConfig();

  // Backup existing config before making changes
  await backupCurrentConfig();

  // If no sound specified, use default
  if (!soundPath) {
    soundPath = config.defaultSound;
    console.log(`Using default sound: ${soundPath}`);
  } else if (!path.isAbsolute(soundPath)) {
    // Check if it's a system sound name
    const systemSoundPath = path.join(config.soundsPath, soundPath + config.extension);
    try {
      await fs.access(systemSoundPath);
      soundPath = systemSoundPath;
      console.log(`Using system sound: ${soundPath}`);
    } catch {
      // Try as-is (might be a relative path)
      const absolutePath = path.resolve(soundPath);
      try {
        await fs.access(absolutePath);
        soundPath = absolutePath;
      } catch {
        throw new Error(`Sound file not found: ${soundPath}`);
      }
    }
  }

  // Verify sound file exists
  try {
    await fs.access(soundPath);
  } catch {
    throw new Error(`Sound file not found: ${soundPath}`);
  }

  // Read current settings
  const settings = await readSettings();

  // Initialize hooks structure if it doesn't exist
  if (!settings.hooks) {
    settings.hooks = {};
  }

  // Build hook commands
  const hooks = [];

  // Add sound hook
  const soundCommand = buildSoundCommand(soundPath);
  hooks.push({
    type: 'command',
    command: soundCommand
  });

  // Add desktop notification if enabled
  if (enableDesktopNotify) {
    const notifyCommand = buildDesktopNotifyCommand();
    if (notifyCommand) {
      hooks.push({
        type: 'command',
        command: notifyCommand
      });
    }
  }

  // Configure the hook
  settings.hooks[event] = [
    {
      hooks: hooks
    }
  ];

  // Write settings
  await writeSettings(settings);

  console.log(`\n✅ Configured ${event} event to play: ${soundPath}`);
  if (enableDesktopNotify) {
    console.log(`✅ Desktop notifications enabled`);
  }
  console.log(`Settings saved to: ${getSettingsPath()}`);
}

async function enableNotifications(event = null) {
  const backup = await getBackupConfig();

  if (!backup) {
    console.log('No previous configuration found. Please run "ccnudge setup" first.');
    return;
  }

  const settings = await readSettings();

  if (!settings.hooks) {
    settings.hooks = {};
  }

  // If specific event, restore only that event
  if (event) {
    if (backup[event]) {
      settings.hooks[event] = backup[event];
      await writeSettings(settings);
      console.log(`✅ ${event} event notifications enabled`);
    } else {
      console.log(`No backup found for ${event} event.`);
    }
  } else {
    // Restore all events
    Object.assign(settings.hooks, backup);
    await writeSettings(settings);
    const eventCount = Object.keys(backup).length;
    console.log(`✅ Notifications enabled for ${eventCount} event(s)`);
  }
}

async function disableNotifications(event = null) {
  const settings = await readSettings();
  const eventNames = AVAILABLE_EVENTS.map(e => e.value);

  // Find all configured ccnudge events
  const configuredEvents = eventNames.filter(e => settings.hooks && settings.hooks[e]);

  if (configuredEvents.length === 0) {
    console.log('No notifications currently configured.');
    return;
  }

  // Backup current config before disabling
  await backupCurrentConfig();

  // If specific event, disable only that event
  if (event) {
    if (settings.hooks && settings.hooks[event]) {
      delete settings.hooks[event];
      console.log(`✅ ${event} event notifications disabled (configuration saved for re-enabling)`);
    } else {
      console.log(`No notification configured for ${event} event.`);
      return;
    }
  } else {
    // Disable all ccnudge events
    for (const evt of configuredEvents) {
      delete settings.hooks[evt];
    }
    console.log(`✅ Notifications disabled for ${configuredEvents.length} event(s) (configuration saved for re-enabling)`);
  }

  // Clean up empty hooks object
  if (settings.hooks && Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  await writeSettings(settings);
}

async function testSound(soundPath) {
  const config = getPlatformConfig();

  if (!soundPath) {
    // Test the configured sound from settings
    const settings = await readSettings();
    const stopHook = settings?.hooks?.Stop?.[0]?.hooks;

    if (stopHook && stopHook.length > 0) {
      console.log('Testing configured sound...');

      // Find and play the sound command
      for (const hook of stopHook) {
        if (hook.type === 'command' && (hook.command.includes('afplay') ||
                                         hook.command.includes('paplay') ||
                                         hook.command.includes('Media.SoundPlayer'))) {
          await execAsync(hook.command);
        }
      }

      console.log('✅ Sound played successfully!');
      return;
    } else {
      // No configured sound, use default
      soundPath = config.defaultSound;
    }
  } else if (!path.isAbsolute(soundPath)) {
    // Check if it's a system sound name
    const systemSoundPath = path.join(config.soundsPath, soundPath + config.extension);
    try {
      await fs.access(systemSoundPath);
      soundPath = systemSoundPath;
    } catch {
      // Try as-is (might be a relative path)
      const absolutePath = path.resolve(soundPath);
      try {
        await fs.access(absolutePath);
        soundPath = absolutePath;
      } catch {
        throw new Error(`Sound file not found: ${soundPath}`);
      }
    }
  }

  console.log(`Testing sound: ${soundPath}`);
  const command = buildSoundCommand(soundPath);

  try {
    await execAsync(command);
    console.log('✅ Sound played successfully!');
  } catch (error) {
    throw new Error(`Failed to play sound: ${error.message}`);
  }
}

async function testDesktopNotification() {
  console.log('Testing desktop notification...');

  notifier.notify({
    title: 'CCNudge',
    message: 'Claude Code has finished',
    sound: false, // Don't play sound here
    wait: false
  });

  console.log('✅ Desktop notification sent!');
}

async function listSounds() {
  const config = getPlatformConfig();
  const platform = os.platform();

  console.log(`\nAvailable system sounds on ${platform}:\n`);

  try {
    const files = await fs.readdir(config.soundsPath);
    const soundFiles = files.filter(f => f.endsWith(config.extension));

    if (soundFiles.length === 0) {
      console.log('No system sounds found.');
      console.log(`You can use custom sound files by providing the full path.`);
      return soundFiles;
    }

    soundFiles.forEach(file => {
      const name = path.basename(file, config.extension);
      const fullPath = path.join(config.soundsPath, file);
      console.log(`  • ${name}`);
      console.log(`    ${fullPath}\n`);
    });

    console.log(`\nUsage: Select from the list during interactive setup`);
    return soundFiles;
  } catch (error) {
    console.log(`Could not access system sounds directory: ${config.soundsPath}`);
    console.log(`You can use custom sound files by providing the full path.`);
    return [];
  }
}

async function getStatus() {
  const settings = await readSettings();
  const backup = await getBackupConfig();
  const eventNames = AVAILABLE_EVENTS.map(e => e.value);

  // Find configured events
  const configuredEvents = eventNames.filter(e => settings?.hooks?.[e]);

  console.log('\n📊 CCNudge Status:\n');

  if (configuredEvents.length > 0) {
    console.log(`Status: ✅ ENABLED for ${configuredEvents.length} event(s)\n`);

    for (const event of configuredEvents) {
      console.log(`Event: ${event}`);
      const hooks = settings.hooks[event][0]?.hooks || [];

      // Find sound
      const soundHook = hooks.find(h =>
        h.command?.includes('afplay') ||
        h.command?.includes('paplay') ||
        h.command?.includes('Media.SoundPlayer')
      );

      if (soundHook) {
        // Extract just the sound file path
        const match = soundHook.command.match(/\/[^\s]+\.(aiff|wav|mp3|oga)/);
        console.log(`  Sound: ${match ? match[0] : soundHook.command}`);
      }

      // Check for desktop notification
      const hasDesktopNotify = hooks.some(h =>
        h.command?.includes('osascript') ||
        h.command?.includes('notify-send') ||
        h.command?.includes('New-BurntToastNotification')
      );

      console.log(`  Desktop Notifications: ${hasDesktopNotify ? '✅ Enabled' : '❌ Disabled'}`);
      console.log('');
    }
  } else if (backup) {
    const backupEvents = Object.keys(backup);
    console.log(`Status: ⏸️  DISABLED (${backupEvents.length} event(s) can be re-enabled with "ccnudge start")`);
    console.log(`Events: ${backupEvents.join(', ')}\n`);
  } else {
    console.log('Status: ❌ NOT CONFIGURED (run "ccnudge setup" to get started)\n');
  }
}

async function removeNotification(event) {
  const settings = await readSettings();

  if (!settings.hooks || !settings.hooks[event]) {
    console.log(`No notification configured for ${event} event.`);
    return;
  }

  delete settings.hooks[event];

  // Clean up empty hooks object
  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  // Also remove backup
  const backupPath = getBackupPath();
  try {
    await fs.unlink(backupPath);
  } catch {
    // Backup might not exist, that's fine
  }

  await writeSettings(settings);
  console.log(`✅ Removed notification for ${event} event.`);
}

function getAvailableEvents() {
  return AVAILABLE_EVENTS;
}

module.exports = {
  setupNotification,
  testSound,
  testDesktopNotification,
  listSounds,
  removeNotification,
  enableNotifications,
  disableNotifications,
  getStatus,
  getAvailableEvents
};
