// Main entry point for the package
// This allows programmatic usage of the package if needed

const {
  setupNotification,
  testSound,
  testDesktopNotification,
  listSounds,
  removeNotification,
  enableNotifications,
  disableNotifications,
  getStatus,
  getAvailableEvents
} = require('./lib/setup');

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
