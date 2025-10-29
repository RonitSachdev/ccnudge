# CCNudge

> A simple CLI tool to get sound and desktop notifications for Claude Code events

Get instant feedback when Claude Code triggers different events - with customizable sounds and desktop notifications for each event!

## Available Events

CCNudge supports all official Claude Code hook events:

- **Stop** - When Claude finishes responding (most common)
- **SubagentStop** - When subagent tasks complete
- **PostToolUse** - After tool calls complete
- **PreToolUse** - Before tool calls (can be used for alerts)
- **UserPromptSubmit** - When user submits a prompt
- **Notification** - When Claude sends notifications
- **SessionStart** - When session starts/resumes
- **SessionEnd** - When session ends
- **PreCompact** - Before compact operations

You can configure different sounds for each event during setup!

## Installation

### Global Installation (Recommended)

```bash
npm install -g ccnudge
```

**The interactive setup will run automatically after installation!** You'll be prompted to:
- Select which Claude Code events to configure
- Choose notification sounds for each event (system sounds or custom files)
- Test sounds before saving
- Enable desktop notifications per event (optional)

### Local Installation

```bash
npm install ccnudge
npx ccnudge setup
```

## Quick Start

For global install, setup runs automatically during installation. You can also run setup anytime:

```bash
ccnudge setup
```

That's it! Now Claude Code will notify you when tasks complete.

## Commands

### `ccnudge setup`

Interactive setup wizard - walks you through:
- Selecting which Claude Code events to configure
- Choosing notification sounds for each event (system sounds or custom)
- Testing sounds before saving
- Enabling desktop notifications per event (optional)

```bash
ccnudge setup
```

### `ccnudge start`

Enable notifications (uses your saved configuration)

```bash
# Enable all configured events
ccnudge start

# Enable a specific event
ccnudge start -e Stop
```

### `ccnudge stop`

Disable notifications temporarily (keeps your configuration for later)

```bash
# Disable all events
ccnudge stop

# Disable a specific event
ccnudge stop -e PostToolUse
```

### `ccnudge status`

Check if CCNudge is enabled and view current configuration

```bash
ccnudge status
```

Output example:
```
📊 CCNudge Status:

Status: ✅ ENABLED for 2 event(s)

Event: Stop
  Sound: /System/Library/Sounds/Glass.aiff
  Desktop Notifications: ✅ Enabled

Event: PostToolUse
  Sound: /System/Library/Sounds/Tink.aiff
  Desktop Notifications: ❌ Disabled
```

### `ccnudge notify`

Test both sound and desktop notification

```bash
ccnudge notify
```

### `ccnudge test`

Test just the sound notification

```bash
# Test configured sound
ccnudge test

# Test a specific sound
ccnudge test -s Glass
```

### `ccnudge list`

List all available system sounds

```bash
ccnudge list
```

### `ccnudge remove`

Remove CCNudge configuration completely (with confirmation prompt)

```bash
ccnudge remove
```

## Usage Examples

### Basic Workflow

```bash
# 1. Install globally (setup runs automatically!)
npm install -g ccnudge

# 2. Use Claude Code normally - you'll get notifications!

# 3. Need to focus? Disable temporarily
ccnudge stop

# 4. Re-enable when ready
ccnudge start

# 5. Want to change settings?
ccnudge setup
```

### Interactive Setup Example

```bash
$ ccnudge setup

👋 Welcome to CCNudge setup!

Get notified when Claude Code triggers different events.
You can configure different sounds for each event and use custom audio files.

? Which events would you like to configure? (Press <space> to select, <a> to toggle all, <i> to invert selection)
❯◉ Stop - When Claude finishes responding
 ◯ SubagentStop - When subagent tasks complete
 ◉ PostToolUse - After tool calls complete
 ◯ PreToolUse - Before tool calls (advanced)
 ◯ UserPromptSubmit - When user submits a prompt
 ◯ Notification - When Claude sends notifications
 ◯ SessionStart - When session starts/resumes
 ◯ SessionEnd - When session ends
 ◯ PreCompact - Before compact operations

📌 Configuring Stop event:

? Choose notification sound for Stop:
❯ Default (/System/Library/Sounds/Glass.aiff)
  Basso
  Glass
  Hero
  Ping
  Custom path...

? Test this sound? Yes
? Enable desktop notifications for Stop? Yes

Testing sound...
✅ Sound played successfully!
Testing desktop notification...
✅ Desktop notification sent!

✅ Configured Stop event to play: /System/Library/Sounds/Glass.aiff
✅ Desktop notifications enabled

📌 Configuring PostToolUse event:

? Choose notification sound for PostToolUse: Tink
? Test this sound? No
? Enable desktop notifications for PostToolUse? No

✅ Configured PostToolUse event to play: /System/Library/Sounds/Tink.aiff

✨ Setup complete! CCNudge is now active for 2 event(s).

Commands:
  ccnudge stop    - Temporarily disable all notifications
  ccnudge start   - Re-enable all notifications
  ccnudge status  - Check current status
  ccnudge notify  - Test notification + sound
```

