#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs').promises;
const {
  setupNotification,
  listSounds,
  testSound,
  testDesktopNotification,
  removeNotification,
  enableNotifications,
  disableNotifications,
  getStatus,
  getAvailableEvents
} = require('../lib/setup');
const packageJson = require('../package.json');

// Get platform config for defaults
function getPlatformConfig() {
  const os = require('os');
  const platform = os.platform();

  const configs = {
    darwin: {
      defaultSound: '/System/Library/Sounds/Glass.aiff',
      soundsPath: '/System/Library/Sounds',
      extension: '.aiff'
    },
    linux: {
      defaultSound: '/usr/share/sounds/freedesktop/stereo/complete.oga',
      soundsPath: '/usr/share/sounds',
      extension: '.oga'
    },
    win32: {
      defaultSound: 'C:\\Windows\\Media\\Windows Notify System Generic.wav',
      soundsPath: 'C:\\Windows\\Media',
      extension: '.wav'
    }
  };

  return configs[platform];
}

async function getSystemSounds() {
  const config = getPlatformConfig();

  try {
    const files = await fs.readdir(config.soundsPath);
    return files
      .filter(f => f.endsWith(config.extension))
      .map(f => path.basename(f, config.extension));
  } catch {
    return [];
  }
}

program
  .name('ccnudge')
  .description('Configure sound and desktop notifications for Claude Code events')
  .version(packageJson.version);

// Interactive setup command
program
  .command('setup')
  .description('Interactive setup for Claude Code notifications')
  .action(async () => {
    console.log('\n👋 Welcome to CCNudge setup!\n');
    console.log('Get notified when Claude Code triggers different events.');
    console.log('You can configure different sounds for each event and use custom audio files.\n');

    try {
      const systemSounds = await getSystemSounds();
      const config = getPlatformConfig();
      const availableEvents = getAvailableEvents();

      // Ask which events to configure
      const { selectedEvents } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedEvents',
          message: 'Which events would you like to configure?',
          choices: availableEvents,
          default: ['Stop'],
          validate: (input) => {
            if (input.length === 0) {
              return 'Please select at least one event.';
            }
            return true;
          }
        }
      ]);

      const soundChoices = [
        { name: `Default (${config.defaultSound})`, value: 'default' },
        ...systemSounds.map(sound => ({
          name: sound,
          value: sound
        })),
        { name: 'Custom path...', value: 'custom' }
      ];

      console.log('');

      // Configure each selected event
      for (const event of selectedEvents) {
        console.log(`\n📌 Configuring ${event} event:\n`);

        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'soundChoice',
            message: `Choose notification sound for ${event}:`,
            choices: soundChoices,
            default: 'default'
          },
          {
            type: 'input',
            name: 'customPath',
            message: 'Enter the full path to your sound file:',
            when: (answers) => answers.soundChoice === 'custom',
            validate: async (input) => {
              try {
                await fs.access(input);
                return true;
              } catch {
                return 'File not found. Please enter a valid path.';
              }
            }
          },
          {
            type: 'confirm',
            name: 'testSound',
            message: 'Test this sound?',
            default: event === selectedEvents[0] // Test first event by default
          },
          {
            type: 'confirm',
            name: 'desktopNotify',
            message: `Enable desktop notifications for ${event}?`,
            default: false
          }
        ]);

        // Determine the sound path
        let soundPath;
        if (answers.soundChoice === 'default') {
          soundPath = null; // Will use system default
        } else if (answers.soundChoice === 'custom') {
          soundPath = answers.customPath;
        } else {
          soundPath = answers.soundChoice; // System sound name
        }

        // Test sound if requested
        if (answers.testSound) {
          console.log('Testing sound...');
          try {
            await testSound(soundPath || config.defaultSound);
          } catch (error) {
            console.error('Error testing sound:', error.message);
          }
        }

        // Test desktop notification if enabled
        if (answers.desktopNotify) {
          console.log('Testing desktop notification...');
          await testDesktopNotification();
        }

        // Setup the notification for this event
        await setupNotification(event, soundPath, answers.desktopNotify);
      }

      console.log('\n✨ Setup complete! CCNudge is now active for ' + selectedEvents.length + ' event(s).\n');
      console.log('Commands:');
      console.log('  ccnudge stop    - Temporarily disable all notifications');
      console.log('  ccnudge start   - Re-enable all notifications');
      console.log('  ccnudge status  - Check current status');
      console.log('  ccnudge notify  - Test notification + sound');
      console.log('');

    } catch (error) {
      if (error.isTtyError) {
        console.error('Prompt could not be rendered in this environment');
      } else {
        console.error('Setup error:', error.message);
      }
      process.exit(1);
    }
  });

// Start command (enable)
program
  .command('start')
  .description('Enable CCNudge notifications')
  .option('-e, --event <event>', 'Specific event to enable (enables all if not specified)')
  .action(async (options) => {
    try {
      await enableNotifications(options.event);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Stop command (disable)
program
  .command('stop')
  .description('Disable CCNudge notifications (keeps configuration)')
  .option('-e, --event <event>', 'Specific event to disable (disables all if not specified)')
  .action(async (options) => {
    try {
      await disableNotifications(options.event);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show current CCNudge status')
  .action(async () => {
    try {
      await getStatus();
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Notify command (test both sound and desktop notification)
program
  .command('notify')
  .description('Test sound and desktop notification')
  .action(async () => {
    try {
      console.log('Testing notification...\n');
      await testSound();
      await testDesktopNotification();
      console.log('\n✅ Notification test complete!');
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Test command
program
  .command('test')
  .description('Test the configured notification sound')
  .option('-s, --sound <sound>', 'Sound to test (optional)')
  .action(async (options) => {
    try {
      await testSound(options.sound);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .description('List available system sounds')
  .action(async () => {
    await listSounds();
  });

// Remove command
program
  .command('remove')
  .description('Remove CCNudge configuration completely')
  .option('-e, --event <event>', 'Event to remove notification from (default: Stop)', 'Stop')
  .action(async (options) => {
    try {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to remove CCNudge configuration?',
          default: false
        }
      ]);

      if (confirm) {
        await removeNotification(options.event);
      } else {
        console.log('Cancelled.');
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Default action (show help if no command)
program.action(() => {
  program.help();
});

program.parse();