## Platform-Specific Notes

### macOS

- Uses `afplay` for audio playback
- Uses `osascript` for desktop notifications
- Default sound: `Glass.aiff`
- System sounds: `/System/Library/Sounds/`
- Supported formats: `.aiff`, `.wav`, `.mp3`

### Linux

- Uses `paplay` (PulseAudio) for audio
- Uses `notify-send` for desktop notifications
- Default sound: `complete.oga`
- System sounds: `/usr/share/sounds/`
- Supported formats: `.oga`, `.wav`, `.mp3`

### Windows

- Uses PowerShell's `Media.SoundPlayer` for audio
- Uses `BurntToast` module for desktop notifications
- Default sound: `Windows Notify System Generic.wav`
- System sounds: `C:\Windows\Media\`
- Supported formats: `.wav`

## How It Works

CCNudge configures the hooks feature in Claude Code's settings file (`~/.claude/settings.json`). When you run setup, it creates hooks for the events you select. Each event can have its own sound and desktop notification settings.

Example configuration with multiple events:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "afplay /System/Library/Sounds/Glass.aiff"
          },
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude Code has finished\" with title \"CCNudge\"'"
          }
        ]
      }
    ]
  }
}
```

## Configuration Management

CCNudge intelligently manages your configuration:

- **Install**: Automatically runs setup on global install
- **Setup**: Creates new configuration and backs up any existing one
- **Stop**: Disables notifications but saves configuration to `~/.claude/.ccnudge-backup.json`
- **Start**: Restores configuration from backup
- **Remove**: Completely removes configuration and backups
- **Uninstall**: Automatically cleans up all CCNudge settings from Claude Code

This means you can safely toggle notifications on/off without losing your settings! When you uninstall CCNudge with `npm uninstall -g ccnudge`, it automatically removes all configuration from your Claude Code settings.

## Troubleshooting

### Sound doesn't play

Check if the sound file exists and is accessible:

```bash
# macOS
ls -l /System/Library/Sounds/

# Test sound directly
afplay /System/Library/Sounds/Glass.aiff
```

### Desktop notifications don't appear

**macOS**: Grant Terminal/iTerm notification permissions in System Preferences > Notifications

**Linux**: Ensure `notify-send` is installed:
```bash
sudo apt-get install libnotify-bin  # Debian/Ubuntu
sudo yum install notify-send        # RedHat/Fedora
```

**Windows**: Install BurntToast module:
```powershell
Install-Module -Name BurntToast
```

### Check current configuration

```bash
ccnudge status
cat ~/.claude/settings.json
```

### Reset everything

```bash
ccnudge remove
ccnudge setup
```

## Programmatic Usage (Node.js)

You can also use CCNudge in your own Node.js scripts:

```javascript
const ccnudge = require('ccnudge');

async function setupMyNotification() {
  // Set up with sound + desktop notification
  await ccnudge.setupNotification('Stop', '/path/to/sound.wav', true);

  // Test
  await ccnudge.testSound();
  await ccnudge.testDesktopNotification();

  // Check status
  await ccnudge.getStatus();

  // Disable temporarily
  await ccnudge.disableNotifications();

  // Re-enable
  await ccnudge.enableNotifications();
}
```

## FAQ

### Q: Will this interfere with my existing Claude Code settings?

No! CCNudge only modifies the hooks for events you configure and preserves all other settings.

### Q: Can I use my own custom sound?

Yes! During setup, choose "Custom path..." and provide the full path to any audio file.

### Q: Can I configure different sounds for different events?

Yes! During setup, select multiple events and configure each one with its own sound and notification settings.

### Q: Which events should I configure?

**Stop** is the most common - it triggers when Claude finishes responding. You'll hear it when I finish answering your questions (like right now!).

**PostToolUse** is great for hearing when tools complete. Other events are more advanced - experiment to see what works for you!

### Q: What happens if I run setup multiple times?

Your previous configuration is backed up automatically, and you can restore it with `ccnudge start`.

### Q: Can I disable just one event?

Yes! Use `ccnudge stop -e EventName` to disable a specific event, or `ccnudge stop` to disable all.

### Q: What happens when I uninstall CCNudge?

When you run `npm uninstall -g ccnudge`, the package automatically removes all CCNudge configuration from your `~/.claude/settings.json` file, leaving your other Claude Code settings intact. You'll see a cleanup message during uninstall.

## License

MIT

## Links

- [npm package](https://www.npmjs.com/package/ccnudge)
- [GitHub Repository](https://github.com/RonitSachdev/ccnudge)
- [Claude Code Documentation](https://docs.claude.com/claude-code)
